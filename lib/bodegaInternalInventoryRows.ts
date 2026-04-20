import type { Slot } from "../app/interfaces/bodega";
import { kgFromFirestoreSlotRecord } from "./coerceBodegaKg";

/** Alineado con ingresos / mapa: por encima de 5 °C se considera alerta. */
export const TEMP_ESTABLE_MAX_C = 5;

export type CategoriaTermica = "estable" | "alta" | "sin_dato";

export type FilaInventarioInterno = {
  key: string;
  posicion: number;
  nombre: string;
  cantidadKg: number | null;
  temperatura: number | null;
  estadoTexto: string;
  esAlerta: boolean;
  categoriaTermica: CategoriaTermica;
  /** Columnas alineadas con listado de bodega externa; vacías → "—" en UI. */
  rd: string | null;
  renglon: string | null;
  lote: string | null;
  descripcion: string;
  marca: string | null;
  embalaje: string | null;
  pesoUnitario: number | null;
  piezas: number | null;
  kilosActual: number | null;
  caducidad: string | null;
  fechaIngreso: string | null;
  llaveUnica: string | null;
};

export type InventarioInternoFromSlotsOptions = {
  /**
   * Último snapshot por `autoId` en `state/history.ingresos`.
   * Rellena kg (y trazas) cuando el slot en Firestore quedó sin esos campos.
   */
  ingresoRecordsByAutoId?: Map<string, Record<string, unknown>>;
};

function pickStr(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  const s = String(v).trim();
  return s === "" ? null : s;
}

function pickNum(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const t = v.trim().replace(/\s/g, "");
    if (!t) return null;
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
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function slotExtras(s: Slot): Record<string, unknown> {
  return s as unknown as Record<string, unknown>;
}

function categoriaTermica(temp: number | null | undefined): CategoriaTermica {
  if (temp === null || temp === undefined || Number.isNaN(Number(temp))) {
    return "sin_dato";
  }
  return Number(temp) > TEMP_ESTABLE_MAX_C ? "alta" : "estable";
}

/** Último registro por autoId (orden del array: el último gana). */
export function buildIngresoRecordByAutoId(
  ingresos: Array<Record<string, unknown>>,
): Map<string, Record<string, unknown>> {
  const m = new Map<string, Record<string, unknown>>();
  for (const row of ingresos) {
    const id = typeof row.autoId === "string" ? row.autoId.trim() : "";
    if (!id) continue;
    m.set(id, row);
  }
  return m;
}

function resolveKilosMerged(
  s: Slot,
  raw: Record<string, unknown>,
  hist: Record<string, unknown>,
): number | null {
  const merged: Record<string, unknown> = { ...hist, ...raw };
  if (s.quantityKg !== undefined) merged.quantityKg = s.quantityKg;
  if (s.pesoUnitario !== undefined && s.pesoUnitario !== null) {
    merged.pesoUnitario = s.pesoUnitario;
  }
  if (s.piezas !== undefined && s.piezas !== null) merged.piezas = s.piezas;
  const kg = kgFromFirestoreSlotRecord(merged);
  return kg !== undefined ? kg : null;
}

export function filasInventarioInternoFromSlots(
  slots: Slot[],
  opts?: InventarioInternoFromSlotsOptions,
): FilaInventarioInterno[] {
  const byAuto = opts?.ingresoRecordsByAutoId;
  return [...slots]
    .filter((s) => s.autoId?.trim())
    .sort((a, b) => a.position - b.position)
    .map((s) => {
      const raw = slotExtras(s);
      const hist =
        s.autoId?.trim() && byAuto ? (byAuto.get(s.autoId.trim()) ?? {}) : {};
      const tempResolved = pickNum(s.temperature ?? raw.temperature);
      const cat = categoriaTermica(tempResolved);
      const estadoTexto =
        cat === "sin_dato"
          ? "Sin dato térmico"
          : cat === "alta"
            ? "Alta temperatura"
            : "Temperatura estable";
      const kg = resolveKilosMerged(s, raw, hist);
      const nombreRaw = s.name?.trim() ?? "";
      const llave =
        pickStr(s.llaveUnica ?? raw.llaveUnica ?? raw.llaveunica) ??
        (s.autoId?.trim() ? s.autoId.trim() : null);
      return {
        key: `${s.position}-${s.autoId}`,
        posicion: s.position,
        nombre: nombreRaw || "Sin nombre",
        cantidadKg: kg,
        temperatura: tempResolved,
        estadoTexto,
        esAlerta: cat === "alta",
        categoriaTermica: cat,
        rd: pickStr(s.rd ?? raw.rd ?? hist.rd),
        renglon: pickStr(s.renglon ?? raw.renglon ?? hist.renglon),
        lote: pickStr(s.lote ?? raw.lote ?? hist.lote),
        descripcion: nombreRaw,
        marca: pickStr(s.marca ?? raw.marca ?? hist.marca),
        embalaje: pickStr(s.embalaje ?? raw.embalaje ?? hist.embalaje),
        pesoUnitario: pickNum(s.pesoUnitario ?? raw.pesoUnitario ?? raw.peso_unitario ?? hist.pesoUnitario ?? hist.peso_unitario),
        piezas: pickNum(s.piezas ?? raw.piezas ?? hist.piezas),
        kilosActual: kg,
        caducidad: pickStr(s.caducidad ?? raw.caducidad ?? hist.caducidad),
        fechaIngreso: pickStr(
          s.fechaIngreso ?? raw.fechaIngreso ?? raw.fecha_ingreso ?? hist.fechaIngreso ?? hist.fecha_ingreso,
        ),
        llaveUnica: llave,
      };
    });
}

/** Suma de kg en posiciones ocupadas (misma lógica que el pie del listado). */
export function totalKgInternoDesdeSlots(
  slots: Slot[],
  opts?: InventarioInternoFromSlotsOptions,
): number {
  return filasInventarioInternoFromSlots(slots, opts).reduce(
    (acc, r) => acc + (r.cantidadKg ?? 0),
    0,
  );
}
