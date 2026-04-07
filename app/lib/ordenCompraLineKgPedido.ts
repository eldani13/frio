import type { OrdenCompraLineItem } from "@/app/types/ordenCompra";

/**
 * Kilogramos pedidos en una línea de OC: `pesoKg` si existe; si no, `cantidad`
 * (integraciones suelen persistir el kg solo ahí — ver `pedido-proveedor/route.ts`).
 */
export function kilosPedidoLineItem(li: OrdenCompraLineItem): number {
  const pk = Number(li.pesoKg);
  const hasPesoKg =
    li.pesoKg != null && String(li.pesoKg).trim() !== "" && Number.isFinite(pk) && pk > 0;
  const cantRaw = Number(li.cantidad);
  const hasCantidad = Number.isFinite(cantRaw) && cantRaw > 0;
  if (hasPesoKg) return pk;
  if (hasCantidad) return cantRaw;
  return 0;
}
