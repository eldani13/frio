import { describe, expect, it } from "vitest";
import {
  desperdicioKgSugeridoDesdeMerma,
  desperdicioKgSugeridoDesdeMermaLoose,
  stringKgInicialDesperdicio,
  unidadPrimarioNormalizada,
} from "./desperdicioKgSugerido";

describe("desperdicioKgSugerido", () => {
  it("unidadPrimarioNormalizada normaliza y valida", () => {
    expect(unidadPrimarioNormalizada("peso")).toBe("peso");
    expect(unidadPrimarioNormalizada(" CANTIDAD ")).toBe("cantidad");
    expect(unidadPrimarioNormalizada("otro" as never)).toBeUndefined();
  });

  it("desperdicioKgSugeridoDesdeMerma calcula solo en unidad peso", () => {
    expect(
      desperdicioKgSugeridoDesdeMerma({
        cantidadPrimario: 100,
        unidadPrimarioVisualizacion: "peso",
        perdidaProcesamientoPct: 8,
      }),
    ).toBe(8);

    expect(
      desperdicioKgSugeridoDesdeMerma({
        cantidadPrimario: 100,
        unidadPrimarioVisualizacion: "cantidad",
        perdidaProcesamientoPct: 8,
      }),
    ).toBeNull();
  });

  it("desperdicioKgSugeridoDesdeMermaLoose soporta record genérico", () => {
    expect(
      desperdicioKgSugeridoDesdeMermaLoose({
        cantidadPrimario: "50",
        unidadPrimarioVisualizacion: "peso",
        perdidaProcesamientoPct: "10",
      }),
    ).toBe(5);
  });

  it("stringKgInicialDesperdicio devuelve 0 en nulos/invalidos", () => {
    expect(stringKgInicialDesperdicio(null)).toBe("0");
    expect(stringKgInicialDesperdicio(-1)).toBe("0");
    expect(stringKgInicialDesperdicio(2.5)).toBe("2.5");
  });
});
