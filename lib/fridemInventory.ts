import { child, get, ref } from "firebase/database";
import { collection, getDocs } from "firebase/firestore";
import type { Slot } from "../app/interfaces/bodega";
import { ensureFridemAuth, fridemDatabase, fridemDb } from "./fridemClient";

type FridemRaw = Partial<{
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
}> & Record<string, unknown>;

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
  const paths = [
    ["detalle_inventario"] as const,
    ["bodegas", warehouseId, "inventario"] as const,
    ["inventario"] as const,
    ["bodegas", warehouseId, "items"] as const,
  ];

  for (const path of paths) {
    try {
      const snap = await getDocs(collection(fridemDb, ...path));
      if (!snap.empty) {
        const slots = snap.docs.map((docSnap, idx) =>
          normalizeRawToSlot(docSnap.data() as FridemRaw, idx),
        );
        if (slots.length) return slots;
      }
    } catch (error) {
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
    } catch (error) {
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
