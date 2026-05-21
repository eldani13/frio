import { describe, expect, it } from "vitest";
import {
  coerceKgFromUnknown,
  coercePiezasFromUnknown,
  kgFromFirestoreSlotRecord,
  slotTracePartialFromRecord,
} from "./coerceBodegaKg";

describe("coerceBodegaKg", () => {
  it("coerceKgFromUnknown parsea formatos comunes", () => {
    expect(coerceKgFromUnknown("1.234,56")).toBe(1234.56);
    expect(coerceKgFromUnknown("1,234.56")).toBe(1234.56);
    expect(coerceKgFromUnknown("15,5")).toBe(15.5);
    expect(coerceKgFromUnknown(10)).toBe(10);
  });

  it("coerceKgFromUnknown retorna undefined en invalidos", () => {
    expect(coerceKgFromUnknown(undefined)).toBeUndefined();
    expect(coerceKgFromUnknown(" ")).toBeUndefined();
    expect(coerceKgFromUnknown("abc")).toBeUndefined();
  });

  it("coercePiezasFromUnknown parsea y trunca no negativos", () => {
    expect(coercePiezasFromUnknown("12")).toBe(12);
    expect(coercePiezasFromUnknown(12.8)).toBe(12);
    expect(coercePiezasFromUnknown("1,200")).toBe(1200);
    expect(coercePiezasFromUnknown(-1)).toBeUndefined();
  });

  it("kgFromFirestoreSlotRecord usa quantityKg directo", () => {
    expect(kgFromFirestoreSlotRecord({ quantityKg: "10,25" })).toBe(10.25);
  });

  it("kgFromFirestoreSlotRecord deriva desde pesoUnitario x piezas", () => {
    expect(kgFromFirestoreSlotRecord({ pesoUnitario: "2.5", piezas: "4" })).toBe(10);
  });

  it("slotTracePartialFromRecord toma trazas y normaliza llaveunica", () => {
    const out = slotTracePartialFromRecord({ rd: "RD1", lote: "L1", llaveunica: "LU-1" });
    expect(out.rd).toBe("RD1");
    expect(out.lote).toBe("L1");
    expect(out.llaveUnica).toBe("LU-1");
  });
});
