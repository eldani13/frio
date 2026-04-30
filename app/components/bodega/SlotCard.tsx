"use client";

import { useState } from "react";
import type { SlotCardProps } from "../../interfaces/bodega/SlotCard";
import { occupiedSlotVisualClasses } from "@/app/lib/bodegaDisplay";
import {
  BODEGA_SLOT_BODY_CLASS,
  BODEGA_SLOT_ROUNDED,
  BODEGA_SLOT_SHELL_CLASS,
  BODEGA_SLOT_SHELL_PADDING,
} from "@/app/lib/bodegaSlotUniform";
import { FiBox } from "react-icons/fi";
import { EmptyZonaSlot } from "@/app/components/bodega/ZonaCuatroSlotsRow";
import { buildCajaDetalleFromSlot, CajaDetalleModal } from "@/app/components/bodega/CajaDetalleModal";

export default function SlotCard({
  slot,
  isSelected,
  onSelect,
  clients = [],
  slotCantidadContext,
  detalleChildren,
  mapaSoloLectura = false,
}: SlotCardProps) {
  const [detalleOpen, setDetalleOpen] = useState(false);
  const isOccupied = slot.autoId && slot.autoId.trim() !== "";
  const tone = isOccupied ? occupiedSlotVisualClasses(slot) : null;
  const showDetalle = Boolean(isOccupied && !mapaSoloLectura);

  if (!isOccupied || !tone) {
    return (
      <div
        className={`relative ${isSelected ? `${BODEGA_SLOT_ROUNDED} ring-2 ring-sky-400 ring-offset-1` : ""}`}
      >
        <EmptyZonaSlot variant="mapa" label={slot.position} />
      </div>
    );
  }

  const detalleProps = buildCajaDetalleFromSlot(slot, clients, slotCantidadContext);

  const shellClass = `${BODEGA_SLOT_SHELL_CLASS} relative flex w-full flex-col ${BODEGA_SLOT_ROUNDED} ${BODEGA_SLOT_SHELL_PADDING} transition ${tone.shell} ${isSelected ? "ring-2 ring-sky-400 ring-offset-1" : ""} ${mapaSoloLectura ? "cursor-default" : ""}`;

  const cardInner = (
    <>
          <span
            className={`absolute left-2 top-2 z-10 text-xs leading-none ${tone.positionLabel}`}
          >
            {slot.position}
          </span>
          <div className={BODEGA_SLOT_BODY_CLASS}>
            <div className={`${tone.inner}`}>
              <div className="flex min-h-0 min-w-0 flex-1 gap-2 overflow-hidden">
                <FiBox
                  className={`mt-0.5 h-4 w-4 shrink-0 sm:h-[18px] sm:w-[18px] ${tone.icon}`}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <div
                    className={`truncate font-semibold leading-tight text-base ${tone.name}`}
                  >
                    {slot.name || "Sin nombre"}
                  </div>
                  <div
                    className={`mt-0.5 truncate leading-tight text-base ${tone.id}`}
                  >
                    {slot.autoId}
                  </div>
                </div>
              </div>
              <div className="mt-2 flex shrink-0 justify-center">
                <span
                  className={`inline-block max-w-full truncate rounded-full px-2 py-0.5 text-base font-medium ${tone.pill}`}
                >
                  {typeof slot.temperature === "number" ? `${slot.temperature}°C` : "Sin temperatura"}
                </span>
              </div>
            </div>
          </div>
    </>
  );

  return (
    <>
      <div className={`relative ${isSelected ? `${BODEGA_SLOT_ROUNDED} ring-2 ring-sky-400 ring-offset-1` : ""}`}>
        {mapaSoloLectura ? (
          <div
            className={shellClass}
            role="group"
            aria-label={`Caja en posición ${slot.position}: ${slot.name || "Sin nombre"}`}
          >
            {cardInner}
          </div>
        ) : (
        <button
          type="button"
          onClick={() => {
            onSelect(slot.position);
            setDetalleOpen(true);
          }}
          className={shellClass}
          aria-label={`Ver detalles de la caja en posición ${slot.position}`}
        >
          {cardInner}
        </button>
        )}
      </div>
      {showDetalle ? (
        <CajaDetalleModal
          open={detalleOpen}
          onClose={() => setDetalleOpen(false)}
          {...detalleProps}
        >
          {detalleChildren}
        </CajaDetalleModal>
      ) : null}
    </>
  );
}
