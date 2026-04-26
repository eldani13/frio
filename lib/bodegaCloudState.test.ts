import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
});

describe("bodegaCloudState", () => {
  it("lee/escribe estado básico y suscripciones", async () => {
    const setDoc = vi.fn(async () => {});
    const getDoc = vi.fn(async () => ({ exists: () => false, data: () => ({}) }));
    const onSnapshot = vi.fn((_ref: unknown, cb: (snap: { exists: () => boolean; data: () => unknown }) => void) => {
      cb({ exists: () => true, data: () => ({ warehouseName: "W" }) });
      return () => {};
    });
    const runTransaction = vi.fn(async (_db: unknown, cb: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        get: vi.fn(async () => ({ exists: () => false, data: () => ({}) })),
        set: vi.fn(),
      };
      return cb(tx);
    });

    vi.doMock("./firebaseClient", () => ({ db: {} }));
    vi.doMock("firebase/firestore", () => ({
      doc: (...args: unknown[]) => ({ path: args.join("/") }),
      getDoc,
      onSnapshot,
      runTransaction,
      serverTimestamp: () => "ts",
      setDoc,
    }));

    const mod = await import("./bodegaCloudState");

    await mod.ensureWarehouseState("w1");
    expect(setDoc).toHaveBeenCalled();

    const state = await mod.fetchWarehouseStateOnce("w1");
    expect(state.warehouseName).toBe("");

    let got = "";
    mod.subscribeWarehouseState("w1", (s) => {
      got = s.warehouseName;
    });
    expect(got).toBe("W");

    const merged = await mod.mergeHistoryState("w1", (cur) => ({ ...cur, ingresos: [{ autoId: "A" }] as never }));
    expect(merged.ingresos.length).toBe(1);

    await mod.saveWarehouseState("w1", { warehouseName: "N" });
    expect(setDoc).toHaveBeenCalled();
  });

  it("recordMermaProcesamientoKg suma acumulado", async () => {
    const setDoc = vi.fn(async () => {});
    const getDoc = vi.fn(async () => ({
      exists: () => true,
      data: () => ({ mermaProcesamientoKgTotal: 2 }),
    }));

    vi.doMock("./firebaseClient", () => ({ db: {} }));
    vi.doMock("firebase/firestore", () => ({
      doc: (...args: unknown[]) => ({ path: args.join("/") }),
      getDoc,
      onSnapshot: vi.fn(() => () => {}),
      runTransaction: vi.fn(),
      serverTimestamp: () => "ts",
      setDoc,
    }));

    const mod = await import("./bodegaCloudState");
    await mod.recordMermaProcesamientoKg("w1", 3);

    expect(setDoc).toHaveBeenCalled();
    const payload = (setDoc as unknown as { mock: { calls: unknown[][] } }).mock.calls[0][1] as {
      mermaProcesamientoKgTotal: number;
    };
    expect(payload.mermaProcesamientoKgTotal).toBe(5);
  });

  it("cubre ensure/fetch/subscribe/save de history", async () => {
    const setDoc = vi.fn(async () => {});
    const getDoc = vi
      .fn()
      .mockResolvedValueOnce({ exists: () => false, data: () => ({}) })
      .mockResolvedValueOnce({ exists: () => true, data: () => ({ ingresos: [{ autoId: "A" }] }) });

    const onSnapshot = vi.fn((_ref: unknown, cb: (snap: { exists: () => boolean; data: () => unknown }) => void) => {
      cb({ exists: () => true, data: () => ({ ingresos: [{ autoId: "B" }], mermaProcesamientoKgTotal: 9 }) });
      return () => {};
    });

    vi.doMock("./firebaseClient", () => ({ db: {} }));
    vi.doMock("firebase/firestore", () => ({
      doc: (...args: unknown[]) => ({ path: args.join("/") }),
      getDoc,
      onSnapshot,
      runTransaction: vi.fn(),
      serverTimestamp: () => "ts",
      setDoc,
    }));

    const mod = await import("./bodegaCloudState");
    await mod.ensureHistoryState("w1");
    const once = await mod.fetchHistoryStateOnce("w1");
    expect(once.ingresos.length).toBe(1);

    let got = 0;
    mod.subscribeHistoryState("w1", (s) => {
      got = s.ingresos.length;
    });
    expect(got).toBe(1);

    await mod.saveHistoryState("w1", { ingresos: [], mermaProcesamientoKgTotal: 999 });
    expect(setDoc).toHaveBeenCalled();
  });
});
