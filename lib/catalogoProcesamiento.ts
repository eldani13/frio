import type { Catalogo } from "@/app/types/catalogo";

/** Producto de catálogo marcado como secundario (tipo). */
export function esCatalogoSecundario(p: Catalogo): boolean {
  return String(p.productType ?? "").trim().toLowerCase() === "secundario";
}

/** Unidad de visualización del catálogo (cantidad vs peso). */
export function unidadVisualizacionDe(p: Catalogo): "cantidad" | "peso" {
  const u = p.unidadVisualizacion;
  if (u === "cantidad" || u === "peso") return u;
  const w = String(p.weightUnit ?? "").trim().toLowerCase();
  if (w === "peso") return "peso";
  if (w === "cantidad") return "cantidad";
  if (w.includes("kg") || w === "g") return "peso";
  return "cantidad";
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
  return (q / a) * b;
}
