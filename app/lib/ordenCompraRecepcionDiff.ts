import type { OrdenCompra, OrdenCompraRecepcionLinea } from "@/app/types/ordenCompra";
import { formatKgEs } from "@/app/lib/decimalEs";

export type LineaRecepcionDiff = {
  catalogoProductId: string;
  titleSnapshot: string;
  pedidoLabel: string;
  recibidoLabel: string;
  ok: boolean;
};

function idEq(a: string | undefined, b: string | undefined): boolean {
  return String(a ?? "").trim() === String(b ?? "").trim();
}

/**
 * La recepción se guarda en el mismo orden que `lineItems`. Si solo se busca por
 * `catalogoProductId`, líneas duplicadas o ids repetidos hacen que `find` devuelva
 * siempre la primera y el resto quede en «recibido 0».
 */
function pickRecLine(
  recLines: OrdenCompraRecepcionLinea[],
  li: { catalogoProductId: string },
  idx: number,
): OrdenCompraRecepcionLinea | null {
  const atIdx = recLines[idx];
  if (atIdx && idEq(atIdx.catalogoProductId, li.catalogoProductId)) {
    return atIdx;
  }
  const found = recLines.find((r) => idEq(r.catalogoProductId, li.catalogoProductId));
  return found ?? null;
}

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

  const recLines = rec.lineas ?? [];

  const lineasDiff = (orden.lineItems ?? []).map((li, idx) => {
    const recLine = pickRecLine(recLines, li, idx);

    const pedidoKg =
      li.pesoKg != null && Number.isFinite(Number(li.pesoKg)) && Number(li.pesoKg) > 0
        ? Number(li.pesoKg)
        : null;

    const pedidoLabel =
      pedidoKg != null ? `${formatKgEs(pedidoKg)} kg` : `${Number(li.cantidad) || 0} u.`;

    let recNum: number;
    let recibidoLabel: string;

    if (pedidoKg != null) {
      recNum = recLine
        ? Number(recLine.pesoKgRecibido ?? recLine.cantidadRecibida ?? 0)
        : 0;
      recibidoLabel = `${formatKgEs(recNum)} kg`;
    } else {
      const cr = recLine ? Number(recLine.cantidadRecibida ?? 0) : 0;
      const pkg =
        recLine != null &&
        recLine.pesoKgRecibido != null &&
        Number.isFinite(Number(recLine.pesoKgRecibido))
          ? Number(recLine.pesoKgRecibido)
          : null;
      if (pkg != null && pkg > 0) {
        recNum = pkg;
        recibidoLabel = `${formatKgEs(recNum)} kg`;
      } else {
        recNum = Math.floor(cr);
        recibidoLabel = `${recNum} u.`;
      }
    }

    let ok = false;
    if (pedidoKg != null) {
      ok = Math.abs(recNum - pedidoKg) < 1e-4;
    } else {
      ok = Math.floor(Number(recLine?.cantidadRecibida ?? 0)) === (Number(li.cantidad) || 0);
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
