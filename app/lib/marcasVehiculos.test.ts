import { describe, expect, it } from "vitest";
import { marcaEstaEnLista, MARCAS_VEHICULOS, MARCA_VEHICULO_OTRA } from "./marcasVehiculos";

describe("marcasVehiculos", () => {
  it("tiene lista y constante de opcion otra", () => {
    expect(MARCAS_VEHICULOS.length).toBeGreaterThan(20);
    expect(MARCA_VEHICULO_OTRA).toBe("__otra__");
  });

  it("valida marca ignorando mayusculas", () => {
    expect(marcaEstaEnLista("toyota")).toBe(true);
    expect(marcaEstaEnLista("  TOYOTA ")).toBe(true);
    expect(marcaEstaEnLista("MarcaInexistente")).toBe(false);
  });
});
