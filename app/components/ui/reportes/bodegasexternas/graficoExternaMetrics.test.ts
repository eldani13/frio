import { describe, expect, it } from "vitest";
import type { FridemInventoryRow } from "@/lib/fridem/fridemInventory";
import { graficoExternoVistaTieneDatos } from "./graficoExternaMetrics";

const fila = (kg: number, marca = "M"): FridemInventoryRow => ({
  id: "1",
  lote: "L1",
  descripcion: "Prod",
  marca,
  embalaje: "",
  caducidad: "",
  fechaIngreso: "",
  pesoUnitario: null,
  piezas: null,
  kilos: kg,
  kilosActual: kg,
  estado: "Disponible",
});

describe("graficoExternaMetrics", () => {
  it("sin kg no hay gráfico aunque haya filas", () => {
    expect(graficoExternoVistaTieneDatos([fila(0)])).toBe(false);
  });

  it("con kg y marca hay gráfico", () => {
    expect(graficoExternoVistaTieneDatos([fila(5)])).toBe(true);
  });
});
