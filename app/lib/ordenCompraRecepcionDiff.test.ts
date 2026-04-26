import { describe, expect, it } from "vitest";
import type { OrdenCompra } from "@/app/types/ordenCompra";
import { buildLineasRecepcionDiff } from "./ordenCompraRecepcionDiff";

function orden(overrides: Partial<OrdenCompra> = {}): OrdenCompra {
  return {
    id: "oc1",
    codeCuenta: "C1",
    numericId: 1,
    numero: "OC-0001",
    proveedorId: "p1",
    proveedorNombre: "Prov",
    fecha: "2026-01-01",
    estado: "En curso",
    createdAt: 1,
    lineItems: [
      { catalogoProductId: "a", cantidad: 2, titleSnapshot: "A" },
      { catalogoProductId: "a", cantidad: 3, titleSnapshot: "A2" },
      { catalogoProductId: "b", cantidad: 1, pesoKg: 5, titleSnapshot: "B" },
    ],
    ...overrides,
  };
}

describe("ordenCompraRecepcionDiff", () => {
  it("retorna vacío cuando no hay recepción", () => {
    const out = buildLineasRecepcionDiff(orden({ recepcion: undefined }));
    expect(out.tieneRecepcion).toBe(false);
    expect(out.lineasDiff).toHaveLength(0);
  });

  it("compara líneas por índice cuando hay ids repetidos y maneja kg", () => {
    const out = buildLineasRecepcionDiff(
      orden({
        recepcion: {
          lineas: [
            { catalogoProductId: "a", cantidadRecibida: 2 },
            { catalogoProductId: "a", cantidadRecibida: 1 },
            { catalogoProductId: "b", cantidadRecibida: 0, pesoKgRecibido: 5 },
          ],
          sinDiferencias: false,
          cerradaAt: 1,
          cerradaPorUid: "u1",
          lineasAdicionales: [{ titleSnapshot: "Extra", pesoKgRecibido: 2 }],
        },
      }),
    );

    expect(out.tieneRecepcion).toBe(true);
    expect(out.lineasDiff).toHaveLength(3);
    expect(out.lineasDiff[0]?.ok).toBe(true);
    expect(out.lineasDiff[1]?.ok).toBe(false);
    expect(out.lineasDiff[2]?.pedidoLabel).toContain("kg");
    expect(out.adicionales[0]).toContain("adicional");
  });
});
