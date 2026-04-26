import { describe, expect, it } from "vitest";
import { ordenCompraIngresoLineKey } from "./ordenCompraIngresoLineKey";

describe("ordenCompraIngresoLineKey", () => {
  it("genera clave estable por indice", () => {
    expect(ordenCompraIngresoLineKey(0)).toBe("line:0");
    expect(ordenCompraIngresoLineKey(5)).toBe("line:5");
  });
});
