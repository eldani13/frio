import { describe, expect, it } from "vitest";
import { compareSolicitudCompraByCodigoDesc } from "./solicitudCompraSort";

describe("solicitudCompraSort", () => {
  it("ordena por numericId desc y desempata por createdAt desc", () => {
    const arr = [
      { numericId: 10, createdAt: 1000 },
      { numericId: 10, createdAt: 2000 },
      { numericId: 11, createdAt: 0 },
    ];

    arr.sort(compareSolicitudCompraByCodigoDesc);

    expect(arr[0]?.numericId).toBe(11);
    expect(arr[1]?.createdAt).toBe(2000);
  });
});
