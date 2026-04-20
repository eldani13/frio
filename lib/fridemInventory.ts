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

/**
 * Convierte cadenas numéricas del inventario externo (p. ej. CECIR) a número.
 * Evita interpretar "1,504" como 1,504 decimal: si la coma agrupa miles (…,504),
 * se interpreta como 1504. También acepta formatos US (1,234.56) y europeos (1.234,56).
 */
const parseNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;

  const s = value.trim().replace(/\s/g, "");
  if (!s) return null;

  const hasComma = s.includes(",");
  const hasDot = s.includes(".");

  if (hasComma && hasDot) {
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
      const normalized = s.replace(/\./g, "").replace(",", ".");
      const n = Number.parseFloat(normalized);
      return Number.isFinite(n) ? n : null;
    }
    const normalized = s.replace(/,/g, "");
    const n = Number.parseFloat(normalized);
    return Number.isFinite(n) ? n : null;
  }

  if (hasComma && !hasDot) {
    const parts = s.split(",");
    if (parts.length > 2) {
      const n = Number.parseFloat(s.replace(/,/g, ""));
      return Number.isFinite(n) ? n : null;
    }
    if (parts.length === 2) {
      const [before, after] = parts;
      if (!/^\d*$/.test(before) || !/^\d+$/.test(after)) {
        const n = Number.parseFloat(s.replace(",", "."));
        return Number.isFinite(n) ? n : null;
      }
      if (before === "" || before === "0") {
        const n = Number.parseFloat(`0.${after}`);
        return Number.isFinite(n) ? n : null;
      }
      if (after.length <= 2) {
        const n = Number.parseFloat(`${before}.${after}`);
        return Number.isFinite(n) ? n : null;
      }
      if (after.length === 3) {
        const n = Number.parseFloat(before + after);
        return Number.isFinite(n) ? n : null;
      }
    }
    const n = Number.parseFloat(s.replace(/,/g, ""));
    return Number.isFinite(n) ? n : null;
  }

  if (hasDot && !hasComma) {
    const parts = s.split(".");
    if (parts.length > 2) {
      const n = Number.parseFloat(s.replace(/\./g, ""));
      return Number.isFinite(n) ? n : null;
    }
    if (parts.length === 2) {
      const [before, after] = parts;
      if (!/^\d*$/.test(before) || !/^\d+$/.test(after)) {
        const n = Number.parseFloat(s);
        return Number.isFinite(n) ? n : null;
      }
      if (before === "" || before === "0") {
        const n = Number.parseFloat(`0.${after}`);
        return Number.isFinite(n) ? n : null;
      }
      if (after.length <= 2) {
        const n = Number.parseFloat(`${before}.${after}`);
        return Number.isFinite(n) ? n : null;
      }
      if (after.length === 3) {
        const n = Number.parseFloat(before + after);
        return Number.isFinite(n) ? n : null;
      }
    }
    const n = Number.parseFloat(s);
    return Number.isFinite(n) ? n : null;
  }

  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : null;
};

/** Clave normalizada para emparejar campos del JSON aunque vengan con distinto casing, guiones o acentos. */
function normalizeInventoryKey(key: string): string {
  return key
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[\s_-]+/g, "");
}

/** Convierte valores típicos de Firestore (Timestamp, Date, número) a texto para la tabla. */
function valueToInventoryString(value: unknown, keyNormalized: string): string | null {
  const treatAsDateOnly =
    keyNormalized.includes("fecha") || keyNormalized === "updatetime" || keyNormalized === "fechahora";

  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) {
    if (treatAsDateOnly) {
      const d = new Date(value);
      if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    }
    return String(value);
  }
  if (typeof value === "boolean") return value ? "true" : "false";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return treatAsDateOnly ? value.toISOString().slice(0, 10) : value.toISOString();
  }

  if (value && typeof value === "object") {
    const o = value as Record<string, unknown>;
    if (typeof o.toDate === "function") {
      try {
        const d = (o.toDate as () => Date)();
        if (d instanceof Date && !Number.isNaN(d.getTime())) {
          return treatAsDateOnly ? d.toISOString().slice(0, 10) : d.toISOString();
        }
      } catch {
        /* vacío */
      }
    }
    const sec = o.seconds ?? o._seconds;
    if (typeof sec === "number" && Number.isFinite(sec)) {
      const nanos = Number(o.nanoseconds ?? o._nanoseconds) || 0;
      const d = new Date(sec * 1000 + Math.floor(nanos / 1e6));
      if (!Number.isNaN(d.getTime())) {
        return treatAsDateOnly ? d.toISOString().slice(0, 10) : d.toISOString();
      }
    }
  }

  return null;
}

