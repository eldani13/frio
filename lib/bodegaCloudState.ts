import { db } from "./firebaseClient";
import {
  doc,
  getDoc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import type {
  AlertAssignment,
  AlertItem,
  BodegaOrder,
  BodegaStats,
  Box,
  HistoryState,
  Slot,
} from "../app/interfaces/bodega";

export const DEFAULT_WAREHOUSE_ID = process.env.NEXT_PUBLIC_WAREHOUSE_ID ?? "default";

export type CloudWarehouseState = {
  slots: Slot[];
  inboundBoxes: Box[];
  outboundBoxes: Box[];
  dispatchedBoxes: Box[];
  orders: BodegaOrder[];
  stats: BodegaStats;
  warehouseName: string;
  alerts: AlertItem[];
  assignedAlerts: AlertAssignment[];
  alertasOperario: Array<{ position: number; [key: string]: unknown }>;
  alertasOperarioSolved: number[];
  /** Tareas de procesamiento enviadas al operario (misma idea que alertasOperario). */
  tareasProcesamientoOperario: Array<Record<string, unknown>>;
  llamadasJefe: Array<Record<string, unknown>>;
};

export const defaultWarehouseState: CloudWarehouseState = {
  slots: [],
  inboundBoxes: [],
  outboundBoxes: [],
  dispatchedBoxes: [],
  orders: [],
  stats: { ingresos: 0, salidas: 0, movimientosBodega: 0 },
  warehouseName: "",
  alerts: [],
  assignedAlerts: [],
  alertasOperario: [],
  alertasOperarioSolved: [],
  tareasProcesamientoOperario: [],
  llamadasJefe: [],
};

/** Firestore rechaza `undefined`; los slots/cajas suelen traer campos opcionales explícitos undefined y el guardado fallaba sin aviso. */
function stripUndefinedDeep(value: unknown): unknown {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefinedDeep(item));
  }
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) {
    return value;
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (v === undefined) continue;
    out[k] = stripUndefinedDeep(v);
  }
  return out;
}

const stateDocRef = (warehouseId: string) =>
  doc(db, "warehouses", warehouseId, "state", "main");

const historyDocRef = (warehouseId: string) =>
  doc(db, "warehouses", warehouseId, "state", "history");

export const defaultHistoryState: HistoryState = {
  ingresos: [],
  salidas: [],
  movimientosBodega: [],
  alertas: [],
  despachadosHistorial: [],
  mermaProcesamientoKgTotal: 0,
};

/** Normaliza lecturas de Firestore (arrays nulos / ausentes) para no vaciar historial por accidente. */
function coerceHistoryState(raw: Partial<HistoryState> | undefined | null): HistoryState {
  const d = raw ?? {};
  return {
    ingresos: Array.isArray(d.ingresos) ? d.ingresos : [],
    salidas: Array.isArray(d.salidas) ? d.salidas : [],
    movimientosBodega: Array.isArray(d.movimientosBodega) ? d.movimientosBodega : [],
    alertas: Array.isArray(d.alertas) ? d.alertas : [],
    despachadosHistorial: Array.isArray(d.despachadosHistorial) ? d.despachadosHistorial : [],
    mermaProcesamientoKgTotal: Number(d.mermaProcesamientoKgTotal) || 0,
  };
}

/**
 * Aplica un cambio al historial leyendo siempre el documento actual dentro de una transacción,
 * para que dos pestañas o guardados seguidos no pisen listas enteras (merge + arrays = último gana y se perdían datos).
 * No escribe `mermaProcesamientoKgTotal` aquí: ese campo lo actualiza solo `recordMermaProcesamientoKg` (merge atómico).
 */
export async function mergeHistoryState(
  warehouseId: string,
  updater: (current: HistoryState) => HistoryState,
): Promise<HistoryState> {
  const wid = String(warehouseId ?? "").trim() || DEFAULT_WAREHOUSE_ID;
  const ref = historyDocRef(wid);
  return runTransaction(db, async (transaction) => {
    const snap = await transaction.get(ref);
    const current = snap.exists()
      ? coerceHistoryState({ ...defaultHistoryState, ...(snap.data() as Partial<HistoryState>) })
      : defaultHistoryState;
    const next = updater(current);
    const { mermaProcesamientoKgTotal: _m, ...rest } = next;
    const cleaned = stripUndefinedDeep(rest) as Record<string, unknown>;
    transaction.set(
      ref,
      { ...cleaned, updatedAt: serverTimestamp() } as Record<string, unknown>,
      { merge: true },
    );
    return next;
  });
}

