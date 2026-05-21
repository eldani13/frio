import { describe, expect, it } from "vitest";
import type { Slot } from "@/app/interfaces/bodega";
import {
  candidatosSlotsSalidaVenta,
  planSalidaVentaDesdeMapa,
  slotCubreLineaVenta,
  slotVinculadoOrdenVenta,
  type VentaLineItemLike,
} from "./ventaSalidaBodegaMatch";

function slot(overrides: Partial<Slot> = {}): Slot {
  return {
    position: 1,
    autoId: "BOX-1",
    name: "Pollo → Lonchas",
    temperature: 2,
    client: "cli1",
    quantityKg: 10,
    catalogoProductId: "p1",
    ...overrides,
  };
}

const linePeso: VentaLineItemLike = { titleSnapshot: "Pollo", cantidad: 3, unidadVisualizacion: "peso" };

describe("ventaSalidaBodegaMatch", () => {
  it("vinculación y cobertura de línea", () => {
    const s = slot({ ordenVentaId: "v1", ordenVentaClienteId: "cli1" });
    expect(slotVinculadoOrdenVenta(s, "v1", "cli1")).toBe(true);
    expect(slotCubreLineaVenta(s, linePeso, "cli1")).toBe(true);
    expect(slotCubreLineaVenta(slot({ client: "otro" }), linePeso, "cli1")).toBe(false);
  });

  it("planifica salida en modo peso y descuenta slot", () => {
    const out = planSalidaVentaDesdeMapa([slot({ quantityKg: 5 })], {
      clientId: "cli1",
      ventaId: "v1",
      lineItems: [linePeso],
    });
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.movimientos[0]?.kgSalida).toBe(3);
      expect(out.slotsTrasDescuento[0]?.quantityKg).toBe(2);
    }
  });

  it("falla si falta stock suficiente", () => {
    const out = planSalidaVentaDesdeMapa([slot({ quantityKg: 1 })], {
      clientId: "cli1",
      ventaId: "v1",
      lineItems: [linePeso],
    });
    expect(out.ok).toBe(false);
  });

  it("candidatos devuelve slots del plan", () => {
    const cands = candidatosSlotsSalidaVenta([slot({ quantityKg: 5 })], {
      clientId: "cli1",
      ventaId: "v1",
      lineItems: [linePeso],
    });
    expect(cands.map((x) => x.position)).toEqual([1]);
  });

  it("en modo cantidad usa piezas para convertir a kg", () => {
    const out = planSalidaVentaDesdeMapa([slot({ quantityKg: 10, piezas: 5 })], {
      clientId: "cli1",
      ventaId: "v1",
      lineItems: [{ titleSnapshot: "Pollo", cantidad: 2, unidadVisualizacion: "cantidad" }],
    });
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.movimientos[0]?.kgSalida).toBe(4);
    }
  });

  it("falla cuando faltan ids de tarea", () => {
    const out = planSalidaVentaDesdeMapa([slot()], { lineItems: [linePeso] });
    expect(out.ok).toBe(false);
  });

  it("falla cuando no hay coincidencias de producto/cuenta", () => {
    const out = planSalidaVentaDesdeMapa([slot({ client: "otra" })], {
      clientId: "cli1",
      ventaId: "v1",
      lineItems: [{ titleSnapshot: "NoExiste", cantidad: 1, unidadVisualizacion: "peso" }],
    });
    expect(out.ok).toBe(false);
  });

  it("candidatos devuelve vacío si plan no es viable", () => {
    const cands = candidatosSlotsSalidaVenta([slot({ quantityKg: 1 })], {
      clientId: "cli1",
      ventaId: "v1",
      lineItems: [{ titleSnapshot: "Pollo", cantidad: 999, unidadVisualizacion: "peso" }],
    });
    expect(cands).toHaveLength(0);
  });
});
