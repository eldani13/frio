import type { Client, Slot } from "@/app/interfaces/bodega";
import type { SolicitudProcesamiento } from "@/app/types/solicitudProcesamiento";
import { coercePiezasFromUnknown } from "@/lib/coerceBodegaKg";
import { formatEstimadoUnidadesSecundario } from "@/lib/catalogoProcesamiento";

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

/** Estilo almacenamiento: carcasa pastel + tarjeta interior (referencia de diseño). */
export type OccupiedSlotMapaTone = {
  shell: string;
  inner: string;
  icon: string;
  name: string;
  id: string;
  pill: string;
  positionLabel: string;
};

/** Tonos del almacenamiento (casillero ocupado primario). Reutilizable en procesamiento u otras vistas. */
export const OCCUPIED_MAPA_TONE_PRIMARIO: OccupiedSlotMapaTone = {
  shell:
    "border border-sky-200 bg-sky-50 text-slate-900 cursor-pointer shadow-sm transition hover:ring-2 hover:ring-sky-300/60",
  inner:
    "flex h-[96px] min-h-[96px] max-h-[96px] w-full min-w-0 flex-col overflow-hidden rounded-lg border border-sky-100 bg-white p-2 shadow-[0_1px_2px_rgba(15,23,42,0.06)]",
  icon: "text-sky-600",
  name: "font-bold text-slate-900",
  id: "font-medium text-sky-600",
  pill: "bg-sky-400 text-white shadow-sm",
  positionLabel: "font-normal tabular-nums text-sky-600",
};

/** Tonos del almacenamiento (casillero ocupado con producto procesado). */
export const OCCUPIED_MAPA_TONE_PROCESADO: OccupiedSlotMapaTone = {
  shell:
    "border border-violet-200 bg-violet-50 text-slate-900 cursor-pointer shadow-sm transition hover:ring-2 hover:ring-violet-300/80",
  inner:
    "flex h-[96px] min-h-[96px] max-h-[96px] w-full min-w-0 flex-col overflow-hidden rounded-lg border border-violet-200/80 bg-white p-2 shadow-sm",
  icon: "text-violet-600",
  name: "font-bold text-violet-950",
  id: "font-medium text-violet-700",
  pill: "bg-violet-500 text-white shadow-sm",
  positionLabel: "font-normal tabular-nums text-violet-600",
};

/**
 * Almacenamiento: azul pastel + tarjeta blanca interior = primario; violeta pastel = procesado.
 * Usa la misma heurística que `slotLooksLikeProcesamiento`.
 */
export function occupiedSlotVisualClasses(
  slot: Pick<Slot, "autoId" | "procesamientoSecundarioTitulo" | "procesamientoUnidadesSecundario">,
): OccupiedSlotMapaTone {
  return slotLooksLikeProcesamiento(slot) ? OCCUPIED_MAPA_TONE_PROCESADO : OCCUPIED_MAPA_TONE_PRIMARIO;
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
      return `${formatEstimadoUnidadesSecundario(u)} u.${kgParen}`;
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

/**
 * Conteo 0: como referencia «suave» — cápsula casi blanca, borde muy tenue, icono y cifra en gris medio‑claro
 * (no el gris carbón de la variante fuerte).
 */
export const BODEGA_ZONE_STATUS_PILL_INACTIVE_CLASS =
  "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-slate-200/55 bg-white px-2.5 text-xs font-medium text-slate-400 shadow-none transition hover:border-slate-200 hover:bg-slate-50/40 focus:outline-none focus-visible:ring-1 focus-visible:ring-slate-200/50";

/** Conteo mayor a 0: borde azul, fondo celeste, icono y cifra azules (activo). */
export const BODEGA_ZONE_STATUS_PILL_ACTIVE_CLASS =
  "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border-2 border-sky-500 bg-sky-50 px-2.5 text-xs font-semibold shadow-sm transition hover:border-sky-600 hover:bg-sky-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/45";

export const BODEGA_ZONE_STATUS_ICON_INACTIVE_CLASS = "h-4 w-4 shrink-0 text-slate-400";
export const BODEGA_ZONE_STATUS_ICON_ACTIVE_CLASS = "h-4 w-4 shrink-0 text-sky-700";

export const BODEGA_ZONE_STATUS_NUM_INACTIVE_CLASS =
  "tabular-nums font-medium leading-none text-slate-400";
export const BODEGA_ZONE_STATUS_NUM_ACTIVE_CLASS = "tabular-nums font-bold leading-none text-sky-800";
