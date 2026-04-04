/** Estados manuales de la orden de compra (persistidos en Firestore). */
export const ORDEN_COMPRA_ESTADOS = [
  "Iniciado",
  "En curso",
  "Transporte",
  "Cerrado(ok)",
  "Cerrado(no ok)",
] as const;

export type OrdenCompraEstado = (typeof ORDEN_COMPRA_ESTADOS)[number];

/** Color de badge para listados y detalle (incluye valores históricos). */
export function ordenCompraEstadoBadgeClass(estado: string): string {
  const e = estado.trim();
  if (e === "Cerrado(ok)" || e === "Terminado") return "bg-emerald-100 text-emerald-800";
  if (e === "Cerrado(no ok)") return "bg-rose-100 text-rose-800";
  if (e === "Transporte") return "bg-amber-100 text-amber-900";
  if (e === "Iniciado") return "bg-slate-100 text-slate-800";
  if (e === "En curso") return "bg-sky-100 text-sky-900";
  if (e === "Enviada") return "bg-violet-100 text-violet-800";
  return "bg-slate-100 text-slate-700";
}

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
  /** Valores típicos: {@link ORDEN_COMPRA_ESTADOS}; pueden existir `"Enviada"`, `"Terminado"`, etc. en documentos antiguos. */
  estado: string;
  lineItems: OrdenCompraLineItem[];
  createdAt: number;
  /** Operador de cuenta: envío a bodega vinculada a la cuenta. */
  destinoTipo?: "interna" | "externa";
  destinoWarehouseId?: string;
  destinoWarehouseNombre?: string;
  enviadaAt?: number;
}
