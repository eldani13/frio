import type { Slot } from "../app/interfaces/bodega";
import type { Catalogo } from "../app/types/catalogo";
import { coercePiezasFromUnknown, kgFromFirestoreSlotRecord } from "./coerceBodegaKg";

function norm(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Relaciona una posición del mapa con un ítem del catálogo (mismo criterio que en ingreso: nombre del producto).
 */
export function slotCoincideConCatalogo(slot: Slot, cat: Catalogo): boolean {
  const sn = norm(slot.name ?? "");
  const title = norm(cat.title ?? "");
  const sku = norm(cat.sku ?? "");
  const code = norm(cat.code ?? "");
  if (!sn) return false;
  if (title && sn === title) return true;
  if (sku && sn === sku) return true;
  if (code && sn === code) return true;
  if (title.length >= 6 && (sn.includes(title) || title.includes(sn))) return true;
  return false;
}

function slotsClienteYProducto(slots: Slot[], clientId: string, primario: Catalogo): Slot[] {
  const cid = clientId.trim();
  if (!cid) return [];
  return slots.filter(
    (s) =>
      Boolean(s.autoId?.trim()) &&
      String(s.client ?? "").trim() === cid &&
      slotCoincideConCatalogo(s, primario),
  );
}

export type StockPrimarioBodegaResult = {
  /** Suma en kg (peso) o unidades/piezas/cajas (cantidad). */
  total: number;
  /** Cantidad de posiciones ocupadas que sumaron al total. */
  cajasCoincidentes: number;
};

/**
 * Stock disponible en el mapa de la bodega para un primario y cuenta (`slot.client` = `clientId` de Firestore).
 * - **peso**: suma `quantityKg` (y equivalentes vía `kgFromFirestoreSlotRecord`).
 * - **cantidad**: suma `piezas` si alguna caja las trae; si no, cuenta cajas (1 por posición).
 */
export function stockPrimarioDesdeSlotsBodega(
  slots: Slot[],
  clientId: string,
  primario: Catalogo,
  unidad: "cantidad" | "peso",
): StockPrimarioBodegaResult {
  const list = slotsClienteYProducto(slots, clientId, primario);
  if (!list.length) return { total: 0, cajasCoincidentes: 0 };

  if (unidad === "peso") {
    let kg = 0;
    for (const s of list) {
      const rec = s as unknown as Record<string, unknown>;
      let add = kgFromFirestoreSlotRecord({ ...rec, quantityKg: s.quantityKg });
      if (add === undefined && typeof s.quantityKg === "number" && Number.isFinite(s.quantityKg)) {
        add = s.quantityKg;
      }
      if (add !== undefined && Number.isFinite(add) && add > 0) kg += add;
    }
    return { total: kg, cajasCoincidentes: list.length };
  }

  let sumPiezas = 0;
  let tienePiezas = false;
  for (const s of list) {
    const raw = s as unknown as Record<string, unknown>;
    const pz = coercePiezasFromUnknown(raw.piezas ?? s.piezas);
    if (pz !== undefined && pz > 0) {
      tienePiezas = true;
      sumPiezas += pz;
    }
  }
  if (tienePiezas) return { total: sumPiezas, cajasCoincidentes: list.length };
  return { total: list.length, cajasCoincidentes: list.length };
}
