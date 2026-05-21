import { describe, expect, it } from "vitest";
import type { Catalogo } from "@/app/types/catalogo";
import { coerceNumberImport, formatoPrecioCatalogo, precioCatalogoNumerico } from "./catalogoPrecio";

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

describe("catalogoPrecio", () => {
  it("prioriza price, luego costPerItem, luego precio legacy", () => {
    expect(precioCatalogoNumerico(cat({ price: 12 }))).toBe(12);
    expect(precioCatalogoNumerico(cat({ price: undefined, costPerItem: 9 }))).toBe(9);
    expect(precioCatalogoNumerico({ ...cat({}), precio: "8,5" } as Catalogo & { precio: unknown })).toBe(8.5);
  });

  it("formatea precio y parsea import", () => {
    expect(formatoPrecioCatalogo(cat({ price: 10 }))).toBe("$10");
    expect(formatoPrecioCatalogo(cat({}))).toBe("—");
    expect(coerceNumberImport("10,5")).toBe(10.5);
    expect(coerceNumberImport("abc")).toBeUndefined();
  });
});
