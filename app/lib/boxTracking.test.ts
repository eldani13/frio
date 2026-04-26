import { describe, expect, it } from "vitest";
import type { BodegaOrder, Box, DispatchedHistoryEntry, HistoryIngresoSnapshot, Slot } from "@/app/interfaces/bodega";
import { buildBoxTrackingTimeline, collectKnownBoxIds, resolveCurrentBoxLocation } from "./boxTracking";

function box(overrides: Partial<Box> = {}): Box {
  return { position: 1, autoId: "A1", name: "Caja", temperature: 2, client: "c1", ...overrides };
}

function slot(overrides: Partial<Slot> = {}): Slot {
  return { position: 1, autoId: "A1", name: "Caja", temperature: 2, client: "c1", ...overrides };
}

function order(overrides: Partial<BodegaOrder> = {}): BodegaOrder {
  return {
    id: "o1",
    type: "a_bodega",
    sourcePosition: 1,
    sourceZone: "ingresos",
    targetPosition: 2,
    createdAt: "hoy",
    createdAtMs: 100,
    createdBy: "jefe",
    autoId: "A1",
    boxName: "Caja",
    ...overrides,
  };
}

describe("boxTracking", () => {
  it("resuelve ubicación actual por prioridad de zonas", () => {
    expect(resolveCurrentBoxLocation("A1", [box()], [], [], [])?.zone).toBe("ingresos");
    expect(resolveCurrentBoxLocation("A1", [], [box()], [], [])?.zone).toBe("salida");
    expect(resolveCurrentBoxLocation("A1", [], [], [box()], [])?.zone).toBe("despachado");
    expect(resolveCurrentBoxLocation("A1", [], [], [], [slot()])?.zone).toBe("bodega");
    expect(resolveCurrentBoxLocation("", [], [], [], [])).toBeNull();
  });

  it("arma timeline ordenado y ubicación actual", () => {
    const ingresos: HistoryIngresoSnapshot[] = [{ ...box({ historialAtMs: 10 }) }];
    const movimientos = [order({ id: "m1", createdAtMs: 20, completadoAtMs: 25 })];
    const salidas = [order({ id: "s1", type: "a_salida", sourceZone: "bodega", createdAtMs: 30 })];
    const desp: DispatchedHistoryEntry[] = [{ id: "d1", box: box(), atMs: 40, fromSalidaPosition: 1 }];

    const out = buildBoxTrackingTimeline("A1", {
      ingresos,
      movimientosBodega: movimientos,
      salidas,
      despachadosHistorial: desp,
      inboundBoxes: [],
      outboundBoxes: [box({ position: 3 })],
      dispatchedBoxes: [],
      slots: [],
    });

    expect(out.steps).toHaveLength(4);
    expect(out.steps[0]?.kind).toBe("ingreso");
    expect(out.steps[3]?.kind).toBe("despacho");
    expect(out.current?.zone).toBe("salida");
  });

  it("colecta ids conocidos sin duplicar", () => {
    const out = collectKnownBoxIds({
      ingresos: [box()],
      inboundBoxes: [box({ autoId: "A1" })],
      outboundBoxes: [box({ autoId: "B1" })],
      dispatchedBoxes: [],
      slots: [slot({ autoId: "C1" })],
      movimientosBodega: [order({ autoId: "D1" })],
      salidas: [order({ id: "s", autoId: "E1" })],
      despachadosHistorial: [{ id: "x", box: box({ autoId: "F1" }), atMs: 1, fromSalidaPosition: 1 }],
    });

    expect(out.map((x) => x.value)).toEqual(["A1", "B1", "C1", "D1", "E1", "F1"]);
  });
});
