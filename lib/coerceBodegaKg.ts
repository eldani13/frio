/** Parseo de kg y campos numéricos desde Firestore (número o string). */

export function coerceKgFromUnknown(v: unknown): number | undefined {
  if (v === null || v === undefined) return undefined;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const t = v.trim().replace(/\s/g, "");
    if (!t) return undefined;
    const normalized =
      t.includes(",") && t.includes(".")
        ? t.lastIndexOf(",") > t.lastIndexOf(".")
          ? t.replace(/\./g, "").replace(",", ".")
          : t.replace(/,/g, "")
        : t.includes(",") && !t.includes(".")
          ? /^\d+,\d+$/.test(t)
            ? t.replace(",", ".")
            : t.replace(/,/g, "")
          : t;
    const n = Number.parseFloat(normalized);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

export function coercePiezasFromUnknown(v: unknown): number | undefined {
  if (v === null || v === undefined) return undefined;
  if (typeof v === "number" && Number.isFinite(v) && v >= 0) return Math.floor(v);
  if (typeof v === "string") {
    const t = v.trim().replace(/\s/g, "").replace(/,/g, "");
    if (!t) return undefined;
    const n = Number.parseInt(t, 10);
    return Number.isFinite(n) && n >= 0 ? n : undefined;
  }
  return undefined;
}

/**
 * Kg explícitos o derivados (peso unitario × piezas) desde un registro tipo slot/caja en Firestore.
 */
export function kgFromFirestoreSlotRecord(record: Record<string, unknown>): number | undefined {
  const direct = coerceKgFromUnknown(
    record.quantityKg ?? record.quantity_kg ?? record.kilos ?? record.kilosActual,
  );
  if (direct !== undefined) return direct;
  const pu = coerceKgFromUnknown(record.pesoUnitario ?? record.peso_unitario);
  const pz = coercePiezasFromUnknown(record.piezas);
  if (pu !== undefined && pz !== undefined && pz > 0) return pu * pz;
  return undefined;
}

const SLOT_TRACE_KEYS = [
  "rd",
  "renglon",
  "lote",
  "marca",
  "embalaje",
  "pesoUnitario",
  "piezas",
  "caducidad",
  "fechaIngreso",
  "llaveUnica",
  "catalogoProductId",
  "almacenProductCode",
] as const;

/** Campos de trazabilidad opcionales tal como vienen en Firestore (sin transformar). */
export function slotTracePartialFromRecord(
  record: Record<string, unknown>,
): Partial<Record<(typeof SLOT_TRACE_KEYS)[number], unknown>> {
  const out: Partial<Record<(typeof SLOT_TRACE_KEYS)[number], unknown>> = {};
  for (const k of SLOT_TRACE_KEYS) {
    const v = record[k];
    if (v === undefined) continue;
    out[k] = v;
  }
  const altLlave = record.llaveunica;
  if (out.llaveUnica === undefined && typeof altLlave === "string" && altLlave.trim()) {
    out.llaveUnica = altLlave.trim();
  }
  return out;
}
