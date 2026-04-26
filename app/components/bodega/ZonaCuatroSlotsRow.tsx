"use client";

import React from "react";
import {
  BODEGA_SLOT_BODY_CLASS,
  BODEGA_SLOT_EMPTY_PLUS_AREA_CLASS,
  BODEGA_SLOT_INNER_FIXED_CLASS,
  BODEGA_SLOT_ROUNDED,
  BODEGA_SLOT_SHELL_CLASS,
  BODEGA_SLOT_SHELL_PADDING,
} from "@/app/lib/bodegaSlotUniform";

/** Casilleros en una fila del mapa / procesamiento clásico. */
export const SLOTS_POR_FILA = 4;

/** Casilleros fijos en columnas Entrada y Salida (sin paginación). */
export const ZONA_ENTRADA_SALIDA_SLOTS = 8;

/** Rellena con `null` hasta `length` ítems (p. ej. cuatro casilleros fijos por fila). */
export function padToLength<T>(items: T[], length: number): (T | null)[] {
  const out: (T | null)[] = items.slice(0, length);
  while (out.length < length) out.push(null);
  return out;
}

/**
 * Casillero vacío alineado con `SlotCard` / `BodegaZonaCajaCard` (misma huella 140px y layout).
 */
export function EmptyZonaSlot({
  variant,
  label,
  className = "",
}: {
  variant: "entrada" | "salida" | "mapa" | "procesamiento";
  /** Esquina superior izquierda (índice 1–8 en entrada/salida, posición en mapa, etc.). */
  label?: number;
  className?: string;
}) {
  /** Almacenamiento: misma receta de borde que Entrada / Salida / Procesamiento (doble marco discontinuo). */
  if (variant === "mapa") {
    return (
      <div
        className={`relative flex ${BODEGA_SLOT_SHELL_CLASS} flex-col overflow-hidden ${BODEGA_SLOT_ROUNDED} border-2 border-dashed border-slate-400 bg-slate-50/85 ${BODEGA_SLOT_SHELL_PADDING} shadow-none cursor-default ${className}`}
      >
        {label != null ? (
          <span className="absolute left-2 top-2 z-10 text-xs font-normal tabular-nums text-slate-700">
            {label}
          </span>
        ) : null}
        <div className={BODEGA_SLOT_BODY_CLASS}>
          <div
            className={`${BODEGA_SLOT_INNER_FIXED_CLASS} flex flex-col border-2 border-dashed border-slate-400 bg-white/95`}
          >
            <div className={`${BODEGA_SLOT_EMPTY_PLUS_AREA_CLASS} min-h-0 flex-1 bg-white/90`}>
              <span className="text-2xl font-light leading-none text-slate-500" aria-hidden>
                +
              </span>
            </div>
            <p className="shrink-0 pt-1 text-center text-xs font-semibold text-slate-700">Vacía</p>
          </div>
        </div>
      </div>
    );
  }

  /** Entrada: mismo patrón que Salida pero en esmeralda (se distingue del mapa y del rosa de salida). */
  if (variant === "entrada") {
    return (
      <div
        className={`relative flex ${BODEGA_SLOT_SHELL_CLASS} flex-col overflow-hidden ${BODEGA_SLOT_ROUNDED} border-2 border-dashed border-emerald-500 bg-emerald-50/80 ${BODEGA_SLOT_SHELL_PADDING} shadow-none cursor-default ${className}`}
      >
        {label != null ? (
          <span className="absolute left-2 top-2 z-10 text-xs font-normal tabular-nums text-emerald-800">
            {label}
          </span>
        ) : null}
        <div className={BODEGA_SLOT_BODY_CLASS}>
          <div
            className={`${BODEGA_SLOT_INNER_FIXED_CLASS} flex flex-col border-2 border-dashed border-emerald-500 bg-white/95`}
          >
            <div className={`${BODEGA_SLOT_EMPTY_PLUS_AREA_CLASS} min-h-0 flex-1 bg-white/90`}>
              <span className="text-2xl font-light leading-none text-emerald-600" aria-hidden>
                +
              </span>
            </div>
            <p className="shrink-0 pt-1 text-center text-xs font-semibold text-emerald-800">Vacía</p>
          </div>
        </div>
      </div>
    );
  }

  if (variant === "salida") {
    return (
      <div
        className={`relative flex ${BODEGA_SLOT_SHELL_CLASS} flex-col overflow-hidden ${BODEGA_SLOT_ROUNDED} border-2 border-dashed border-pink-500 bg-pink-50/90 ${BODEGA_SLOT_SHELL_PADDING} shadow-none cursor-default ${className}`}
      >
        {label != null ? (
          <span className="absolute left-2 top-2 z-10 text-xs font-normal tabular-nums text-pink-900">
            {label}
          </span>
        ) : null}
        <div className={BODEGA_SLOT_BODY_CLASS}>
          <div
            className={`${BODEGA_SLOT_INNER_FIXED_CLASS} flex flex-col border-2 border-dashed border-pink-500 bg-white/95`}
          >
            <div className={`${BODEGA_SLOT_EMPTY_PLUS_AREA_CLASS} min-h-0 flex-1 bg-white/90`}>
              <span className="text-2xl font-light leading-none text-pink-600" aria-hidden>
                +
              </span>
            </div>
            <p className="shrink-0 pt-1 text-center text-xs font-semibold text-pink-900">Vacía</p>
          </div>
        </div>
      </div>
    );
  }

  /** Procesamiento: mismo layout, tonos cielo / cyan. */
  if (variant === "procesamiento") {
    return (
      <div
        className={`relative flex ${BODEGA_SLOT_SHELL_CLASS} flex-col overflow-hidden ${BODEGA_SLOT_ROUNDED} border-2 border-dashed border-sky-400 bg-sky-50/60 ${BODEGA_SLOT_SHELL_PADDING} shadow-none cursor-default ${className}`}
      >
        {label != null ? (
          <span className="absolute left-2 top-2 z-10 text-xs font-normal tabular-nums text-sky-700">
            {label}
          </span>
        ) : null}
        <div className={BODEGA_SLOT_BODY_CLASS}>
          <div
            className={`${BODEGA_SLOT_INNER_FIXED_CLASS} flex flex-col border-2 border-dashed border-sky-400 bg-white/95`}
          >
            <div className={`${BODEGA_SLOT_EMPTY_PLUS_AREA_CLASS} min-h-0 flex-1 bg-white/90`}>
              <span className="text-xl font-light leading-none text-sky-500" aria-hidden>
                +
              </span>
            </div>
            <p className="shrink-0 pt-1 text-center text-xs font-normal text-sky-700">Vacía</p>
          </div>
        </div>
      </div>
    );
  }
}

