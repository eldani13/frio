"use client";

import type { ReactNode } from "react";
import type { Box, Client, Slot } from "@/app/interfaces/bodega";
import {
  clientLabelFromList,
  formatBoxQuantityKg,
  formatSlotCantidadDisplay,
  type SlotCantidadContext,
} from "@/app/lib/bodegaDisplay";
import { FiClock } from "react-icons/fi";
import { ModalPlantilla, ModalPlantillaFila } from "@/app/components/ui/ModalPlantilla";

/** @deprecated Usar `ModalPlantillaFila`; se mantiene el alias para imports existentes. */
export const BodegaDetalleModalFila = ModalPlantillaFila;

/** @deprecated Usar `ModalPlantilla`; se mantiene el alias por compatibilidad. */
export const BodegaDetalleModalShell = ModalPlantilla;

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
 * Modal «Detalles de la caja»: plantilla unificada (`ModalPlantilla`).
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
    <ModalPlantilla
      open={open}
      onClose={onClose}
      titulo="Detalles de la caja"
      tituloId="caja-detalle-modal-titulo"
      headerIcon={<FiClock className="h-7 w-7 text-blue-600" strokeWidth={2} aria-hidden />}
    >
      <dl className="space-y-3 text-base">
        {rows.map(({ label, value }) => (
          <ModalPlantillaFila key={label} label={label} value={value} />
        ))}
      </dl>
      {children ? <div className="mt-4 border-t border-slate-100 pt-4">{children}</div> : null}
    </ModalPlantilla>
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
