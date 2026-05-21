import { describe, expect, it } from "vitest";
import type { Catalogo } from "@/app/types/catalogo";
import {
  REGLA_PRIMARIO_BASE_GRAMOS,
  catalogosPrimarios,
  catalogosSecundariosDePrimario,
  esCatalogoSecundario,
  estimadoSecundarioAplicarPerdidaPct,
  formatEstimadoUnidadesSecundario,
  gramosPorUnidadDesdeReglaConversion,
  maxUnidadesSecundarioDesdeStock,
  mermaPctDesdeCatalogoSecundario,
  reglaConversionDesdeCatalogoSecundario,
  unidadVisualizacionDe,
  unidadesSecundarioPorRegla,
} from "./catalogoProcesamiento";

function cat(overrides: Partial<Catalogo> = {}): Catalogo {
  return {
    numericId: 1,
    code: "0001",
    createdAt: 1,
    title: "Prod",
    description: "d",
    provider: "p",
    category: "c",
    productType: "Primario",
    status: "ok",
    codeCuenta: "C1",
    ...overrides,
  };
}

describe("catalogoProcesamiento", () => {
  it("detecta secundarios y unidad visualizacion", () => {
    expect(esCatalogoSecundario(cat({ productType: "Secundario" }))).toBe(true);
    expect(unidadVisualizacionDe(cat({ unidadVisualizacion: "peso" }))).toBe("peso");
    expect(unidadVisualizacionDe(cat({ weightUnit: "kg" }))).toBe("peso");
    expect(unidadVisualizacionDe(cat({ weightUnit: "un" }))).toBe("cantidad");
  });

  it("lee regla de conversion y gramos por unidad", () => {
    const s = cat({
      productType: "Secundario",
      reglaConversionCantidadPrimario: 2,
      reglaConversionUnidadesSecundario: 8,
    });
    expect(reglaConversionDesdeCatalogoSecundario(s)).toEqual({
      cantidadPrimario: 2,
      unidadesSecundario: 8,
    });
    expect(gramosPorUnidadDesdeReglaConversion(2, 8)).toBe((REGLA_PRIMARIO_BASE_GRAMOS * 2) / 8);
    expect(gramosPorUnidadDesdeReglaConversion(0, 8)).toBeNull();
  });

  it("calcula merma y conversiones derivadas", () => {
    expect(mermaPctDesdeCatalogoSecundario(cat({ mermaPct: 5 }))).toBe(5);
    expect(mermaPctDesdeCatalogoSecundario(cat({ mermaPct: -1 }))).toBeNull();

    expect(unidadesSecundarioPorRegla(10, 2, 8)).toBe(40);
    expect(unidadesSecundarioPorRegla(0, 2, 8)).toBeNull();
    expect(maxUnidadesSecundarioDesdeStock(10, 3, 2)).toBe(6);
  });

  it("filtra primarios y secundarios por primario", () => {
    const p1 = cat({ id: "p1", productType: "Primario" });
    const s1 = cat({ id: "s1", productType: "Secundario", includedPrimarioCatalogoId: "p1" });
    const s2 = cat({ id: "s2", productType: "Secundario", includedPrimarioCatalogoId: "x" });

    expect(catalogosPrimarios([p1, s1, s2]).map((x) => x.id)).toEqual(["p1"]);
    expect(catalogosSecundariosDePrimario([p1, s1, s2], "p1").map((x) => x.id)).toEqual(["s1"]);
  });

  it("aplica perdida y formatea estimados", () => {
    expect(estimadoSecundarioAplicarPerdidaPct(100, 10)).toBe(90);
    expect(estimadoSecundarioAplicarPerdidaPct(100, -5)).toBe(100);
    expect(estimadoSecundarioAplicarPerdidaPct(null, 10)).toBeNull();

    expect(formatEstimadoUnidadesSecundario(5)).toBe("5");
    expect(formatEstimadoUnidadesSecundario(5.25)).toContain("5");
    expect(formatEstimadoUnidadesSecundario(Number.NaN)).toBe("—");
  });
});
