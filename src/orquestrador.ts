/**
 * Orquestrador fino + sub-agentes por domínio: o agente principal não faz o
 * trabalho pesado, delega pra um sub-agente especializado e recebe de volta
 * um RESUMO em texto — nunca o payload bruto (um PDF inteiro, uma resposta
 * de ERP) de volta no contexto do modelo principal.
 *
 * Padrão extraído do Bia2 (Bioete): delega pra agente-orcamento,
 * agente-tarefas, agente-pdvx etc., cada delegação some no contexto depois
 * de resumida. Motivo explícito no código original: cada 100 KB de PDF
 * custam ~35 mil tokens se entrarem crus no contexto.
 */

export interface SubAgente<TEntrada = unknown> {
  nome: string;
  /** Executa o trabalho pesado e devolve só o resumo relevante pro orquestrador. */
  executar(entrada: TEntrada): Promise<string>;
}

export class Orquestrador {
  private readonly subAgentes = new Map<string, SubAgente<any>>();

  registrar(subAgente: SubAgente<any>): void {
    this.subAgentes.set(subAgente.nome, subAgente);
  }

  /**
   * Delega pro sub-agente nomeado. Lança erro se o nome não existe —
   * trate isso no chamador como "o modelo tentou delegar pra algo que não
   * existe", não como falha silenciosa.
   */
  async delegar<TEntrada = unknown>(nomeSubAgente: string, entrada: TEntrada): Promise<string> {
    const subAgente = this.subAgentes.get(nomeSubAgente);
    if (!subAgente) {
      throw new Error(`Sub-agente desconhecido: ${nomeSubAgente}`);
    }
    return subAgente.executar(entrada);
  }

  listarDisponiveis(): string[] {
    return [...this.subAgentes.keys()];
  }
}

/** Sub-agente de exemplo — troque pela integração real (ERP, orçamento, etc). */
export class SubAgenteEco implements SubAgente<string> {
  readonly nome = "eco";
  async executar(entrada: string): Promise<string> {
    return `(exemplo) recebido: ${entrada}`;
  }
}
