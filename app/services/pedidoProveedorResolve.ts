import { PEDIDO_PROVEEDOR_DOCUMENT_ID } from "@/app/config/pedidoProveedorIntegracion";
import { ProviderService } from "@/app/services/providerService";

/** Datos del proveedor listos para el webhook y para copiar en solicitud/OC. */
export type ProveedorPedidoSnapshot = {
  proveedorId: string;
  proveedorCode: string;
  proveedor_nombre: string;
  telefono: string;
};

/**
 * Carga el proveedor fijo de integración desde Firestore (misma cuenta / codeCuenta).
 */
export async function resolveProveedorPedidoIntegracion(
  idCliente: string,
  codeCuenta: string,
): Promise<ProveedorPedidoSnapshot> {
  const docId = PEDIDO_PROVEEDOR_DOCUMENT_ID.trim();
  if (!docId) {
    throw new Error("Falta PEDIDO_PROVEEDOR_DOCUMENT_ID en pedidoProveedorIntegracion.ts.");
  }

  const p = await ProviderService.getById(idCliente, docId);
  if (!p?.id) {
    throw new Error(
      "No se encontró el proveedor de pedidos en la base de datos. Revisá el ID en pedidoProveedorIntegracion.ts y que exista en Proveedores.",
    );
  }

  const cuentaDoc = (p.codeCuenta ?? "").trim();
  const cuentaSesion = (codeCuenta ?? "").trim();
  if (cuentaDoc && cuentaSesion && cuentaDoc !== cuentaSesion) {
    throw new Error("El proveedor de integración no pertenece a esta cuenta (codeCuenta).");
  }

  const telefono = (p.telefono ?? "").trim();
  if (!telefono) {
    throw new Error(
      "El proveedor de pedidos no tiene teléfono en la base de datos. Cargalo en Proveedores.",
    );
  }

  const proveedorCode = String(p.code ?? "").trim();
  if (!proveedorCode) {
    throw new Error("El proveedor de pedidos no tiene código en la base de datos.");
  }

  const proveedor_nombre = (p.name ?? p.nombre ?? "").trim();
  if (!proveedor_nombre) {
    throw new Error("El proveedor de pedidos no tiene nombre en la base de datos.");
  }

  return {
    proveedorId: p.id,
    proveedorCode,
    proveedor_nombre,
    telefono,
  };
}
