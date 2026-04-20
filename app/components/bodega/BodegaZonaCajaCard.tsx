"use client";

import type { Box } from "@/app/interfaces/bodega";
import { FiBox } from "react-icons/fi";

const TONE: Record<
  "entrada" | "salida",
  { card: string; icon: string; pill: string; pillWarn?: string }
> = {
  entrada: {
    card: "bg-emerald-100 border-emerald-400 text-slate-900",
    icon: "text-emerald-600",
    pill: "bg-emerald-600 text-white",
    pillWarn: "bg-red-500 text-white",
  },
  salida: {
    card: "bg-pink-100 border-pink-300 text-slate-900",
    icon: "text-pink-500",
    pill: "bg-pink-600 text-white",
  },
};

export type BodegaZonaCajaCardProps = {
  box: Pick<Box, "position" | "autoId" | "name" | "temperature">;
  variant: "entrada" | "salida";
  /** Resalta temperatura fuera de rango (p. ej. ingreso &gt; umbral). */
  alertaTemperaturaAlta?: boolean;
  className?: string;
  /** Si se define, la tarjeta es un botón (p. ej. abrir modal de detalle). */
  onOpen?: () => void;
};

const interactiveRing: Record<"entrada" | "salida", string> = {
  entrada:
    "cursor-pointer hover:ring-2 hover:ring-emerald-400/70 hover:ring-offset-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1 active:scale-[0.98]",
  salida:
    "cursor-pointer hover:ring-2 hover:ring-pink-400/70 hover:ring-offset-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 focus-visible:ring-offset-1 active:scale-[0.98]",
};

/**
 * Misma huella que `SlotCard` del mapa de bodega: posición, ícono, nombre, id, pastilla de °C.
 * Colores: verde (entrada) / rosa (salida).
 */
export default function BodegaZonaCajaCard({
  box,
  variant,
  alertaTemperaturaAlta = false,
  className = "",
  onOpen,
}: BodegaZonaCajaCardProps) {
  const tone = TONE[variant];
  const pillClass =
    alertaTemperaturaAlta && tone.pillWarn ? tone.pillWarn : tone.pill;

  const shellClass = `relative flex w-full flex-col items-center justify-center rounded-3xl border p-2 sm:p-4 transition ${tone.card} ${onOpen ? interactiveRing[variant] : ""} ${className}`;

  const inner = (
    <>
      <span className="absolute left-1 top-1 rounded-full px-1 py-0.5 text-[9px] font-semibold text-slate-600">
        {box.position}
      </span>
      <div className="mb-1">
        <FiBox className={`h-4 w-4 sm:h-6 sm:w-6 ${tone.icon}`} aria-hidden />
      </div>
      <div className="w-full truncate text-center font-semibold text-[clamp(0.65rem,1vw,0.85rem)]">
        {box.name || "Sin nombre"}
      </div>
      <div className="mt-1 w-full truncate text-center text-[clamp(0.7rem,1.5vw,0.85rem)]">
        {box.autoId}
      </div>
      <div
        className={`mt-2 inline-block rounded-full px-1.5 py-0.5 text-[clamp(0.7rem,1.5vw,0.85rem)] font-medium sm:px-3 ${pillClass}`}
      >
        {typeof box.temperature === "number" ? `${box.temperature} °C` : "Sin temperatura"}
      </div>
    </>
  );

  if (onOpen) {
    return (
      <button
        type="button"
        onClick={onOpen}
        className={shellClass}
        style={{ minHeight: 90 }}
        aria-label={`Ver detalle de la caja ${box.autoId || box.position}`}
      >
        {inner}
      </button>
    );
  }

  return (
    <div className={shellClass} style={{ minHeight: 90 }}>
      {inner}
    </div>
  );
}
