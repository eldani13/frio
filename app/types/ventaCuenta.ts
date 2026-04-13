/** Línea de venta en curso (unidades, no peso). */
export interface VentaEnCursoLineItem {
  catalogoProductId?: string;
  titleSnapshot: string;
  cantidad: number;
}

/** Venta en curso — vista operador de cuenta (preparación; persistencia pendiente). */
export interface VentaEnCurso {
  id: string;
  numero: string;
  /** Para ordenar como OC (más reciente primero). */
  numericId: number;
  /** Documento en `clientes/{id}/compradores` (si aplica). */
  compradorId?: string;
  compradorNombre: string;
  fecha: string;
  /** Mismos valores que {@link ORDEN_COMPRA_ESTADOS} en órdenes de compra. */
  estado: string;
  lineItems: VentaEnCursoLineItem[];
}
