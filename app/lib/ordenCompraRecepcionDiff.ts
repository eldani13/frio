import type { OrdenCompra } from "@/app/types/ordenCompra";
import { formatKgEs } from "@/app/lib/decimalEs";

export type LineaRecepcionDiff = {
  catalogoProductId: string;
  titleSnapshot: string;
  pedidoLabel: string;
  recibidoLabel: string;
  ok: boolean;
};

/** Para listados (proveedor): comparación pedido vs ingreso custodio. */
export function buildLineasRecepcionDiff(orden: OrdenCompra): {
  lineasDiff: LineaRecepcionDiff[];
  adicionales: string[];
  tieneRecepcion: boolean;
} {
  const rec = orden.recepcion;
  if (!rec) {
    return { lineasDiff: [], adicionales: [], tieneRecepcion: false };
  }

  const lineasDiff = (orden.lineItems ?? []).map((li) => {
    const recLine = rec.lineas?.find((r) => r.catalogoProductId === li.catalogoProductId);
    const pedidoKg =
      li.pesoKg != null && Number.isFinite(Number(li.pesoKg)) && Number(li.pesoKg) > 0
        ? Number(li.pesoKg)
        : null;

    const recNum =
      recLine != null
        ? pedidoKg != null
          ? Number(recLine.pesoKgRecibido ?? recLine.cantidadRecibida ?? 0)
          : Number(recLine.cantidadRecibida ?? 0)
        : 0;

    const pedidoLabel =
      pedidoKg != null ? `${formatKgEs(pedidoKg)} kg` : `${Number(li.cantidad) || 0} u.`;
    const recibidoLabel =
      pedidoKg != null ? `${formatKgEs(recNum)} kg` : `${Math.floor(recNum)} u.`;

    let ok = false;
    if (pedidoKg != null) {
      ok = Math.abs(recNum - pedidoKg) < 1e-4;
    } else {
      ok = Math.floor(recNum) === (Number(li.cantidad) || 0);
    }

    return {
      catalogoProductId: li.catalogoProductId,
      titleSnapshot: li.titleSnapshot || "—",
      pedidoLabel,
      recibidoLabel,
      ok,
    };
  });

  const adicionales = (rec.lineasAdicionales ?? []).map((a) => {
    const kg = formatKgEs(Number(a.pesoKgRecibido));
    return `${a.titleSnapshot} · ${kg} kg (adicional)`;
  });

  return { lineasDiff, adicionales, tieneRecepcion: true };
}

