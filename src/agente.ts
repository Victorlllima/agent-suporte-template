/**
 * Esqueleto do loop principal do agente de suporte/assistente operacional.
 * Liga anti-loop, debounce, controle de IA, memória, orquestrador de
 * sub-agentes, integrações via Composio e a camada administrativa do
 * core/deste template.
 *
 * Arquitetura: este processo é ÚNICO e atende TODOS os clientes — não é
 * "um Hermes por cliente". Isolamento entre clientes vem de `tenantId`
 * carregado em toda chamada de memória/integração, nunca de processos ou
 * VPSs separadas. Ver @genixtech/agent-core: memory.ts e composio.ts
 * compartilham esse mesmo contrato.
 *
 * TODO antes de usar em produção:
 *  - Preencher PROMPT_FIXO com a persona real.
 *  - Registrar os sub-agentes reais no Orquestrador (ERP, orçamento, etc).
 *  - Implementar o adaptador de canal (WhatsApp).
 *  - Trocar MemoriaEmProcesso / TenantToolkitsEmProcesso / AuthConfigsEmProcesso
 *    por implementações persistentes (Postgres) — nenhuma delas sobrevive a um
 *    restart do processo como está.
 *  - FERRAMENTAS_DISPONIVEIS abaixo é ilustrativo (só Calendar). Em produção,
 *    busque o schema de cada tool habilitada via referência de tools da
 *    Composio em vez de declarar à mão.
 *  - O loop de tool_use abaixo só dá UMA rodada (chama a ferramenta, devolve
 *    o resultado, pede resposta final). Um agente real pode precisar de mais
 *    de uma chamada de ferramenta por turno.
 */

import Anthropic from "@anthropic-ai/sdk";
import {
  AntiLoop,
  AuthConfigsEmProcesso,
  ComposioClient,
  DebounceConversa,
  IaControl,
  MemoriaEmProcesso,
  TenantToolkitsEmProcesso,
  montarSystemCacheado,
} from "@genixtech/agent-core";
import { CamadaAdministrativa } from "./admin.js";
import { MemoriaEpisodica } from "./memoria-episodica.js";
import { Orquestrador, SubAgenteEco } from "./orquestrador.js";
import type { Solicitante } from "./tipos.js";

// Schema de ferramenta por toolkit — ilustrativo. Produção: derive isso da
// referência de tools da Composio (um schema por toolkit habilitado), não
// mantenha à mão por toolkit.
const FERRAMENTAS_DISPONIVEIS: Record<string, Anthropic.Tool> = {
  googlecalendar: {
    name: "GOOGLECALENDAR_EVENTS_LIST_ALL_CALENDARS",
    description: "Lista os compromissos do usuário num intervalo de datas.",
    input_schema: {
      type: "object",
      properties: {
        time_min: { type: "string", description: "Início do intervalo, ISO 8601 (ex: 2026-10-15T00:00:00Z)" },
        time_max: { type: "string", description: "Fim do intervalo, ISO 8601" },
      },
      required: ["time_min", "time_max"],
    },
  },
};

// TODO: mova pra variável de ambiente / arquivo de config por cliente.
const PROMPT_FIXO = `Você é um assistente operacional interno. Delegue tarefas específicas
pros sub-agentes disponíveis em vez de tentar resolver tudo sozinho. TODO: substitua pela
persona e pelas regras reais.`;

const anthropic = new Anthropic();
const antiLoop = new AntiLoop();
const iaControl = new IaControl();
const memoria = new MemoriaEmProcesso();
const episodica = new MemoriaEpisodica();
const admin = new CamadaAdministrativa();
const orquestrador = new Orquestrador();
orquestrador.registrar(new SubAgenteEco());
// TODO: orquestrador.registrar(new SubAgenteOrcamento(...)); etc.

// Opcional: sem COMPOSIO_API_KEY, o template roda normalmente só sem
// ferramentas externas — não trava o `npm run dev` de quem ainda não
// configurou isso.
const composio = process.env.COMPOSIO_API_KEY ? new ComposioClient(process.env.COMPOSIO_API_KEY, new AuthConfigsEmProcesso()) : null;
const toolkitsHabilitados = new TenantToolkitsEmProcesso();

async function processarMensagem(solicitante: Solicitante, messageId: string, texto: string): Promise<string | null> {
  const decisao = antiLoop.avaliar(solicitante.telefone, messageId);
  if (!decisao.aceitar) return null;

  if (iaControl.estaSuspensa(solicitante.conversaId)) return null;

  const historico = await memoria.carregar({ tenantId: solicitante.tenantId, conversaId: solicitante.conversaId });
  const system = montarSystemCacheado({
    fixo: PROMPT_FIXO,
    variavel: `Sub-agentes disponíveis: ${orquestrador.listarDisponiveis().join(", ")}.`,
  });

  // Nunca ofereça ao modelo uma ferramenta que ESTE tenant não habilitou no
  // onboarding — mesmo que outro tenant tenha habilitado o mesmo toolkit.
  const toolkitsDoTenant = composio ? await toolkitsHabilitados.listarHabilitados(solicitante.tenantId) : [];
  const tools = toolkitsDoTenant.map((slug) => FERRAMENTAS_DISPONIVEIS[slug]).filter((t): t is Anthropic.Tool => !!t);

  const mensagens: Anthropic.MessageParam[] = [...historico, { role: "user", content: texto }];

  let resposta = await anthropic.messages.create({
    model: "claude-opus-5-5",
    max_tokens: 1024,
    system,
    messages: mensagens,
    ...(tools.length > 0 ? { tools } : {}),
  });

  const chamadaFerramenta = resposta.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
  if (chamadaFerramenta && composio) {
    mensagens.push({ role: "assistant", content: resposta.content });

    const resultado = await composio.executarFerramenta(
      solicitante.tenantId,
      chamadaFerramenta.name,
      chamadaFerramenta.input as Record<string, unknown>,
    );

    mensagens.push({
      role: "user",
      content: [
        {
          type: "tool_result",
          tool_use_id: chamadaFerramenta.id,
          content: JSON.stringify(resultado.successful ? resultado.data : { erro: resultado.error }),
          is_error: !resultado.successful,
        },
      ],
    });

    resposta = await anthropic.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 1024,
      system,
      messages: mensagens,
      ...(tools.length > 0 ? { tools } : {}),
    });
  }

  const textoResposta = resposta.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  await memoria.salvar(
    { tenantId: solicitante.tenantId, conversaId: solicitante.conversaId },
    [...mensagens, { role: "assistant", content: textoResposta }],
  );

  return textoResposta;
}

// TODO: substitua por um webhook real (Express/Fastify).
const debounce = new DebounceConversa(async (conversaId: string, mensagemJunta: string) => {
  console.log(`[agente] processar conversa ${conversaId}:`, mensagemJunta);
});

export { processarMensagem, debounce, admin, episodica, orquestrador };
