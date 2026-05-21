import { describe, expect, it } from "vitest";
import type { Slot } from "@/app/interfaces/bodega";
import {
  buildIngresoRecordByAutoId,
  filasInventarioInternoFromSlots,
  TEMP_ESTABLE_MAX_C,
  totalKgInternoDesdeSlots,
} from "./bodegaInternalInventoryRows";

function slot(overrides: Partial<Slot> = {}): Slot {
  return {
    position: 1,
    autoId: "BOX-1",
    name: "Pollo",
    temperature: 2,
    client: "cli1",
    ...overrides,
  };
}

describe("bodegaInternalInventoryRows", () => {
  it("construye mapa por autoId dejando ultimo registro", () => {
    const m = buildIngresoRecordByAutoId([
      { autoId: "A", rd: "1" },
      { autoId: "A", rd: "2" },
    ]);
    expect(m.get("A")?.rd).toBe("2");
  });

  it("mapea filas con categoria termica y kg", () => {
    const rows = filasInventarioInternoFromSlots([
      slot({ quantityKg: 5, temperature: TEMP_ESTABLE_MAX_C + 1 }),
      slot({ autoId: "", position: 2 }),
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.esAlerta).toBe(true);
    expect(rows[0]?.cantidadKg).toBe(5);
  });

  it("usa historial por autoId para completar trazas y kilos", () => {
    const byAuto = buildIngresoRecordByAutoId([
      { autoId: "BOX-9", rd: "RD-1", quantityKg: 8 },
    ]);
    const rows = filasInventarioInternoFromSlots(
      [slot({ autoId: "BOX-9", rd: undefined })],
      { ingresoRecordsByAutoId: byAuto },
    );
    expect(rows[0]?.rd).toBe("RD-1");
    expect(rows[0]?.cantidadKg).toBe(8);
  });

  it("suma total de kg", () => {
    const total = totalKgInternoDesdeSlots([
      slot({ position: 1, quantityKg: 2 }),
      slot({ position: 2, autoId: "BOX-2", quantityKg: 3 }),
    ]);
    expect(total).toBe(5);
  });
});
