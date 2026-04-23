"use client";

import type { ReactNode } from "react";
import { FiClock } from "react-icons/fi";
import { IoCloseOutline } from "react-icons/io5";
import type { Box, Client, Slot } from "@/app/interfaces/bodega";
import {
  clientLabelFromList,
  formatBoxQuantityKg,
  formatSlotCantidadDisplay,
  type SlotCantidadContext,
} from "@/app/lib/bodegaDisplay";

/** Fila «etiqueta: valor» alineada al modal de referencia (mapa / entrada / salida). */
export function BodegaDetalleModalFila({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-2">
      <dt className="shrink-0 font-bold text-slate-700">{label}:</dt>
      <dd className="min-w-0 break-words text-slate-600">{value}</dd>
    </div>
  );
}

export type BodegaDetalleModalShellProps = {
  open: boolean;
  onClose: () => void;
  /** Título centrado bajo el icono (p. ej. «Detalles de la caja», «Orden de procesamiento»). */
  titulo: string;
  /** Icono dentro del círculo azul del encabezado. */
  headerIcon: ReactNode;
  /** Contenido principal (p. ej. lista `dl`). */
  children: ReactNode;
  /** Pie fijo (acciones); borde superior automático. */
  footer?: ReactNode;
  /** `aria-labelledby` del diálogo. */
  tituloId?: string;
  zIndexClass?: string;
};

/**
 * Carcasa común de modales de detalle (referencia: reloj + «Detalles de la caja» + filas etiqueta:valor).
 * Usar en mapa, zonas y procesamiento para unificar diseño.
 */
export function BodegaDetalleModalShell({
  open,
  onClose,
  titulo,
  headerIcon,
  children,
  footer,
  tituloId = "bodega-detalle-modal-titulo",
  zIndexClass = "z-[100]",
}: BodegaDetalleModalShellProps) {
  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 ${zIndexClass} flex items-end justify-center bg-slate-900/45 p-3 backdrop-blur-[2px] sm:items-center sm:p-4`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={tituloId}
      onClick={onClose}
    >
      <div
        className="flex max-h-[min(92vh,640px)] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative shrink-0 border-b border-slate-100 px-5 pb-5 pt-8 text-center sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Cerrar"
          >
            <IoCloseOutline className="h-6 w-6" />
          </button>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-blue-200 bg-blue-50 shadow-inner">
            {headerIcon}
          </div>
          <h2 id={tituloId} className="mt-4 text-lg font-bold tracking-tight text-blue-700 sm:text-xl">
            {titulo}
          </h2>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>

        {footer ? (
          <div className="shrink-0 border-t border-slate-100 px-5 py-4 sm:px-6">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}

export type CajaDetalleModalProps = {
  open: boolean;
  onClose: () => void;
  nombre: string;
  idUnico: string;
  cliente: string;
  cantidad: string;
  posicion: string;
  temperatura: string;
  /** Trazabilidad OC/Venta, producto secundario, etc. */
  children?: ReactNode;
};

/**
 * Modal «Detalles de la caja»: mismo shell que el resto de detalles de bodega.
 */
export function CajaDetalleModal({
  open,
  onClose,
  nombre,
  idUnico,
  cliente,
  cantidad,
  posicion,
  temperatura,
  children,
}: CajaDetalleModalProps) {
  const rows: Array<{ label: string; value: string }> = [
    { label: "Nombre", value: nombre },
    { label: "Id único", value: idUnico },
    { label: "Cliente", value: cliente },
    { label: "Cantidad", value: cantidad },
    { label: "Posición", value: posicion },
    { label: "Temperatura", value: temperatura },
  ];

  return (
    <BodegaDetalleModalShell
      open={open}
      onClose={onClose}
      titulo="Detalles de la caja"
      tituloId="caja-detalle-modal-titulo"
      headerIcon={<FiClock className="h-7 w-7 text-blue-600" strokeWidth={2} aria-hidden />}
    >
      <dl className="space-y-3 text-sm">
        {rows.map(({ label, value }) => (
          <BodegaDetalleModalFila key={label} label={label} value={value} />
        ))}
      </dl>
      {children ? <div className="mt-4 border-t border-slate-100 pt-4">{children}</div> : null}
    </BodegaDetalleModalShell>
  );
}

export function buildCajaDetalleFromBox(box: Box, clients: Client[]): Omit<CajaDetalleModalProps, "open" | "onClose" | "children"> {
  return {
    nombre: (box.name || "Sin nombre").trim() || "—",
    idUnico: (box.autoId || "—").trim() || "—",
    cliente: clientLabelFromList(box.client || "", clients),
    cantidad: formatBoxQuantityKg(box.quantityKg),
    posicion: String(box.position),
    temperatura:
      typeof box.temperature === "number" && Number.isFinite(box.temperature)
        ? `${box.temperature} °C`
        : "—",
  };
}

export function buildCajaDetalleFromSlot(
  slot: Slot,
  clients: Client[],
  ctx?: SlotCantidadContext,
): Omit<CajaDetalleModalProps, "open" | "onClose" | "children"> {
  return {
    nombre: (slot.name || "Sin nombre").trim() || "—",
    idUnico: (slot.autoId || "—").trim() || "—",
    cliente: clientLabelFromList(slot.client || "", clients),
    cantidad: formatSlotCantidadDisplay(slot, ctx),
    posicion: String(slot.position),
    temperatura:
      typeof slot.temperature === "number" && Number.isFinite(slot.temperature)
        ? `${slot.temperature} °C`
        : "—",
  };
}
