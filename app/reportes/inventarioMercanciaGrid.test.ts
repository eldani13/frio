import { describe, expect, it } from "vitest";
import { etiquetaKgTarjetaInventario, moduloInventarioPermiteEntrada } from "./inventarioMercanciaGrid";

describe("inventarioMercanciaGrid", () => {
  it("muestra No aplica cuando no hay kg", () => {
    expect(etiquetaKgTarjetaInventario(false, 0, false)).toBe("No aplica");
  });

  it("no permite entrar sin datos", () => {
    expect(
      moduloInventarioPermiteEntrada({
        id: "PROVEEDOR",
        label: "Proveedor",
        kg: 0,
        loading: false,
        aplica: false,
      }),
    ).toBe(false);
  });

  it("permite entrar con kg", () => {
    expect(
      moduloInventarioPermiteEntrada({
        id: "BODEGA_EXT",
        label: "Bodega externa",
        kg: 100,
        loading: false,
        aplica: true,
      }),
    ).toBe(true);
  });
});
