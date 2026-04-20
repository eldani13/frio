import type { VentaEnCursoLineItem } from "@/app/types/ventaCuenta";

/** Subcolección `clientes/{cid}/ordenesVenta/{ventaId}/viajesTransporte/{id}`. */
export type ViajeTransporteEstado = "En curso" | "Entregado";

export interface ViajeLineaEntrega {
  catalogoProductId?: string;
  titleSnapshot: string;
  cantidadEsperada: number;
  cantidadEntregada: number;
}

export interface ViajeVentaTransporte {
  id: string;
  numericId: number;
  numero: string;
  estado: ViajeTransporteEstado;
  /** Copia de líneas de la venta al crear el viaje. */
  lineItemsEsperados: VentaEnCursoLineItem[];
  createdAt: number;
  lineItemsEntregados?: ViajeLineaEntrega[];
  /** true = conforme con lo esperado. */
  entregaConforme?: boolean;
  evidenciaFotoUrl?: string;
  /** PNG data URL o URL en Storage. */
  firmaDataUrl?: string;
  descripcionIncidencia?: string;
  entregadoAt?: number;
  entregadoPorUid?: string;
  entregadoPorNombre?: string;
  /** Copia del estado aplicado a la orden de venta al cerrar (trazabilidad). */
  ventaEstadoResultante?: "Cerrado(ok)" | "Cerrado(no ok)";
}

export type ViajeVentaTransporteConContext = ViajeVentaTransporte & {
  idClienteDueno: string;
  ventaId: string;
  ventaNumero: string;
  /** Kg esperados para la venta (suma por línea: peso catálogo × cantidad, o cantidad si no hay peso). */
  kgTotalEstimado?: number;
  /** Nombre del comprador en la orden de venta (legible en listados). */
  ventaCompradorNombre: string;
  /** Código de cuenta (ej. MIT00), si la venta lo tiene. */
  ventaCodeCuenta?: string;
  /** Bodega destino de la venta, si aplica. */
  ventaDestinoNombre?: string;
};
