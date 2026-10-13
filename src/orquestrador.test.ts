import { describe, expect, it } from "vitest";
import { Orquestrador, type SubAgente } from "./orquestrador.js";

describe("Orquestrador", () => {
  it("delega pro sub-agente registrado e devolve o resumo dele", async () => {
    const orq = new Orquestrador();
    const subAgente: SubAgente<{ valor: number }> = {
      nome: "calculadora",
      async executar(entrada) {
        return `resultado: ${entrada.valor * 2}`;
      },
    };
    orq.registrar(subAgente);
    const resumo = await orq.delegar("calculadora", { valor: 21 });
    expect(resumo).toBe("resultado: 42");
  });

  it("lança erro ao delegar pra um sub-agente que não existe", async () => {
    const orq = new Orquestrador();
    await expect(orq.delegar("inexistente", {})).rejects.toThrow("Sub-agente desconhecido");
  });

  it("lista os sub-agentes disponíveis", () => {
    const orq = new Orquestrador();
    orq.registrar({ nome: "a", executar: async () => "" });
    orq.registrar({ nome: "b", executar: async () => "" });
    expect(orq.listarDisponiveis()).toEqual(["a", "b"]);
  });
});