/**
 * Obtiene un string del registro crudo buscando por nombre canónico (ej. `fecha_ingreso` coincide con
 * `Fecha_Ingreso`, `fecha ingreso`, `FECHAINGRESO`, etc.).
 * Incluye Timestamp / Date de Firestore para `fecha_ingreso`.
 */
function pickRawString(raw: FridemRaw, canonicalKey: string): string {
  const target = normalizeInventoryKey(canonicalKey);
  for (const [k, v] of Object.entries(raw)) {
    if (normalizeInventoryKey(k) !== target) continue;
    const s = valueToInventoryString(v, target);
    if (s) return s;
  }
  return "";
}

function pickRawNumberFrom(raw: FridemRaw, canonicalKey: string): number | null {
  const target = normalizeInventoryKey(canonicalKey);
  for (const [k, v] of Object.entries(raw)) {
    if (normalizeInventoryKey(k) !== target) continue;
    const n = parseNumber(v);
    if (n !== null) return n;
  }
  return null;
}

/** Copia campos desde objetos anidados típicos (`status`, `data`) si en la raíz no vienen (Firestore a veces agrupa así). */
function mergeNestedShallow(raw: FridemRaw): FridemRaw {
  const out: Record<string, unknown> = { ...(raw as Record<string, unknown>) };
  for (const box of ["status", "data", "fields", "payload"] as const) {
    const inner = (raw as Record<string, unknown>)[box];
    if (inner && typeof inner === "object" && !Array.isArray(inner)) {
      for (const [ik, iv] of Object.entries(inner as Record<string, unknown>)) {
        if (out[ik] === undefined && iv !== undefined) {
          out[ik] = iv;
        }
      }
    }
  }
  return out as FridemRaw;
}

const normalizeRawToRow = (raw: FridemRaw, index: number): FridemInventoryRow => {
  const r = mergeNestedShallow(raw);

  const kilosDirect =
    pickRawNumberFrom(r, "kilosactual") ?? pickRawNumberFrom(r, "kilos_actual");
  const pesoUnitario =
    pickRawNumberFrom(r, "peso_unitario") ?? pickRawNumberFrom(r, "pesounitario");
  const piezas = pickRawNumberFrom(r, "piezas");
  const kilosFromUnit = (() => {
    if (pesoUnitario !== null && piezas !== null) return pesoUnitario * piezas;
    return null;
  })();

  const kilos = kilosDirect ?? kilosFromUnit ?? 0;
  const llaveFromDb = pickRawString(r, "llaveunica");
  const rd = pickRawString(r, "rd");
  const renglon = pickRawString(r, "renglon");
  const fechaIngreso = pickRawString(r, "fecha_ingreso");
  const loteStr = pickRawString(r, "lote");

  const composedLlave = rd ? `${rd}_${renglon || String(index + 1)}` : "";
  const id = llaveFromDb || composedLlave || `registro-${index + 1}`;
  const llaveDisplay = llaveFromDb || composedLlave || undefined;

  return {
    id,
    rd: rd || undefined,
    renglon: renglon || undefined,
    lote: loteStr || id,
    descripcion: pickRawString(r, "descripcion") || "Sin descripción",
    embalaje: pickRawString(r, "embalaje"),
    marca: pickRawString(r, "marca"),
    caducidad: pickRawString(r, "caducidad"),
    fechaIngreso,
    pesoUnitario,
    piezas,
    kilos,
    kilosActual: kilosDirect,
    llaveUnica: llaveDisplay,
    updateTime: pickRawString(r, "updateTime") || pickRawString(r, "updatetime") || undefined,
    estado: pickRawString(r, "estado") || "Disponible",
  };
};

const normalizeRawToSlot = (raw: FridemRaw, index: number): Slot => {
  const position = index + 1;
  const r = mergeNestedShallow(raw);
  const llave = pickRawString(r, "llaveunica");
  const rd = pickRawString(r, "rd");
  const renglon = pickRawString(r, "renglon");
  const autoId = llave || `${rd || "RD"}_${renglon || String(position)}`;
  const desc = pickRawString(r, "descripcion");
  const name = desc || autoId;
  return {
    position,
    autoId,
    name,
    temperature: null,
    client: pickRawString(r, "marca"),
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
