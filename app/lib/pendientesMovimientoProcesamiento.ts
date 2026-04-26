import type { BodegaOrder, Slot } from "@/app/interfaces/bodega";
import type { SolicitudProcesamiento } from "@/app/types/solicitudProcesamiento";
import { normalizeProcesamientoEstado } from "@/app/types/solicitudProcesamiento";
import { kgSobranteParaDevolucionMapa } from "@/app/lib/sobranteKg";
import { findSlotPrimarioParaDevolverDesperdicio } from "@/lib/procesamientoInventarioBodega";

export type PendienteMovimientoKind = "desperdicio" | "procesado";

export type PendienteMovimientoBodega = {
  kind: PendienteMovimientoKind;
  row: SolicitudProcesamiento;
};

function ordenPendienteProcesamiento(
  orders: BodegaOrder[],
  clientId: string,
  solicitudId: string,
  kind: PendienteMovimientoKind,
): boolean {
  const cid = String(clientId ?? "").trim();
  const sid = String(solicitudId ?? "").trim();
  return orders.some((o) => {
    if (o.type !== "a_bodega" || o.sourceZone !== "procesamiento" || !o.procesamientoOrigen) return false;
    const po = o.procesamientoOrigen;
    if (String(po.cuentaClientId ?? "").trim() !== cid || String(po.solicitudId ?? "").trim() !== sid) {
      return false;
    }
    const rol = po.rolDevolucion ?? "procesado";
    return rol === kind;
  });
}

/** El secundario ya quedó ubicado en un casillero (orden ejecutada por operario). */
export function slotTieneProcesadoUbicado(slots: Slot[], clientId: string, solicitudId: string): boolean {
  const cid = String(clientId ?? "").trim();
  const sid = String(solicitudId ?? "").trim();
  if (!cid || !sid) return false;
  return slots.some((s) => {
    if (String(s.client ?? "").trim() !== cid) return false;
    if (String(s.procesamientoSolicitudId ?? "").trim() !== sid) return false;
    return String(s.procesamientoSecundarioTitulo ?? "").trim() !== "";
  });
}

/**
 * Orden cuyo procesador ya cerró el trabajo (**Pendiente**) o legado «Terminado» con cierre desde procesador,
 * y aún puede faltar traslado a almacenamiento.
 */
function esSolicitudPostCierreProcesador(row: SolicitudProcesamiento): boolean {
  const e = normalizeProcesamientoEstado(row.estado);
  if (e === "Pendiente") return true;
  if (e === "Terminado" && row.cierreDesdeProcesador === true) return true;
  return false;
}

/** Secundario ubicado en casillero y sobrante reintegrado (si aplica). */
export function procesamientoUbicacionCompletaEnMapa(slots: Slot[], row: SolicitudProcesamiento): boolean {
  const cid = String(row.clientId ?? "").trim();
  const sid = String(row.id ?? "").trim();
  if (!cid || !sid) return false;
  const sk = kgSobranteParaDevolucionMapa(row);
  const okDesp = sk <= 0 || desperdicioDevueltoEnMapa(slots, cid, sid);
  const okProc = slotTieneProcesadoUbicado(slots, cid, sid);
  return okDesp && okProc;
}

/** Ya se sumó el kg de sobrante al casillero del primario (movimiento ejecutado). */
export function desperdicioDevueltoEnMapa(slots: Slot[], clientId: string, solicitudId: string): boolean {
  const cid = String(clientId ?? "").trim();
  const sid = String(solicitudId ?? "").trim();
  if (!cid || !sid) return false;
  return slots.some((s) => {
    if (String(s.client ?? "").trim() !== cid) return false;
    return String(s.procesamientoDesperdicioDevueltoSolicitudId ?? "").trim() === sid;
  });
}

/**
 * Tareas informativas: orden terminada y aún falta movimiento a bodega (sobrante al primario y/o procesado al destino).
 */
export function listPendientesMovimientoBodega(
  solicitudes: SolicitudProcesamiento[],
  slots: Slot[],
  orders: BodegaOrder[],
): PendienteMovimientoBodega[] {
  const out: PendienteMovimientoBodega[] = [];
  const postCierre = solicitudes.filter(esSolicitudPostCierreProcesador);
  for (const row of postCierre) {
    const cid = String(row.clientId ?? "").trim();
    const sid = String(row.id ?? "").trim();
    if (!cid || !sid) continue;

    const sk = kgSobranteParaDevolucionMapa(row);
    if (
      sk > 0 &&
      !desperdicioDevueltoEnMapa(slots, cid, sid) &&
      !ordenPendienteProcesamiento(orders, cid, sid, "desperdicio") &&
      findSlotPrimarioParaDevolverDesperdicio(slots, row)
    ) {
      out.push({ kind: "desperdicio", row });
    }

    if (
      !slotTieneProcesadoUbicado(slots, cid, sid) &&
      !ordenPendienteProcesamiento(orders, cid, sid, "procesado")
    ) {
      out.push({ kind: "procesado", row });
    }
  }
  return out;
}
