import type { Timestamp } from "firebase/firestore";

export const PROCESAMIENTO_ESTADOS = ["Iniciado", "En curso", "Terminado"] as const;
export type ProcesamientoEstado = (typeof PROCESAMIENTO_ESTADOS)[number];

export function normalizeProcesamientoEstado(v: string): ProcesamientoEstado {
  const t = String(v ?? "").trim();
  if (t === "En curso" || t === "Terminado" || t === "Iniciado") return t;
  return "Iniciado";
}

/** Solicitud de procesamiento (cuenta → bodega interna). */
export type SolicitudProcesamiento = {
  id: string;
  clientId: string;
  codeCuenta: string;
  clientName: string;
  creadoPorNombre: string;
  creadoPorUid: string;
  numero: string;
  numericId: number;
  productoPrimarioId: string;
  productoPrimarioTitulo: string;
  productoSecundarioId: string;
  productoSecundarioTitulo: string;
  cantidadPrimario: number;
  /** Tomado del catálogo del primario al crear la solicitud. */
  unidadPrimarioVisualizacion?: "cantidad" | "peso" | string;
  /** Bodega interna elegida al crear (Firestore `warehouses`). */
  warehouseId?: string;
  /** Estimación según regla de tres al momento del alta (regla cargada por el operador de cuenta). */
  estimadoUnidadesSecundario?: number | null;
  /** Regla usada al crear la solicitud: `cantidadPrimario` de insumo → `unidadesSecundario` esperadas. */
  reglaConversionCantidadPrimario?: number;
  reglaConversionUnidadesSecundario?: number;
  /** % de merma (0–100) al crear la solicitud: tomado del catálogo del secundario (`mermaPct`). */
  perdidaProcesamientoPct?: number;
  fecha: string;
  estado: ProcesamientoEstado;
  createdAt?: Timestamp | null;
  /** Operario o procesador de bodega asignado por jefe/admin (solo esa persona puede pasar Iniciado → En curso). */
  operarioBodegaUid?: string;
  operarioBodegaNombre?: string;
};

export function procesamientoEstadoBadgeClass(estado: string): string {
  const e = normalizeProcesamientoEstado(estado);
  if (e === "Terminado") return "bg-slate-200 text-slate-800";
  if (e === "En curso") return "bg-amber-100 text-amber-900";
  return "bg-sky-100 text-sky-900";
}
