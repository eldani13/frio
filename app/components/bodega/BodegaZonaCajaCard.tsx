"use client";

import { useState, type ReactNode } from "react";
import type { Box, Client } from "@/app/interfaces/bodega";
import {
  BODEGA_SLOT_BODY_CLASS,
  BODEGA_SLOT_INNER_FIXED_CLASS,
  BODEGA_SLOT_SHELL_CLASS,
  BODEGA_SLOT_SHELL_PADDING,
} from "@/app/lib/bodegaSlotUniform";
import { buildCajaDetalleFromBox, CajaDetalleModal } from "@/app/components/bodega/CajaDetalleModal";
import { FiBox } from "react-icons/fi";

const TONE: Record<
  "entrada" | "salida",
  { card: string; icon: string; pill: string; pillWarn?: string }
> = {
  entrada: {
    card: "border-emerald-400 bg-emerald-50/95 text-slate-900 shadow-sm",
    icon: "text-emerald-600",
    pill: "bg-emerald-600 text-white",
    pillWarn: "bg-red-500 text-white",
  },
  salida: {
    card: "border-pink-400 bg-pink-50 shadow-sm text-slate-900",
    icon: "text-pink-600",
    pill: "bg-pink-500 text-white",
    pillWarn: "bg-red-500 text-white",
  },
};

const interactiveRing: Record<"entrada" | "salida", string> = {
  entrada:
    "cursor-pointer hover:ring-2 hover:ring-emerald-400/80 hover:ring-offset-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1 active:scale-[0.98]",
  salida:
    "cursor-pointer hover:ring-2 hover:ring-pink-400/85 hover:ring-offset-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 focus-visible:ring-offset-1 active:scale-[0.98]",
};

export type BodegaZonaCajaCardProps = {
  box: Box;
  variant: "entrada" | "salida";
  /** Si se define, reemplaza el número mostrado arriba a la izquierda (p. ej. índice 1–4 en la fila). */
  cornerLabel?: string | number;
  /** Resalta temperatura fuera de rango (p. ej. ingreso &gt; umbral). */
  alertaTemperaturaAlta?: boolean;
  className?: string;
  /** Para nombre de cliente en el modal de detalle. */
  clients?: Client[];
  /** OC/Venta u otra trazabilidad bajo el bloque principal del modal. */
  detalleChildren?: ReactNode;
  /** Opcional: al hacer clic en la tarjeta, antes de abrir el detalle (p. ej. sincronizar select de salida). */
  onCardClick?: () => void;
};

/**
 * Misma huella y layout que `SlotCard` / mapa / procesamiento: contenedor 140px, tarjeta blanca interior.
 * Clic en la tarjeta abre el detalle de la caja (sin icono aparte).
 */
export default function BodegaZonaCajaCard({
  box,
  variant,
  cornerLabel,
  alertaTemperaturaAlta = false,
  className = "",
  clients = [],
  detalleChildren,
  onCardClick,
}: BodegaZonaCajaCardProps) {
  const [detalleOpen, setDetalleOpen] = useState(false);
  const tone = TONE[variant];
  const pillClass =
    alertaTemperaturaAlta && tone.pillWarn ? tone.pillWarn : tone.pill;

  const rounded = "rounded-xl";
  const showDetalle = Boolean(box.autoId?.trim());
  const interactive = showDetalle || Boolean(onCardClick);
  const shellClass = `relative flex flex-col ${BODEGA_SLOT_SHELL_CLASS} border transition ${rounded} ${BODEGA_SLOT_SHELL_PADDING} ${tone.card} ${interactive ? interactiveRing[variant] : ""} ${className}`;

  const corner = cornerLabel != null ? cornerLabel : box.position;

  const innerBorder =
    variant === "salida" ? "border-pink-200/95" : "border-emerald-200/95";

  const cornerText =
    variant === "salida" ? "text-pink-900" : "text-emerald-800";

  const detalleProps = buildCajaDetalleFromBox(box, clients);

  const handleActivate = () => {
    onCardClick?.();
    if (showDetalle) setDetalleOpen(true);
  };

  const inner = (
    <>
      <span
        className={`absolute left-2 top-2 z-10 text-xs font-normal tabular-nums ${cornerText}`}
      >
        {corner}
      </span>
      <div className={BODEGA_SLOT_BODY_CLASS}>
        <div className={`${BODEGA_SLOT_INNER_FIXED_CLASS} ${innerBorder}`}>
          <div className="flex min-h-0 min-w-0 flex-1 gap-2 overflow-hidden">
            <FiBox
              className={`mt-0.5 h-4 w-4 shrink-0 sm:h-[18px] sm:w-[18px] ${tone.icon}`}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold leading-tight text-slate-800 text-[clamp(0.65rem,1vw,0.8rem)]">
                {box.name || "Sin nombre"}
              </div>
              <div className="mt-0.5 truncate leading-tight text-slate-500 text-[clamp(0.65rem,1.4vw,0.78rem)]">
                {box.autoId}
              </div>
            </div>
          </div>
          <div className="mt-2 flex shrink-0 justify-center">
            <span
              className={`inline-block max-w-full truncate rounded-full px-2 py-0.5 text-[clamp(0.65rem,1.4vw,0.78rem)] font-medium ${pillClass}`}
            >
              {typeof box.temperature === "number" ? `${box.temperature} °C` : "Sin temperatura"}
            </span>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      <div
        className={shellClass}
        onClick={interactive ? handleActivate : undefined}
        role={interactive ? "button" : undefined}
        tabIndex={interactive ? 0 : undefined}
        onKeyDown={
          interactive
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleActivate();
                }
              }
            : undefined
        }
        aria-label={
          showDetalle
            ? `Ver detalles de la caja ${box.autoId || box.position}`
            : onCardClick
              ? "Seleccionar caja"
              : undefined
        }
      >
        {inner}
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
