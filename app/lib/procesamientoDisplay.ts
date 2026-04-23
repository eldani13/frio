import type { Catalogo } from "@/app/types/catalogo";
import type { SolicitudProcesamiento } from "@/app/types/solicitudProcesamiento";
import { formatEstimadoUnidadesSecundario, unidadVisualizacionDe } from "@/lib/catalogoProcesamiento";
import { etiquetaUnidadVisualizacion } from "@/lib/unidadVisualizacionCatalogo";

export function primarioCatalogoPorId(
  productos: Catalogo[] | undefined,
  productId: string | undefined,
): Catalogo | undefined {
  const id = String(productId ?? "").trim();
  if (!id || !productos?.length) return undefined;
  return productos.find((x) => String(x.id ?? "").trim() === id);
}

function formatQtyPrimario(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return Number.isInteger(n) ? String(n) : n.toLocaleString("es-CO", { maximumFractionDigits: 6 });
}

/**
 * Modo de insumo de la orden: el guardado en la solicitud, o el del catálogo del primario si falta (órdenes viejas).
 */
export function modoStockPrimarioProcesamiento(
  row: Pick<SolicitudProcesamiento, "unidadPrimarioVisualizacion" | "productoPrimarioId">,
  primarioCatalogo?: Catalogo | null,
): "peso" | "cantidad" {
  const u = row.unidadPrimarioVisualizacion;
  if (u === "peso" || u === "cantidad") return u;
  if (primarioCatalogo) return unidadVisualizacionDe(primarioCatalogo);
  return "peso";
}

/**
 * Texto único para UI: cantidad + unidad real (kg o etiqueta de catálogo: lonchas, cajas, etc.).
 */
export function cantidadPrimarioProcesamientoTexto(
  row: Pick<SolicitudProcesamiento, "cantidadPrimario" | "unidadPrimarioVisualizacion" | "productoPrimarioId">,
  primarioCatalogo?: Catalogo | null,
): string {
  const n = Number(row.cantidadPrimario);
  if (!Number.isFinite(n)) return "—";
  const mode = modoStockPrimarioProcesamiento(row, primarioCatalogo ?? undefined);
  const q = formatQtyPrimario(n);
  if (mode === "peso") return `${q} kg`;
  const lab = primarioCatalogo?.unidadVisualizacion
    ? etiquetaUnidadVisualizacion(String(primarioCatalogo.unidadVisualizacion))
    : "ud.";
  return `${q} ${lab}`;
}

/** Estimado de unidades secundario sin tilde ni redondeo forzado a entero. */
export function estimadoUnidadesSecundarioTexto(est: number | null | undefined): string {
  if (est === null || est === undefined || !Number.isFinite(Number(est))) return "—";
  return `${formatEstimadoUnidadesSecundario(Number(est))} u.`;
}
