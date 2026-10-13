/**
 * Eventos não-conversacionais (PDF recebido, vCard, localização) viram
 * memória episódica — um registro do que aconteceu — e não um turno comum
 * de chat. Isso evita que o histórico de conversa fique poluído com "o
 * usuário mandou um arquivo" repetido, e permite referenciar o evento depois
 * sem reprocessar o conteúdo bruto.
 *
 * Padrão extraído do Bia2 (Bioete).
 */

import type { EventoRecebido } from "./tipos.js";

export interface EntradaEpisodica extends EventoRecebido {
  id: string; // ex: "T-001", "L-042" — numeração estável pra referência sem ambiguidade
}

export class MemoriaEpisodica {
  private readonly entradas: EntradaEpisodica[] = [];
  private contador = 0;

  /** Prefixo de id por tipo de evento — ajuste conforme o domínio. */
  private prefixo(tipo: EventoRecebido["tipo"]): string {
    switch (tipo) {
      case "anexo_pdf":
        return "P";
      case "vcard":
        return "V";
      case "localizacao":
        return "L";
      default:
        return "E";
    }
  }

  registrar(evento: EventoRecebido): EntradaEpisodica {
    this.contador += 1;
    const id = `${this.prefixo(evento.tipo)}-${String(this.contador).padStart(3, "0")}`;
    const entrada: EntradaEpisodica = { ...evento, id };
    this.entradas.push(entrada);
    return entrada;
  }

  buscarPorId(id: string): EntradaEpisodica | undefined {
    return this.entradas.find((e) => e.id === id);
  }

  recentes(limite = 10): EntradaEpisodica[] {
    return this.entradas.slice(-limite);
  }
}
