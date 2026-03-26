import { child, get, ref } from "firebase/database";
import { collection, getDocs } from "firebase/firestore";
import type { Slot } from "../app/interfaces/bodega";
import { ensureFridemAuth, fridemDatabase, fridemDb } from "./fridemClient";

export type FridemRaw = Partial<{
  rd: string;
  renglon: string;
  fecha_ingreso: string;
  descripcion: string;
  marca: string;
  embalaje: string;
  lote: string;
  caducidad: string;
  peso_unitario: string;
  piezas: string;
  kilosactual: string;
  llaveunica: string;
  estado: string;
}> & Record<string, unknown>;

export type FridemInventoryRow = {
  id: string;
  rd?: string;
  renglon?: string;
  lote: string;
  descripcion: string;
  marca: string;
  embalaje: string;
  caducidad: string;
  fechaIngreso: string;
  pesoUnitario: number | null;
  piezas: number | null;
  kilos: number;
  kilosActual: number | null;
  llaveUnica?: string;
  updateTime?: string;
  estado: string;
};

const parseNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalized = value.replace(",", ".");
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const normalizeRawToRow = (raw: FridemRaw, index: number): FridemInventoryRow => {
  const kilosDirect = parseNumber(raw.kilosactual);
  const kilosFromUnit = (() => {
    const unit = parseNumber(raw.peso_unitario);
    const pieces = parseNumber(raw.piezas);
    if (unit !== null && pieces !== null) return unit * pieces;
    return null;
  })();

  const kilos = kilosDirect ?? kilosFromUnit ?? 0;
  const piezas = parseNumber(raw.piezas);
  const pesoUnitario = parseNumber(raw.peso_unitario);
  const id =
    (typeof raw.llaveunica === "string" && raw.llaveunica.trim()) ||
    (typeof raw.rd === "string" && raw.rd.trim()
      ? `${raw.rd}_${raw.renglon ?? index + 1}`
      : `registro-${index + 1}`);

  return {
    id,
    rd: typeof raw.rd === "string" ? raw.rd : undefined,
    renglon: typeof raw.renglon === "string" ? raw.renglon : undefined,
    lote: typeof raw.lote === "string" && raw.lote.trim() ? raw.lote : id,
    descripcion:
      typeof raw.descripcion === "string" && raw.descripcion.trim()
        ? raw.descripcion
        : "Sin descripción",
    embalaje: typeof raw.embalaje === "string" ? raw.embalaje : "",
    marca: typeof raw.marca === "string" ? raw.marca : "",
    caducidad: typeof raw.caducidad === "string" ? raw.caducidad : "",
    fechaIngreso: typeof raw.fecha_ingreso === "string" ? raw.fecha_ingreso : "",
    pesoUnitario,
    piezas,
    kilos,
    kilosActual: kilosDirect,
    llaveUnica: typeof raw.llaveunica === "string" ? raw.llaveunica : undefined,
    updateTime: typeof raw.updateTime === "string" ? raw.updateTime : undefined,
    estado: typeof raw.estado === "string" && raw.estado.trim() ? raw.estado : "Disponible",
  };
};

const normalizeRawToSlot = (raw: FridemRaw, index: number): Slot => {
  const position = index + 1;
  const autoId =
    typeof raw.llaveunica === "string" && raw.llaveunica.trim()
      ? raw.llaveunica
      : `${raw.rd ?? "RD"}_${raw.renglon ?? position}`;
  const name =
    typeof raw.descripcion === "string" && raw.descripcion.trim()
      ? raw.descripcion
      : autoId;
  return {
    position,
    autoId,
    name,
    temperature: null,
    client: typeof raw.marca === "string" ? raw.marca : "",
  };
};

