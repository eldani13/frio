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
  if (e === "Recibida(ok)") return "bg-emerald-100 text-emerald-900";
  if (e === "Recibida(con diferencias)") return "bg-amber-100 text-amber-950";
  return "bg-slate-100 text-slate-700";
}

/** Línea de recepción guardada al cerrar (custodio / bodega). */
export interface OrdenCompraRecepcionLinea {
  catalogoProductId: string;
  cantidadRecibida: number;
  pesoKgRecibido?: number;
}

/** Producto ingresado en bodega que no estaba en la OC (custodio). */
export interface OrdenCompraRecepcionLineaAdicional {
  titleSnapshot: string;
  catalogoProductId?: string;
  pesoKgRecibido: number;
  temperaturaRegistrada?: number;
}

/** Registro de recepción física frente a la OC. */
export interface OrdenCompraRecepcion {
  lineas: OrdenCompraRecepcionLinea[];
  /** Cajas/productos extra respecto al pedido (custodio). */
  lineasAdicionales?: OrdenCompraRecepcionLineaAdicional[];
  notas?: string;
  cerradaAt: number;
  cerradaPorUid: string;
  cerradaPorNombre?: string;
  /** true si cantidad recibida = cantidad pedida en todas las líneas. */
  sinDiferencias: boolean;
}

/** Línea de orden vinculada a un documento del catálogo (productos). */
export interface OrdenCompraLineItem {
  catalogoProductId: string;
  /** Unidades; en líneas pedidas solo por peso suele ser 0 y el pedido va en {@link pesoKg}. */
  cantidad: number;
  /** Kilogramos pedidos en la línea (formulario nuevo); documentos antiguos pueden tener solo cantidad. */
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
  /** Fecha acordada de llegada a bodega (operador, antes de poner en transporte). */
  fechaLlegadaEstipulada?: string;
  recepcion?: OrdenCompraRecepcion;
}
