/**
 * Pedidos al webhook n8n usan **un solo proveedor** por cuenta, identificado por el ID del documento
 * en Firestore: `clientes/{idCliente}/providers/{PEDIDO_PROVEEDOR_DOCUMENT_ID}`.
 *
 * Nombre, código (base36) y teléfono se leen siempre de ese documento (pantalla Proveedores).
 */
export const PEDIDO_PROVEEDOR_DOCUMENT_ID = "ZJ2RnOBr5HSkqrz0pfXH";

/** URL del webhook en n8n (la usa la ruta API del servidor). */
export const PEDIDO_PROVEEDOR_WEBHOOK_URL =
  "https://polariatech.app.n8n.cloud/webhook/pedido-proveedor";
