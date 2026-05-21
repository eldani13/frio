import type { Box, Slot } from "@/app/interfaces/bodega";
import type { Catalogo } from "@/app/types/catalogo";

function catalogoPorId(catalogos: Catalogo[] | undefined, id: string): Catalogo | undefined {
  const pid = id.trim();
  if (!pid || !catalogos?.length) return undefined;
  return catalogos.find((x) => String(x.id ?? "").trim() === pid);
}

function normTituloAlmacen(t: string): string {
  return String(t ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/** Si no hay id en el slot, intenta un catálogo por título exacto (mismo criterio que nombre en OC). */
function catalogoProductIdDesdeNombre(
  catalogos: Catalogo[] | undefined,
  nombreSlot: string,
): string | undefined {
  if (!catalogos?.length) return undefined;
  const nm = normTituloAlmacen(nombreSlot);
  if (nm.length < 2) return undefined;
  const hit = catalogos.find((c) => normTituloAlmacen(String(c.title ?? "")) === nm);
  const id = hit?.id;
  return typeof id === "string" && id.trim() ? id.trim() : undefined;
}

/**
 * Antes de guardar en Firestore: completa `catalogoProductId` y `almacenProductCode` en casilleros ocupados.
 * Usa id de catálogo si existe; si no, intenta coincidencia exacta por `title` del catálogo vs `name` del slot.
 */
export function slotsWithAlmacenProductCodeFilled(
  slots: Slot[],
  catalogos: Catalogo[] | undefined,
): Slot[] {
  if (!catalogos?.length) return slots;
  return slots.map((s) => {
    if (!String(s.autoId ?? "").trim()) return s;

    let pid = String(s.catalogoProductId ?? "").trim();
    if (!pid) {
      pid = catalogoProductIdDesdeNombre(catalogos, String(s.name ?? "")) ?? "";
    }
    if (!pid) return s;

    const code = almacenProductCodeFromCatalogo(catalogoPorId(catalogos, pid));
    const patchCatalogo = !String(s.catalogoProductId ?? "").trim() && pid ? { catalogoProductId: pid } : {};
    const patchCode = !String(s.almacenProductCode ?? "").trim() && code ? { almacenProductCode: code } : {};

    if (!Object.keys(patchCatalogo).length && !Object.keys(patchCode).length) return s;
    return { ...s, ...patchCatalogo, ...patchCode };
  });
}

/** Cajas (ingreso, salida o despachadas): completa código si hay `catalogoProductId`. */
export function boxesWithAlmacenProductCodeFilled(
  boxes: Box[],
  catalogos: Catalogo[] | undefined,
): Box[] {
  if (!catalogos?.length) return boxes;
  return boxes.map((b) => {
    let pid = String(b.catalogoProductId ?? "").trim();
    if (!pid) {
      pid = catalogoProductIdDesdeNombre(catalogos, String(b.name ?? "")) ?? "";
    }
    if (!pid) return b;

    const code = almacenProductCodeFromCatalogo(catalogoPorId(catalogos, pid));
    const patchCatalogo = !String(b.catalogoProductId ?? "").trim() && pid ? { catalogoProductId: pid } : {};
    const patchCode = !String(b.almacenProductCode ?? "").trim() && code ? { almacenProductCode: code } : {};

    if (!Object.keys(patchCatalogo).length && !Object.keys(patchCode).length) return b;
    return { ...b, ...patchCatalogo, ...patchCode };
  });
}

/** @deprecated Usar `boxesWithAlmacenProductCodeFilled`. */
export const inboundBoxesWithAlmacenProductCodeFilled = boxesWithAlmacenProductCodeFilled;

/**
 * Código numérico de correlación catálogo ↔ almacenamiento (solo persistencia, no UI).
 * Se alinea con el correlativo `numericId` del producto en catálogo.
 */
export function almacenProductCodeFromNumericId(numericId: number): string {
  const n = Math.floor(Number(numericId)) || 0;
  if (n <= 0) return "0000";
  return String(n).padStart(4, "0");
}

export function almacenProductCodeFromCatalogo(
  cat: { almacenProductCode?: string; numericId?: number } | null | undefined,
): string | undefined {
  const trimmed = String(cat?.almacenProductCode ?? "").trim();
  if (trimmed) return trimmed;
  const nid = cat?.numericId;
  if (typeof nid === "number" && Number.isFinite(nid) && nid > 0) {
    return almacenProductCodeFromNumericId(nid);
  }
  return undefined;
}
