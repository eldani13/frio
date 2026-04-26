import { describe, expect, it } from "vitest";
import {
  kgPrimarioDesdeFraccionUnidadesSecundario,
  kgSobranteParaDevolucionMapa,
  parteFraccionariaUnidadesSecundario,
  sobranteKgDesdeCantidadYDesconto,
  sobranteKgTotalTrasEnCurso,
  unidadesSecundarioEnterasParaMapa,
} from "./sobranteKg";

describe("sobranteKg", () => {
  it("parteFraccionariaUnidadesSecundario calcula fraccion positiva", () => {
    expect(parteFraccionariaUnidadesSecundario(2.576)).toBeCloseTo(0.576, 6);
    expect(parteFraccionariaUnidadesSecundario(-1)).toBe(0);
  });

  it("kgPrimarioDesdeFraccionUnidadesSecundario aplica regla a->b", () => {
    // 2.5 uds, regla 1kg -> 2 uds => fraccion 0.5 equivale a 0.25kg
    expect(kgPrimarioDesdeFraccionUnidadesSecundario(2.5, 1, 2)).toBe(0.25);
  });

  it("unidadesSecundarioEnterasParaMapa trunca entero no negativo", () => {
    expect(unidadesSecundarioEnterasParaMapa(5.9)).toBe(5);
    expect(unidadesSecundarioEnterasParaMapa(undefined)).toBe(0);
  });

  it("sobranteKgDesdeCantidadYDesconto funciona solo para unidad peso", () => {
    expect(sobranteKgDesdeCantidadYDesconto("peso", 10.5, 10.8)).toBe(0.8);
    expect(sobranteKgDesdeCantidadYDesconto("cantidad", 10.5, 10.8)).toBe(0);
  });

  it("sobranteKgTotalTrasEnCurso suma fraccion kg + fraccion por unidades", () => {
    const total = sobranteKgTotalTrasEnCurso("peso", 10.5, 10.8, 2.5, 1, 2);
    expect(total).toBe(1.05);
  });

  it("kgSobranteParaDevolucionMapa valida unidad y redondea", () => {
    expect(kgSobranteParaDevolucionMapa({ sobranteKg: 1.23456, unidadPrimarioVisualizacion: "peso" })).toBe(1.2346);
    expect(kgSobranteParaDevolucionMapa({ sobranteKg: 1.2, unidadPrimarioVisualizacion: "cantidad" })).toBe(0);
  });
});
