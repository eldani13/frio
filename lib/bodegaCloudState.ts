import { db } from "./firebaseClient";
import {
  doc,
  getDoc,
  onSnapshot,
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
  llamadasJefe: [],
};

const stateDocRef = (warehouseId: string) =>
  doc(db, "warehouses", warehouseId, "state", "main");

const historyDocRef = (warehouseId: string) =>
  doc(db, "warehouses", warehouseId, "state", "history");

export const defaultHistoryState: HistoryState = {
  ingresos: [],
  salidas: [],
  movimientosBodega: [],
  alertas: [],
};

export async function ensureWarehouseState(warehouseId: string) {
  const ref = stateDocRef(warehouseId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, { ...defaultWarehouseState, createdAt: serverTimestamp() });
  }
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
  await setDoc(
    stateDocRef(warehouseId),
    { ...state, updatedAt: serverTimestamp() },
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
    const data = snap.data() as Partial<HistoryState>;
    handler({ ...defaultHistoryState, ...data });
  });
}

export async function saveHistoryState(
  warehouseId: string,
  state: Partial<HistoryState>,
) {
  await setDoc(
    historyDocRef(warehouseId),
    { ...state, updatedAt: serverTimestamp() },
    { merge: true },
  );
}
