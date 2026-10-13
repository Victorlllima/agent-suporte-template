import { describe, expect, it } from "vitest";
import { MemoriaEpisodica } from "./memoria-episodica.js";

describe("MemoriaEpisodica", () => {
  it("gera ids estáveis e sequenciais por tipo de evento", () => {
    const mem = new MemoriaEpisodica();
    const e1 = mem.registrar({ tipo: "anexo_pdf", conteudo: "orçamento.pdf", recebidoEm: 1 });
    const e2 = mem.registrar({ tipo: "localizacao", conteudo: "-15.78,-47.93", recebidoEm: 2 });
    expect(e1.id).toBe("P-001");
    expect(e2.id).toBe("L-002");
  });

  it("acha uma entrada pelo id", () => {
    const mem = new MemoriaEpisodica();
    const e1 = mem.registrar({ tipo: "vcard", conteudo: "contato.vcf", recebidoEm: 1 });
    expect(mem.buscarPorId(e1.id)?.conteudo).toBe("contato.vcf");
    expect(mem.buscarPorId("X-999")).toBeUndefined();
  });

  it("recentes() devolve só o limite pedido, na ordem de chegada", () => {
    const mem = new MemoriaEpisodica();
    for (let i = 0; i < 5; i++) {
      mem.registrar({ tipo: "vcard", conteudo: `c${i}`, recebidoEm: i });
    }
    const recentes = mem.recentes(2);
    expect(recentes.map((e) => e.conteudo)).toEqual(["c3", "c4"]);
  });
});
