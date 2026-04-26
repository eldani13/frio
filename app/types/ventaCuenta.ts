/** Línea de venta en curso (unidades, no peso). */
export interface VentaEnCursoLineItem {
  catalogoProductId?: string;
  titleSnapshot: string;
  cantidad: number;
}

/** Recepción en bodega (custodio) frente a la venta en transporte. */
export interface VentaRecepcionBodegaLinea {
  catalogoProductId?: string;
  titleSnapshot: string;
  /** Kg o unidades recibidas según lo registrado en ingreso. */
  cantidadRecibida: number;
}

export interface VentaRecepcionBodega {
  lineas: VentaRecepcionBodegaLinea[];
  cerradaAt: number;
  cerradaPorUid: string;
  cerradaPorNombre?: string;
  sinDiferencias: boolean;
}

/** Orden de venta en `clientes/{clientId}/ordenesVenta/{id}`. */
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
  /** Código de cuenta (sesión) al crear el documento. */
  codeCuenta?: string;
  /** ms o desde Timestamp Firestore; sirve para asignar consecutivo a ventas sin numericId. */
  createdAt?: number;
  /** Bodega interna donde se toma el stock / se registra la venta (alta manual). */
  origenWarehouseId?: string;
  origenWarehouseNombre?: string;
  /** Bodega interna destino cuando la venta está en «Transporte» hacia bodega. */
  destinoWarehouseId?: string;
  destinoWarehouseNombre?: string;
  recepcionBodega?: VentaRecepcionBodega;
}

/** Venta con cuenta dueña (listados globales custodio). */
export type VentaPendienteCartonaje = VentaEnCurso & { idClienteDueno: string };
