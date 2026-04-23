import type { SolicitudProcesamiento } from "@/app/types/solicitudProcesamiento";

type MermaFields = Pick<
  SolicitudProcesamiento,
  "cantidadPrimario" | "unidadPrimarioVisualizacion" | "perdidaProcesamientoPct"
>;

export function unidadPrimarioNormalizada(
  vis: MermaFields["unidadPrimarioVisualizacion"],
): "cantidad" | "peso" | undefined {
  if (vis === "cantidad" || vis === "peso") return vis;
  const s = String(vis ?? "")
    .trim()
    .toLowerCase();
  if (s === "cantidad" || s === "peso") return s;
  return undefined;
}

/**
 * Sugiere kg de **merma operativa** a partir del % de **pérdida/rendimiento** del catálogo guardado en la solicitud
 * (`perdidaProcesamientoPct`). Es solo referencia; la merma real la declarás al pasar a «Pendiente».
 * Solo aplica si el primario va en **peso** (cantidad = kg); con unidades no hay kg en la solicitud.
 */
export function desperdicioKgSugeridoDesdeMerma(row: MermaFields): number | null {
  const pct = row.perdidaProcesamientoPct;
  if (pct === undefined || pct === null || !Number.isFinite(Number(pct))) return null;
  const p = Math.min(100, Math.max(0, Number(pct)));
  if (p <= 0) return null;
  const qty = Number(row.cantidadPrimario) || 0;
  if (qty <= 0) return null;
  if (unidadPrimarioNormalizada(row.unidadPrimarioVisualizacion) !== "peso") return null;
  const kg = (qty * p) / 100;
  if (!Number.isFinite(kg)) return null;
  return Math.round(kg * 10000) / 10000;
}

/** Para tareas en cola (`Record`) del procesador / operario. */
export function desperdicioKgSugeridoDesdeMermaLoose(t: Record<string, unknown>): number | null {
  const unidad = unidadPrimarioNormalizada(t.unidadPrimarioVisualizacion as string | undefined);
  if (unidad === undefined) return null;
  return desperdicioKgSugeridoDesdeMerma({
    cantidadPrimario: Number(t.cantidadPrimario) || 0,
    unidadPrimarioVisualizacion: unidad,
    perdidaProcesamientoPct:
      t.perdidaProcesamientoPct === undefined || t.perdidaProcesamientoPct === null
        ? undefined
        : Number(t.perdidaProcesamientoPct),
  });
}

export function stringKgInicialDesperdicio(kg: number | null): string {
  if (kg === null || !Number.isFinite(kg) || kg < 0) return "0";
  return String(kg);
}