export type ZonaCuatroSlotsLayout = "fila4" | "dosPorColumna";

type ZonaCuatroSlotsRowProps = {
  children: React.ReactNode;
  className?: string;
  /**
   * `fila4`: una fila de cuatro casilleros (p. ej. procesamiento).
   * `dosPorColumna`: relleno por columnas — 2×2 si `slotCount` es 4; con 8 casilleros son **2 columnas × 4 filas** (4 por columna).
   */
  layout?: ZonaCuatroSlotsLayout;
  /** Solo con `dosPorColumna`: 4 u 8 casilleros. */
  slotCount?: 4 | 8;
};

/**
 * Rejilla de casilleros: fila única de 4, o bloques entrada/salida (apilados por columna).
 */
export function ZonaCuatroSlotsRow({
  children,
  className = "",
  layout = "fila4",
  slotCount = 4,
}: ZonaCuatroSlotsRowProps) {
  const gridClass =
    layout === "dosPorColumna" && slotCount === 8
      ? "grid-cols-2 grid-rows-4 grid-flow-col gap-1.5 sm:gap-2"
      : layout === "dosPorColumna"
        ? "grid-cols-2 grid-rows-2 grid-flow-col gap-1.5 sm:gap-2"
        : "grid-cols-4 gap-1.5 sm:gap-2";
  const label =
    layout === "dosPorColumna" && slotCount === 8
      ? "Ocho casilleros"
      : "Cuatro casilleros";
  return (
    <div
      className={`grid w-full min-w-0 ${gridClass} [&>*]:min-w-0 ${className}`}
      role="group"
      aria-label={label}
    >
      {children}
    </div>
  );
}
