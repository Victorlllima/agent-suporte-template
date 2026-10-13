/**
 * Camada administrativa: reaproveita `ConfirmacaoDupla` do core pra qualquer
 * ação de escrita que um admin peça ao agente (cancelar, atualizar cadastro,
 * disparar algo), e restringe quem pode pedir — generalização do agente
 * "Genix" (braço administrativo da Sofia, GenixMed).
 */

import { ConfirmacaoDupla } from "@genixtech/agent-core";
import type { Solicitante } from "./tipos.js";

export class CamadaAdministrativa<TPayload = unknown> {
  private readonly confirmacao = new ConfirmacaoDupla<TPayload>();

  /** Só quem está marcado como admin pode propor ações administrativas. */
  propor(solicitante: Solicitante, tipo: string, payload: TPayload): { ok: true } | { ok: false; motivo: string } {
    if (!solicitante.ehAdmin) {
      return { ok: false, motivo: "não autorizado" };
    }
    this.confirmacao.propor(solicitante.telefone, tipo, payload);
    return { ok: true };
  }

  confirmar(solicitante: Solicitante, tipoEsperado?: string) {
    if (!solicitante.ehAdmin) return null;
    return this.confirmacao.confirmar(solicitante.telefone, tipoEsperado);
  }

  cancelar(solicitante: Solicitante): void {
    this.confirmacao.cancelar(solicitante.telefone);
  }
}
