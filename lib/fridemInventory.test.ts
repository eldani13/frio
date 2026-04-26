import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
});

describe("fridemInventory", () => {
  it("fetchFridemSlots obtiene desde firestore candidato", async () => {
    vi.doMock("./fridemClient", () => ({ ensureFridemAuth: vi.fn(async () => {}), fridemDb: {}, fridemDatabase: null }));
    vi.doMock("firebase/firestore", () => ({
      collection: (...args: unknown[]) => ({ path: args.join("/") }),
      getDocs: vi.fn(async () => ({
        empty: false,
        docs: [
          { data: () => ({ rd: "RD1", renglon: "1", descripcion: "Caja" }) },
        ],
      })),
    }));
    vi.doMock("firebase/database", () => ({ child: vi.fn(), get: vi.fn(), ref: vi.fn() }));

    const mod = await import("./fridemInventory");
    const rows = await mod.fetchFridemSlots("w1");
    expect(rows.length).toBe(1);
    expect(rows[0]?.autoId).toContain("RD1");
  });

  it("fetchFridemInventoryRows usa realtime si firestore vacío y parsea números", async () => {
    const getDocs = vi.fn(async () => ({ empty: true, docs: [] }));
    const get = vi.fn(async () => ({
      exists: () => true,
      val: () => ({
        a: { rd: "R", renglon: "1", descripcion: "P", kilosactual: "1.234,5", peso_unitario: "2,5", piezas: "2" },
      }),
    }));

    vi.doMock("./fridemClient", () => ({ ensureFridemAuth: vi.fn(async () => {}), fridemDb: {}, fridemDatabase: {} }));
    vi.doMock("firebase/firestore", () => ({ collection: vi.fn(() => ({})), getDocs }));
    vi.doMock("firebase/database", () => ({ child: vi.fn(), get, ref: vi.fn(() => ({})) }));

    const mod = await import("./fridemInventory");
    const rows = await mod.fetchFridemInventoryRows("w1");
    expect(rows.length).toBe(1);
    expect(rows[0]?.kilos).toBe(1234.5);
  });

  it("fetchFridemSlots hace fallback a realtime cuando firestore no trae docs", async () => {
    vi.doMock("./fridemClient", () => ({ ensureFridemAuth: vi.fn(async () => {}), fridemDb: {}, fridemDatabase: {} }));
    vi.doMock("firebase/firestore", () => ({
      collection: vi.fn(() => ({})),
      getDocs: vi.fn(async () => ({ empty: true, docs: [] })),
    }));
    vi.doMock("firebase/database", () => ({
      ref: vi.fn(() => ({})),
      child: vi.fn((_r, p: string) => p),
      get: vi.fn(async () => ({
        exists: () => true,
        val: () => ({ a: { rd: "R1", renglon: "2", descripcion: "Caja R" } }),
      })),
    }));

    const mod = await import("./fridemInventory");
    const slots = await mod.fetchFridemSlots("w1");
    expect(slots.length).toBe(1);
    expect(slots[0]?.name).toContain("Caja");
  });

  it("fetchFridemInventoryRows lee desde firestore cuando hay datos", async () => {
    vi.doMock("./fridemClient", () => ({ ensureFridemAuth: vi.fn(async () => {}), fridemDb: {}, fridemDatabase: null }));
    vi.doMock("firebase/firestore", () => ({
      collection: vi.fn(() => ({})),
      getDocs: vi.fn(async () => ({
        empty: false,
        docs: [
          {
            data: () => ({
              rd: "R2",
              renglon: "7",
              descripcion: "Producto",
              fecha_ingreso: "2026-04-01",
              kilosactual: "10,5",
              peso_unitario: "2,1",
              piezas: "3",
              estado: "Disponible",
            }),
          },
        ],
      })),
    }));
    vi.doMock("firebase/database", () => ({ child: vi.fn(), get: vi.fn(), ref: vi.fn() }));

    const mod = await import("./fridemInventory");
    const rows = await mod.fetchFridemInventoryRows("w1");
    expect(rows.length).toBe(1);
    expect(rows[0]?.kilos).toBe(10.5);
    expect(rows[0]?.rd).toBe("R2");
  });

  it("lanza error si no hay base externa configurada", async () => {
    vi.doMock("./fridemClient", () => ({ ensureFridemAuth: vi.fn(async () => {}), fridemDb: null, fridemDatabase: null }));
    vi.doMock("firebase/firestore", () => ({ collection: vi.fn(), getDocs: vi.fn() }));
    vi.doMock("firebase/database", () => ({ child: vi.fn(), get: vi.fn(), ref: vi.fn() }));

    const mod = await import("./fridemInventory");
    await expect(mod.fetchFridemInventoryRows("w1")).rejects.toThrow("No hay base externa configurada");
  });
});