/** Suma kg de merma al historial de la bodega (reporte admin); idempotente por sesión de red. */
export async function recordMermaProcesamientoKg(warehouseId: string | undefined, kg: number) {
  const wid = String(warehouseId ?? "").trim();
  const n = Number(kg);
  if (!wid || !Number.isFinite(n) || n <= 0) return;
  const ref = historyDocRef(wid);
  const snap = await getDoc(ref);
  const data = snap.exists() ? (snap.data() as Partial<HistoryState>) : {};
  const prev = Number(data.mermaProcesamientoKgTotal) || 0;
  await setDoc(
    ref,
    { mermaProcesamientoKgTotal: prev + n, updatedAt: serverTimestamp() } as Record<string, unknown>,
    { merge: true },
  );
}

export async function ensureWarehouseState(warehouseId: string) {
  const ref = stateDocRef(warehouseId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, { ...defaultWarehouseState, createdAt: serverTimestamp() });
  }
}

/** Lectura puntual del estado del mapa (p. ej. totales en reportes sin suscripción). */
export async function fetchWarehouseStateOnce(
  warehouseId: string,
): Promise<CloudWarehouseState> {
  const snap = await getDoc(stateDocRef(warehouseId));
  if (!snap.exists()) return defaultWarehouseState;
  const data = snap.data() as Partial<CloudWarehouseState>;
  return { ...defaultWarehouseState, ...data };
}

/** Lectura puntual del historial (ingresos archivados, etc.) para enriquecer reportes. */
export async function fetchHistoryStateOnce(warehouseId: string): Promise<HistoryState> {
  const snap = await getDoc(historyDocRef(warehouseId));
  if (!snap.exists()) return defaultHistoryState;
  return coerceHistoryState({ ...defaultHistoryState, ...(snap.data() as Partial<HistoryState>) });
}

export function subscribeWarehouseState(
  warehouseId: string,
  handler: (state: CloudWarehouseState) => void,
) {
  const ref = stateDocRef(warehouseId);
  ensureWarehouseState(warehouseId).catch(() => {});
  return onSnapshot(ref, (snap) => {
    if (!snap.exists()) {
      handler(defaultWarehouseState);
      return;
    }
    const data = snap.data() as Partial<CloudWarehouseState>;
    handler({ ...defaultWarehouseState, ...data });
  });
}

export async function saveWarehouseState(
  warehouseId: string,
  state: Partial<CloudWarehouseState>,
) {
  const cleaned = stripUndefinedDeep(state) as Partial<CloudWarehouseState>;
  await setDoc(
    stateDocRef(warehouseId),
    { ...cleaned, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

export async function ensureHistoryState(warehouseId: string) {
  const ref = historyDocRef(warehouseId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, { ...defaultHistoryState, createdAt: serverTimestamp() });
  }
}

export function subscribeHistoryState(
  warehouseId: string,
  handler: (state: HistoryState) => void,
) {
  const ref = historyDocRef(warehouseId);
  ensureHistoryState(warehouseId).catch(() => {});
  return onSnapshot(ref, (snap) => {
    if (!snap.exists()) {
      handler(defaultHistoryState);
      return;
    }
    handler(coerceHistoryState({ ...defaultHistoryState, ...(snap.data() as Partial<HistoryState>) }));
  });
}

/**
 * @deprecated Preferir `mergeHistoryState` para evitar condiciones de carrera.
 * No escribe `mermaProcesamientoKgTotal` para no pisar sumas hechas con `recordMermaProcesamientoKg`.
 */
export async function saveHistoryState(
  warehouseId: string,
  state: Partial<HistoryState>,
) {
  const cleaned = stripUndefinedDeep(state) as Partial<HistoryState>;
  const rest = { ...(cleaned as Record<string, unknown>) };
  delete rest.mermaProcesamientoKgTotal;
  await setDoc(historyDocRef(warehouseId), { ...rest, updatedAt: serverTimestamp() }, { merge: true });
}
