import type { Slot } from "../app/interfaces/bodega";

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

export function filasInventarioInternoFromSlots(slots: Slot[]): FilaInventarioInterno[] {
  return [...slots]
    .filter((s) => s.autoId?.trim())
    .sort((a, b) => a.position - b.position)
    .map((s) => {
      const raw = slotExtras(s);
      const cat = categoriaTermica(s.temperature);
      const estadoTexto =
        cat === "sin_dato"
          ? "Sin dato térmico"
          : cat === "alta"
            ? "Alta temperatura"
            : "Temperatura estable";
      const kg =
        typeof s.quantityKg === "number" && Number.isFinite(s.quantityKg)
          ? s.quantityKg
          : null;
      const nombreRaw = s.name?.trim() ?? "";
      const llave =
        pickStr(s.llaveUnica ?? raw.llaveUnica ?? raw.llaveunica) ??
        (s.autoId?.trim() ? s.autoId.trim() : null);
      return {
        key: `${s.position}-${s.autoId}`,
        posicion: s.position,
        nombre: nombreRaw || "Sin nombre",
        cantidadKg: kg,
        temperatura: s.temperature,
        estadoTexto,
        esAlerta: cat === "alta",
        categoriaTermica: cat,
        rd: pickStr(s.rd ?? raw.rd),
        renglon: pickStr(s.renglon ?? raw.renglon),
        lote: pickStr(s.lote ?? raw.lote),
        descripcion: nombreRaw,
        marca: pickStr(s.marca ?? raw.marca),
        embalaje: pickStr(s.embalaje ?? raw.embalaje),
        pesoUnitario: pickNum(s.pesoUnitario ?? raw.pesoUnitario ?? raw.peso_unitario),
        piezas: pickNum(s.piezas ?? raw.piezas),
        kilosActual: kg,
        caducidad: pickStr(s.caducidad ?? raw.caducidad),
        fechaIngreso: pickStr(s.fechaIngreso ?? raw.fechaIngreso ?? raw.fecha_ingreso),
        llaveUnica: llave,
      };
    });
}

/** Suma de kg en posiciones ocupadas (misma lógica que el pie del listado). */
export function totalKgInternoDesdeSlots(slots: Slot[]): number {
  return filasInventarioInternoFromSlots(slots).reduce(
    (acc, r) => acc + (r.cantidadKg ?? 0),
    0,
  );
}
