/** Línea de orden vinculada a un documento del catálogo (productos). */
export interface OrdenCompraLineItem {
  catalogoProductId: string;
  cantidad: number;
  /** Kilogramos totales de esta línea (opcional en documentos antiguos). */
  pesoKg?: number;
  /** Copia al crear la orden para listados aunque el catálogo cambie. */
  titleSnapshot: string;
  skuSnapshot?: string;
  codeSnapshot?: string;
}

export interface OrdenCompra {
  id?: string;
  codeCuenta: string;
  numericId: number;
  /** Ej. OC-0001 */
  numero: string;
  proveedorId: string;
  /** Código base36 del proveedor al momento de la orden (ej. 0001). */
  proveedorCode?: string;
  proveedorNombre: string;
  fecha: string;
  /** `"En curso"` | `"Terminado"` (órdenes antiguas pueden tener otros valores). */
  estado: string;
  lineItems: OrdenCompraLineItem[];
  createdAt: number;
}
