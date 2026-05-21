import { describe, expect, it, vi } from "vitest";
import {
  isFridemInventoryAllowedForCode,
  normalizeCodeCuenta,
} from "./fridemAccountAccess";

describe("fridemAccountAccess", () => {
  it("normaliza código sin espacios y en mayúsculas", () => {
    expect(normalizeCodeCuenta(" mit00 ")).toBe("MIT00");
  });

  it("permite MIT00 por defecto", () => {
    expect(isFridemInventoryAllowedForCode("MIT00")).toBe(true);
    expect(isFridemInventoryAllowedForCode("mit00")).toBe(true);
  });

  it("rechaza otras cuentas", () => {
    expect(isFridemInventoryAllowedForCode("OTRA1")).toBe(false);
    expect(isFridemInventoryAllowedForCode("")).toBe(false);
    expect(isFridemInventoryAllowedForCode(undefined)).toBe(false);
  });

  it("respeta NEXT_PUBLIC_FRIDEM_INVENTORY_CODE_CUENTAS", () => {
    vi.stubEnv("NEXT_PUBLIC_FRIDEM_INVENTORY_CODE_CUENTAS", "ABC01,XYZ99");
    expect(isFridemInventoryAllowedForCode("ABC01")).toBe(true);
    expect(isFridemInventoryAllowedForCode("MIT00")).toBe(false);
  });
});
