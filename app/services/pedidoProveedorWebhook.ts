import type { SolicitudLineItem } from "@/app/types/solicitudCompra";
import type { ProveedorPedidoSnapshot } from "@/app/services/pedidoProveedorResolve";

/**
 * Envía el pedido al webhook n8n vía ruta interna (evita CORS desde el navegador).
 * Los datos del proveedor vienen de Firestore (resueltos antes de llamar).
 */
export async function postPedidoProveedorWebhook(params: {
  idCliente: string;
  codeCuenta: string;
  lineItems: SolicitudLineItem[];
  proveedor: ProveedorPedidoSnapshot;
  estado?: string;
}): Promise<void> {
  const { proveedor } = params;
  const res = await fetch("/api/pedido-proveedor", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      idcliente: params.idCliente,
      codeCuenta: params.codeCuenta,
      lineItems: params.lineItems,
      estado: params.estado,
      proveedor_nombre: proveedor.proveedor_nombre,
      proveedorCode: proveedor.proveedorCode,
      proveedorId: proveedor.proveedorId,
      telefono: proveedor.telefono,
    }),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    const msg = data?.error?.trim();
    throw new Error(msg || "No se pudo enviar el pedido al proveedor (webhook).");
  }
}
