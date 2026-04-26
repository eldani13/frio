import { describe, expect, it } from "vitest";
import { kilosPedidoLineItem } from "./ordenCompraLineKgPedido";

describe("ordenCompraLineKgPedido", () => {
  it("prioriza pesoKg positivo", () => {
    expect(kilosPedidoLineItem({ catalogoProductId: "a", cantidad: 3, pesoKg: 5, titleSnapshot: "x" })).toBe(5);
  });

  it("usa cantidad cuando pesoKg no aplica", () => {
    expect(kilosPedidoLineItem({ catalogoProductId: "a", cantidad: 3, pesoKg: 0, titleSnapshot: "x" })).toBe(3);
    expect(kilosPedidoLineItem({ catalogoProductId: "a", cantidad: 0, titleSnapshot: "x" })).toBe(0);
  });
});
