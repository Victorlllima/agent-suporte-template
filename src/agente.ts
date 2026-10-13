/**
 * Esqueleto do loop principal do agente de suporte/assistente operacional.
 * Liga anti-loop, debounce, controle de IA, memória, orquestrador de
 * sub-agentes e a camada administrativa do core/deste template.
 *
 * TODO antes de usar em produção:
 *  - Preencher PROMPT_FIXO com a persona real.
 *  - Registrar os sub-agentes reais no Orquestrador (ERP, orçamento, etc).
 *  - Implementar o adaptador de canal (WhatsApp).
 *  - Trocar MemoriaEmProcesso por um SessionStore persistente.
 */

import Anthropic from "@anthropic-ai/sdk";
import {
  AntiLoop,
  DebounceConversa,
  IaControl,
  MemoriaEmProcesso,
  montarSystemCacheado,
} from "@genixtech/agent-core";
import { CamadaAdministrativa } from "./admin.js";
import { MemoriaEpisodica } from "./memoria-episodica.js";
import { Orquestrador, SubAgenteEco } from "./orquestrador.js";
import type { Solicitante } from "./tipos.js";

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

async function processarMensagem(solicitante: Solicitante, messageId: string, texto: string): Promise<string | null> {
  const decisao = antiLoop.avaliar(solicitante.telefone, messageId);
  if (!decisao.aceitar) return null;

  if (iaControl.estaSuspensa(solicitante.conversaId)) return null;

  const historico = await memoria.carregar({ tenantId: solicitante.tenantId, conversaId: solicitante.conversaId });
  const system = montarSystemCacheado({
    fixo: PROMPT_FIXO,
    variavel: `Sub-agentes disponíveis: ${orquestrador.listarDisponiveis().join(", ")}.`,
  });

  const resposta = await anthropic.messages.create({
    model: "claude-opus-5-5",
    max_tokens: 1024,
    system,
    messages: [...historico, { role: "user", content: texto }],
  });

  const textoResposta = resposta.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  await memoria.salvar(
    { tenantId: solicitante.tenantId, conversaId: solicitante.conversaId },
    [...historico, { role: "user", content: texto }, { role: "assistant", content: textoResposta }],
  );

  return textoResposta;
}

// TODO: substitua por um webhook real (Express/Fastify).
const debounce = new DebounceConversa(async (conversaId: string, mensagemJunta: string) => {
  console.log(`[agente] processar conversa ${conversaId}:`, mensagemJunta);
});

export { processarMensagem, debounce, admin, episodica, orquestrador };
