import { describe, expect, it } from "vitest";
import { CamadaAdministrativa } from "./admin.js";
import type { Solicitante } from "./tipos.js";

const admin: Solicitante = { tenantId: "t1", conversaId: "c1", telefone: "555", ehAdmin: true };
const naoAdmin: Solicitante = { tenantId: "t1", conversaId: "c2", telefone: "666", ehAdmin: false };

describe("CamadaAdministrativa", () => {
  it("recusa propor ação de quem não é admin", () => {
    const camada = new CamadaAdministrativa();
    const resultado = camada.propor(naoAdmin, "cancelar", {});
    expect(resultado.ok).toBe(false);
  });

  it("admin propõe e confirma normalmente", () => {
    const camada = new CamadaAdministrativa<{ id: string }>();
    camada.propor(admin, "cancelar", { id: "x1" });
    const confirmado = camada.confirmar(admin, "cancelar");
    expect(confirmado?.payload.id).toBe("x1");
  });

  it("não-admin não consegue confirmar mesmo que a proposta exista", () => {
    const camada = new CamadaAdministrativa();
    camada.propor(admin, "cancelar", {});
    // simula alguém se passando por outro telefone sem ser admin
    const impostor: Solicitante = { ...naoAdmin, telefone: admin.telefone };
    expect(camada.confirmar(impostor, "cancelar")).toBeNull();
  });
});
