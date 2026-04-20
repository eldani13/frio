import type { Catalogo } from "@/app/types/catalogo";
import { unidadVisualizacionStockMode } from "@/lib/unidadVisualizacionCatalogo";

/** Producto de catálogo marcado como secundario (tipo). */
export function esCatalogoSecundario(p: Catalogo): boolean {
  return String(p.productType ?? "").trim().toLowerCase() === "secundario";
}

/** Unidad de visualización del catálogo (cantidad vs peso) para stock y procesamiento. */
export function unidadVisualizacionDe(p: Catalogo): "cantidad" | "peso" {
  const fromField = unidadVisualizacionStockMode(p.unidadVisualizacion);
  if (fromField === "peso") return "peso";
  const w = String(p.weightUnit ?? "").trim().toLowerCase();
  if (w === "peso") return "peso";
  if (w.includes("kg") || w === "g") return "peso";
  return "cantidad";
}

/** Base fija (g) usada en catálogo al definir secundarios por peso neto por unidad. */
export const REGLA_PRIMARIO_BASE_GRAMOS = 1000;

/** Lee regla de conversión del documento secundario (campos nuevos o legacy). */
export function reglaConversionDesdeCatalogoSecundario(s: Catalogo): {
  cantidadPrimario: number;
  unidadesSecundario: number;
} | null {
  const a = Number(s.reglaConversionCantidadPrimario ?? s.conversionCantidadPrimario);
  const b = Number(s.reglaConversionUnidadesSecundario ?? s.conversionUnidadesSecundario);
  if (!Number.isFinite(a) || a <= 0 || !Number.isFinite(b) || b <= 0) return null;
  return { cantidadPrimario: a, unidadesSecundario: b };
}

/** Gramos por unidad de secundario a partir de regla a (primario, típ. kg) → b (uds.). */
export function gramosPorUnidadDesdeReglaConversion(a: number, b: number): number | null {
  if (!Number.isFinite(a) || a <= 0 || !Number.isFinite(b) || b <= 0) return null;
  return (REGLA_PRIMARIO_BASE_GRAMOS * a) / b;
}

export function mermaPctDesdeCatalogoSecundario(s: Catalogo): number | null {
  const n = Number(s.mermaPct);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.min(100, Math.max(0, n));
}

export function catalogosPrimarios(productos: Catalogo[]): Array<Catalogo & { id: string }> {
  return productos.filter((p): p is Catalogo & { id: string } =>
    Boolean(p.id?.trim()) && !esCatalogoSecundario(p),
  );
}

/** Secundarios del catálogo cuyo «Incluido primario» apunta al id dado. */
export function catalogosSecundariosDePrimario(
  productos: Catalogo[],
  primarioId: string,
): Array<Catalogo & { id: string }> {
  const pid = primarioId.trim();
  if (!pid) return [];
  return productos.filter((p): p is Catalogo & { id: string } =>
    Boolean(p.id?.trim()) &&
    esCatalogoSecundario(p) &&
    String(p.includedPrimarioCatalogoId ?? "").trim() === pid,
  );
}

/**
 * Unidades de secundario esperadas según regla de tres del catálogo del secundario.
 * `cantidadTransformarPrimario` en la misma unidad que `reglaCantidadPrimario` (p. ej. kg o unidades del primario).
 */
export function unidadesSecundarioPorRegla(
  cantidadTransformarPrimario: number,
  reglaCantidadPrimario?: number,
  reglaUnidadesSecundario?: number,
): number | null {
  const a = Number(reglaCantidadPrimario);
  const b = Number(reglaUnidadesSecundario);
  const q = Number(cantidadTransformarPrimario);
  if (!Number.isFinite(q) || q <= 0 || !Number.isFinite(a) || a <= 0 || !Number.isFinite(b) || b <= 0) return null;
  const raw = (q / a) * b;
  return Number.isFinite(raw) ? raw : null;
}

/** Máximo de unidades de secundario (entero) según stock de primario y una regla de referencia (a → b). */
export function maxUnidadesSecundarioDesdeStock(
  stockPrimario: number,
  reglaCantidadPrimario?: number,
  reglaUnidadesSecundario?: number,
): number | null {
  const u = unidadesSecundarioPorRegla(stockPrimario, reglaCantidadPrimario, reglaUnidadesSecundario);
  if (u === null || !Number.isFinite(u)) return null;
  return Math.max(0, Math.floor(u + 1e-9));
}

/**
 * Reduce el estimado teórico de unidades de secundario según merma (%).
 * `perdidaPct` en 0–100: porcentaje que se resta del resultado teórico (p. ej. 5 → se conserva el 95 %).
 */
export function estimadoSecundarioAplicarPerdidaPct(teorico: number | null, perdidaPct: number): number | null {
  if (teorico === null || !Number.isFinite(teorico) || teorico < 0) return null;
  const pRaw = Number(perdidaPct);
  if (!Number.isFinite(pRaw) || pRaw <= 0) {
    return Math.round(teorico);
  }
  const p = Math.min(100, Math.max(0, pRaw));
  const r = teorico * (1 - p / 100);
  return Number.isFinite(r) ? Math.round(r) : null;
}
