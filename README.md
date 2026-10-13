# agent-suporte-template

Template de agente de suporte/assistente operacional interno via WhatsApp da GenixTech. Sobre
[`@genixtech/agent-core`](https://github.com/Victorlllima/agent-core-template), com os padrões
de orquestração extraídos do Bia2 (Bioete, Grupo MPF) e da camada administrativa da Sofia
(GenixMed).

## O que vem pronto

- **`orquestrador.ts`** — orquestrador fino + sub-agentes por domínio: o agente principal delega
  trabalho pesado (consultar ERP, montar orçamento) e recebe de volta só um RESUMO, nunca o
  payload bruto — controla o custo de contexto.
- **`memoria-episodica.ts`** — eventos não-conversacionais (PDF, vCard, localização) viram
  registros com id estável (`P-001`, `L-002`) em vez de poluir o histórico de chat.
- **`admin.ts`** — camada administrativa: qualquer ação de escrita que um admin peça passa por
  `propor`/`confirmar` (do core), e só quem está marcado `ehAdmin` pode propor.
- **`agente.ts`** — esqueleto do loop principal, já ligando anti-loop, debounce, controle de IA
  e memória do core.

## O que é TODO de propósito

Persona, sub-agentes reais (ERP, orçamento, tarefas), adaptador de canal WhatsApp e
`SessionStore` persistente — específico de cada cliente/projeto.

## Como começar um projeto novo a partir daqui

1. No GitHub, "Use this template" neste repo.
2. `npm install`
3. Preencha `PROMPT_FIXO` em `src/agente.ts`.
4. Registre os sub-agentes reais no `Orquestrador` (`orquestrador.registrar(...)`).
5. Implemente o adaptador de canal WhatsApp e troque `MemoriaEmProcesso` por persistência real.

## Desenvolvimento

```bash
npm install
npm test
npm run build
```