async function fetchFirestoreCandidates(warehouseId: string): Promise<Slot[]> {
  await ensureFridemAuth();
  if (!fridemDb) return [];
  const paths: string[][] = [
    ["detalle_inventario"],
    ["bodegas", warehouseId, "inventario"],
    ["inventario"],
    ["bodegas", warehouseId, "items"],
  ];

  for (const path of paths) {
    try {
      const [first, ...rest] = path;
      if (!first) continue;
      const snap = await getDocs(collection(fridemDb, first, ...rest));
      if (!snap.empty) {
        const slots = snap.docs.map((docSnap, idx) =>
          normalizeRawToSlot(docSnap.data() as FridemRaw, idx),
        );
        if (slots.length) return slots;
      }
    } catch {
      // Try next path silently
    }
  }

  return [];
}

async function fetchRealtimeCandidates(warehouseId: string): Promise<Slot[]> {
  if (!fridemDatabase) return [];
  const root = ref(fridemDatabase);
  const candidates = [`inventario/${warehouseId}`, "inventario"];

  for (const path of candidates) {
    try {
      const snap = await get(child(root, path));
      if (!snap.exists()) continue;
      const data = snap.val();
      const arr: FridemRaw[] = Array.isArray(data)
        ? data.filter(Boolean)
        : typeof data === "object" && data !== null
          ? Object.values(data as Record<string, FridemRaw>)
          : [];
      if (arr.length) {
        return arr.map((item, idx) => normalizeRawToSlot(item, idx));
      }
    } catch {
      // Try next path silently
    }
  }

  return [];
}

export async function fetchFridemSlots(warehouseId: string): Promise<Slot[]> {
  const fromFirestore = await fetchFirestoreCandidates(warehouseId);
  if (fromFirestore.length) return fromFirestore;

  const fromRealtime = await fetchRealtimeCandidates(warehouseId);
  if (fromRealtime.length) return fromRealtime;

  return [];
}

async function fetchRawFromFirestore(warehouseId?: string): Promise<FridemRaw[]> {
  await ensureFridemAuth();
  if (!fridemDb) return [];

  const paths: (string[] | null)[] = [
    ["detalle_inventario"],
    warehouseId ? ["bodegas", warehouseId, "inventario"] : null,
    ["inventario"],
    warehouseId ? ["bodegas", warehouseId, "items"] : null,
  ];

  for (const path of paths) {
    if (!path) continue;
    try {
      const [first, ...rest] = path;
      if (!first) continue;
      const snap = await getDocs(collection(fridemDb, first, ...rest));
      if (!snap.empty) {
        const raws = snap.docs.map((docSnap) => docSnap.data() as FridemRaw);
        if (raws.length) return raws;
      }
    } catch {
      // Try next path silently
    }
  }

  return [];
}

async function fetchRawFromRealtime(warehouseId?: string): Promise<FridemRaw[]> {
  if (!fridemDatabase) return [];
  const root = ref(fridemDatabase);
  const candidates = [
    warehouseId ? `inventario/${warehouseId}` : null,
    "inventario",
    "detalle_inventario",
  ].filter(Boolean) as string[];

  for (const path of candidates) {
    try {
      const snap = await get(child(root, path));
      if (!snap.exists()) continue;
      const data = snap.val();
      const arr: FridemRaw[] = Array.isArray(data)
        ? data.filter(Boolean)
        : typeof data === "object" && data !== null
          ? Object.values(data as Record<string, FridemRaw>)
          : [];
      if (arr.length) return arr;
    } catch {
      // Try next path silently
    }
  }

  return [];
}

export async function fetchFridemInventoryRows(warehouseId?: string): Promise<FridemInventoryRow[]> {
  if (!fridemDb && !fridemDatabase) {
    throw new Error(
      "No hay base externa configurada. Revisa NEXT_PUBLIC_FRIDEM_* y NEXT_PUBLIC_FRIDEM_DATABASE_URL en tu .env.",
    );
  }

  const fromFirestore = await fetchRawFromFirestore(warehouseId);
  if (fromFirestore.length) return fromFirestore.map((raw, idx) => normalizeRawToRow(raw, idx));

  const fromRealtime = await fetchRawFromRealtime(warehouseId);
  if (fromRealtime.length) return fromRealtime.map((raw, idx) => normalizeRawToRow(raw, idx));

  return [];
}
