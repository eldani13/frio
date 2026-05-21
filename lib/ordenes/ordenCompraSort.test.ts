import { describe, expect, it } from "vitest";
import {
  compareOrdenCompraByCodigoDesc,
  compareOrdenCompraNewestFirst,
  ordenCompraCreatedAtMs,
} from "./ordenCompraSort";

describe("ordenCompraSort", () => {
  it("ordenCompraCreatedAtMs soporta number y Timestamp-like", () => {
    expect(ordenCompraCreatedAtMs(1000)).toBe(1000);
    expect(ordenCompraCreatedAtMs({ toMillis: () => 2000 })).toBe(2000);
  });

  it("compareOrdenCompraNewestFirst ordena por createdAt desc", () => {
    const arr = [{ createdAt: 1000, numericId: 1 }, { createdAt: 2000, numericId: 2 }];
    arr.sort(compareOrdenCompraNewestFirst);
    expect(arr[0]?.createdAt).toBe(2000);
  });

  it("compareOrdenCompraByCodigoDesc prioriza numericId desc", () => {
    const arr = [{ numericId: 3, createdAt: 1000 }, { numericId: 5, createdAt: 0 }];
    arr.sort(compareOrdenCompraByCodigoDesc);
    expect(arr[0]?.numericId).toBe(5);
  });
});
