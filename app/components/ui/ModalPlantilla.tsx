"use client";

import type { ReactNode } from "react";
import { IoCloseOutline } from "react-icons/io5";

/** Fila «etiqueta: valor» del cuerpo (misma receta en todos los modales de detalle). */
export function ModalPlantillaFila({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-2">
      <dt className="shrink-0 font-bold text-slate-900">{label}:</dt>
      <dd className="min-w-0 break-words font-normal text-slate-600">{value}</dd>
    </div>
  );
}

export type ModalPlantillaProps = {
  open: boolean;
  onClose: () => void;
  /** Título centrado bajo el icono. */
  titulo: string;
  /** Icono dentro del círculo azul claro del encabezado. */
  headerIcon: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  tituloId?: string;
  zIndexClass?: string;
  /** Ancho máximo de la tarjeta (p. ej. `max-w-md`, `max-w-2xl`, `max-w-3xl`). */
  maxWidthClass?: string;
  /** Altura máxima del contenedor flex de la tarjeta. */
  cardMaxHeightClass?: string;
  /** Línea opcional centrada encima del título (p. ej. etiqueta en mayúsculas). */
  encabezadoSup?: ReactNode;
  /** Texto o bloque centrado bajo el título, antes del borde inferior del header. */
  subtitulo?: ReactNode;
  /** Contenido absoluto arriba a la izquierda (p. ej. botón «volver»). */
  headerStart?: ReactNode;
  /** Clases extra para el `h2` del título (p. ej. `font-mono`). */
  tituloClassName?: string;
};

/**
 * Plantilla visual única para modales: overlay, tarjeta blanca redondeada,
 * icono circular, título centrado, cuerpo con scroll y pie opcional.
 */
export function ModalPlantilla({
  open,
  onClose,
  titulo,
  headerIcon,
  children,
  footer,
  tituloId = "modal-plantilla-titulo",
  zIndexClass = "z-[100]",
  maxWidthClass = "max-w-md",
  cardMaxHeightClass = "max-h-[min(92vh,640px)]",
  encabezadoSup,
  subtitulo,
  headerStart,
  tituloClassName = "",
}: ModalPlantillaProps) {
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
        className={`flex ${cardMaxHeightClass} w-full ${maxWidthClass} flex-col overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative shrink-0 border-b border-slate-100 px-5 pb-5 pt-8 text-center sm:px-6">
          {headerStart ? (
            <div className="absolute left-3 top-3 z-10 sm:left-4 sm:top-4">{headerStart}</div>
          ) : null}
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
          {encabezadoSup ? (
            <div className="mt-3 text-center text-base font-semibold uppercase tracking-wide text-slate-500">
              {encabezadoSup}
            </div>
          ) : null}
          <h2 id={tituloId} className={`app-title mt-4${tituloClassName ? ` ${tituloClassName}` : ""}`}>
            {titulo}
          </h2>
          {subtitulo ? <div className="mt-2 text-center text-base leading-relaxed text-slate-600">{subtitulo}</div> : null}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>

        {footer ? (
          <div className="shrink-0 border-t border-slate-100 px-5 py-4 sm:px-6">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}
