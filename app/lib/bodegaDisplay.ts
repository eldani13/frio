import type { Client, Slot } from "@/app/interfaces/bodega";
import type { SolicitudProcesamiento } from "@/app/types/solicitudProcesamiento";
import { coercePiezasFromUnknown } from "@/lib/coerceBodegaKg";

export function clientLabelFromList(
  clientField: string,
  clients: Pick<Client, "id" | "name">[],
): string {
  if (!clientField?.trim()) return "—";
  const t = clientField.trim();
  const byId = clients.find((c) => c.id === t);
  if (byId) return byId.name;
  const byName = clients.find((c) => c.name.trim() === t);
  if (byName) return byName.name;
  return clientField;
}

export function formatBoxQuantityKg(quantityKg: number | undefined): string {
  if (typeof quantityKg !== "number" || !Number.isFinite(quantityKg)) return "—";
  return `${quantityKg} kg`;
}

function formatNumberEs(n: number, maximumFractionDigits = 4): string {
  if (Number.isInteger(n)) return String(n);
  return n.toLocaleString("es-CO", { maximumFractionDigits });
}

export function slotLooksLikeProcesamiento(
  slot: Pick<Slot, "autoId" | "procesamientoSecundarioTitulo" | "procesamientoUnidadesSecundario">,
): boolean {
  if (slot.procesamientoSecundarioTitulo?.trim()) return true;
  if (
    typeof slot.procesamientoUnidadesSecundario === "number" &&
    Number.isFinite(slot.procesamientoUnidadesSecundario) &&
    slot.procesamientoUnidadesSecundario > 0
  ) {
    return true;
  }
  return !!slot.autoId?.trim().toUpperCase().startsWith("PROC-");
}

/** Título del producto secundario persistido o inferido del nombre «primario → secundario». */
export type SlotCantidadContext = {
  solicitudesTerminadas?: Pick<
    SolicitudProcesamiento,
    "id" | "clientId" | "numero" | "estimadoUnidadesSecundario"
  >[];
};

function resolverUnidadesSecundarioDesdeSolicitudes(
  slot: Pick<
    Slot,
    "procesamientoUnidadesSecundario" | "procesamientoSolicitudId" | "client" | "autoId"
  >,
  solicitudes: NonNullable<SlotCantidadContext["solicitudesTerminadas"]>,
): number | undefined {
  const direct = slot.procesamientoUnidadesSecundario;
  if (typeof direct === "number" && Number.isFinite(direct) && direct > 0) return direct;
  const cid = (slot.client || "").trim();
  const solId = (slot.procesamientoSolicitudId || "").trim();
  if (cid && solId) {
    const row = solicitudes.find((s) => s.clientId.trim() === cid && s.id === solId);
    const est = row?.estimadoUnidadesSecundario;
    if (typeof est === "number" && Number.isFinite(est) && est > 0) return est;
  }
  const aid = (slot.autoId || "").trim();
  const m = /^PROC-(.+)$/i.exec(aid);
  if (!m || !cid) return undefined;
  const numero = m[1];
  const row = solicitudes.find((s) => s.clientId.trim() === cid && s.numero === numero);
  const est = row?.estimadoUnidadesSecundario;
  if (typeof est === "number" && Number.isFinite(est) && est > 0) return est;
  return undefined;
}

export function secondaryTitleFromSlot(
  slot: Pick<Slot, "procesamientoSecundarioTitulo" | "name">,
): string | undefined {
  const t = slot.procesamientoSecundarioTitulo?.trim();
  if (t) return t;
  const n = slot.name || "";
  const parts = n.split(" → ");
  if (parts.length >= 2) {
    const last = parts[parts.length - 1]?.trim();
    return last || undefined;
  }
  return undefined;
}

/**
 * Cantidad visible en mapa / modal: para cajas de procesamiento prioriza unidades del secundario
 * y muestra el peso en kg entre paréntesis cuando existe.
 */
export function formatSlotCantidadDisplay(
  slot: Pick<
    Slot,
    | "quantityKg"
    | "piezas"
    | "procesamientoUnidadesSecundario"
    | "procesamientoSolicitudId"
    | "autoId"
    | "client"
  >,
  ctx?: SlotCantidadContext,
): string {
  const kgRaw = slot.quantityKg;
  const kg =
    typeof kgRaw === "number" && Number.isFinite(kgRaw) && kgRaw > 0 ? kgRaw : undefined;
  const kgParen = kg !== undefined ? ` (${formatNumberEs(kg)} kg)` : "";

  if (slotLooksLikeProcesamiento(slot)) {
    const u =
      ctx?.solicitudesTerminadas?.length
        ? resolverUnidadesSecundarioDesdeSolicitudes(slot, ctx.solicitudesTerminadas)
        : typeof slot.procesamientoUnidadesSecundario === "number" &&
            Number.isFinite(slot.procesamientoUnidadesSecundario) &&
            slot.procesamientoUnidadesSecundario > 0
          ? slot.procesamientoUnidadesSecundario
          : undefined;
    if (typeof u === "number" && Number.isFinite(u) && u > 0) {
      return `${formatNumberEs(u)} u.${kgParen}`;
    }
    const pz = coercePiezasFromUnknown(slot.piezas);
    if (pz !== undefined && pz > 0) {
      return `${formatNumberEs(pz)} u.${kgParen}`;
    }
    if (kg !== undefined) return `${formatNumberEs(kg)} kg`;
    return "—";
  }

  if (kg !== undefined) return `${formatNumberEs(kg)} kg`;
  const pz = coercePiezasFromUnknown(slot.piezas);
  if (pz !== undefined && pz > 0) return `${formatNumberEs(pz)} u.`;
  return "—";
}
