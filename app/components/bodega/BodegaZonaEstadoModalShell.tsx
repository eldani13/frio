"use client";

import React from "react";
import { FiX } from "react-icons/fi";

export type BodegaZonaEstadoModalShellProps = {
  titleId?: string;
  /** Etiqueta pequeña en mayúsculas (p. ej. «TAREAS PENDIENTES») */
  label: string;
  title: string;
  subtitle?: React.ReactNode;
  icon: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  /** Si no se pasa, solo el botón Cerrar */
  footer?: React.ReactNode;
  zClass?: string;
};

/**
 * Contenedor visual alineado con el modal de «Tareas pendientes» (ventas en curso): overlay, tarjeta, cabecera sky, pie con Cerrar.
 */
export function BodegaZonaEstadoModalShell({
  titleId,
  label,
  title,
  subtitle,
  icon,
  onClose,
  children,
  footer,
  zClass = "z-[60]",
}: BodegaZonaEstadoModalShellProps) {
  return (
    <div
      className={`fixed inset-0 ${zClass} flex items-center justify-center bg-slate-900/45 p-3 backdrop-blur-[2px] sm:p-4`}
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-sky-200/90 bg-white shadow-2xl shadow-sky-900/10"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="relative shrink-0 border-b border-sky-100 bg-linear-to-r from-sky-50 via-white to-cyan-50/80 px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700 shadow-inner [&>svg]:h-6 [&>svg]:w-6">
              {icon}
            </div>
            <div className="min-w-0 flex-1 pr-10">
              <h2 id={titleId} className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                <span className="block text-[11px] font-semibold uppercase tracking-wide text-sky-800/90">{label}</span>
                <span className="mt-1 block text-lg font-bold tracking-tight sm:text-xl">{title}</span>
              </h2>
              {subtitle ? <div className="mt-1.5 text-sm leading-relaxed text-slate-600">{subtitle}</div> : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="absolute right-3 top-3 rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 sm:right-4 sm:top-4"
              aria-label="Cerrar"
            >
              <FiX className="h-5 w-5" />
            </button>
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">{children}</div>
        <footer className="flex shrink-0 flex-col gap-3 border-t border-sky-100 bg-sky-50/50 px-4 py-4 sm:px-6">
          {footer ?? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Cerrar
              </button>
            </div>
          )}
        </footer>
      </div>
    </div>
  );
}
