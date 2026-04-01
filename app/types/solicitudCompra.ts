/** Línea de solicitud (peso por producto del catálogo). */
export interface SolicitudLineItem {
  catalogoProductId: string;
  pesoKg: number;
  titleSnapshot: string;
  skuSnapshot?: string;
  codeSnapshot?: string;
}

export interface SolicitudCompra {
  id?: string;
  codeCuenta: string;
  numericId: number;
  /** Ej. SOL-0001 */
  numero: string;
  proveedorId: string;
  proveedorCode?: string;
  proveedorNombre: string;
  fecha: string;
  estado: string;
  lineItems: SolicitudLineItem[];
  createdAt: number;
}
