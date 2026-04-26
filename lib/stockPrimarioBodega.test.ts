import { describe, expect, it } from "vitest";
import type { Slot } from "@/app/interfaces/bodega";
import type { Catalogo } from "@/app/types/catalogo";
import {
  slotCoincideConCatalogo,
  stockPrimarioDesdeSlotsBodega,
  stockPrimarioDesdeSlotsPreferirKgCuandoExisten,
  stockTeoricoUnidadesSecundarioDesdeSlots,
} from "./stockPrimarioBodega";

function cat(overrides: Partial<Catalogo> = {}): Catalogo {
  return {
    numericId: 1,
    code: "0001",
    createdAt: 1,
    title: "Pollo",
    description: "d",
    provider: "p",
    category: "c",
    productType: "Primario",
    status: "ok",
    codeCuenta: "C1",
    ...overrides,
  };
}

function slot(overrides: Partial<Slot> = {}): Slot {
  return {
    position: 1,
    autoId: "BOX-1",
    name: "Pollo",
    temperature: 2,
    client: "cli1",
    ...overrides,
  };
}

describe("stockPrimarioBodega", () => {
  it("coincide slot con catalogo por titulo", () => {
    expect(slotCoincideConCatalogo(slot(), cat())).toBe(true);
    expect(slotCoincideConCatalogo(slot({ name: "otro" }), cat())).toBe(false);
  });

  it("calcula stock en peso y cantidad", () => {
    const slots = [
      slot({ position: 1, quantityKg: 5 }),
      slot({ position: 2, quantityKg: 3, piezas: 10 }),
    ];
    expect(stockPrimarioDesdeSlotsBodega(slots, "cli1", cat(), "peso").total).toBe(8);
    expect(stockPrimarioDesdeSlotsBodega(slots, "cli1", cat(), "cantidad").total).toBe(10);
  });

  it("prefiere kg cuando existen", () => {
    const slots = [slot({ quantityKg: 7 })];
    const out = stockPrimarioDesdeSlotsPreferirKgCuandoExisten(slots, "cli1", cat({ unidadVisualizacion: "cantidad" }));
    expect(out.total).toBe(7);
    expect(out.unidadUsada).toBe("peso");
  });

  it("estima secundario desde regla y stock primario", () => {
    const prim = cat({ id: "p1", title: "Pollo" });
    const sec = cat({
      id: "s1",
      title: "Lonchas",
      productType: "Secundario",
      includedPrimarioCatalogoId: "p1",
      reglaConversionCantidadPrimario: 1,
      reglaConversionUnidadesSecundario: 2,
      mermaPct: 0,
    });
    const slots = [slot({ name: "Pollo", quantityKg: 10 })];
    expect(stockTeoricoUnidadesSecundarioDesdeSlots(slots, "cli1", sec, prim)).toBe(20);
  });
});
