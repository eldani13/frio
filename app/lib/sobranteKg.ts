import { unidadPrimarioNormalizada } from "@/app/lib/desperdicioKgSugerido";

/** Parte después del entero del estimado de unidades de secundario (p. ej. 2,576… → 0,576…). */
export function parteFraccionariaUnidadesSecundario(est: number): number {
  if (!Number.isFinite(est) || est <= 0) return 0;
  const whole = Math.floor(est + 1e-9);
  const frac = est - whole;
  return frac > 1e-9 ? Math.round(frac * 1e8) / 1e8 : 0;
}

/**
 * Kg de primario equivalentes a la fracción de unidades de secundario que no forman una caja entera.
 * Regla del catálogo al crear la orden: `a` de insumo primario (p. ej. 1 kg) → `b` unidades de secundario.
 */
export function kgPrimarioDesdeFraccionUnidadesSecundario(
  estimadoUnidades: number | null | undefined,
  reglaCantidadPrimario?: number,
  reglaUnidadesSecundario?: number,
): number {
  const est = Number(estimadoUnidades);
  const a = Number(reglaCantidadPrimario);
  const b = Number(reglaUnidadesSecundario);
  if (!Number.isFinite(est) || est <= 0 || !(a > 0) || !(b > 0)) return 0;
  const frac = parteFraccionariaUnidadesSecundario(est);
  if (frac <= 0) return 0;
  return Math.round((frac * a) / b * 10000) / 10000;
}

/** Unidades enteras de secundario que se ubican como resultado procesado en el mapa. */
export function unidadesSecundarioEnterasParaMapa(est: number | undefined | null): number {
  const v = Number(est);
  if (!Number.isFinite(v) || v <= 0) return 0;
  return Math.max(0, Math.floor(v + 1e-9));
}

/**
 * Kg de primario que deben volver del área de procesamiento al mapa (mismo producto):
 * parte decimal de la cantidad en peso y/o kg realmente descontados de bodega al pasar a «En curso».
 */
export function sobranteKgDesdeCantidadYDesconto(
  unidadPrimarioVisualizacion: string | undefined,
  cantidadPrimario: number,
  deductedKg: number,
): number {
  if (unidadPrimarioNormalizada(unidadPrimarioVisualizacion) !== "peso") return 0;
  const c = Number(cantidadPrimario) || 0;
  const d = Math.max(0, Number(deductedKg) || 0);
  if (!Number.isFinite(c) || !Number.isFinite(d) || c < 0) return 0;
  const fracC = Math.max(0, c - Math.floor(c + 1e-9));
  const fracD = Math.max(0, d - Math.floor(d + 1e-9));
  const excesoVsPedidoEntero = Math.max(0, d - Math.floor(c + 1e-9));
  const v = Math.max(fracC, fracD, excesoVsPedidoEntero);
  return Math.round(Math.max(0, v) * 10000) / 10000;
}

/**
 * Suma el sobrante por fracción de kg en el mapa y el sobrante por fracción de **unidades** del estimado
 * de secundario (regla a→b), para devolver primario al mapa en una sola orden de traslado.
 */
export function sobranteKgTotalTrasEnCurso(
  unidadPrimarioVisualizacion: string | undefined,
  cantidadPrimario: number,
  deductedKg: number,
  estimadoUnidadesSecundario?: number | null,
  reglaCantidadPrimario?: number,
  reglaUnidadesSecundario?: number,
): number {
  const s1 = sobranteKgDesdeCantidadYDesconto(unidadPrimarioVisualizacion, cantidadPrimario, deductedKg);
  const s2 = kgPrimarioDesdeFraccionUnidadesSecundario(
    estimadoUnidadesSecundario,
    reglaCantidadPrimario,
    reglaUnidadesSecundario,
  );
  return Math.round(Math.max(0, s1 + s2) * 10000) / 10000;
}

export function kgSobranteParaDevolucionMapa(row: {
  sobranteKg?: number | null;
  unidadPrimarioVisualizacion?: string;
}): number {
  if (unidadPrimarioNormalizada(row.unidadPrimarioVisualizacion) !== "peso") return 0;
  const s = Number(row.sobranteKg);
  if (!Number.isFinite(s) || s <= 1e-9) return 0;
  return Math.round(s * 10000) / 10000;
}
