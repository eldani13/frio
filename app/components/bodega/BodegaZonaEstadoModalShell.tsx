"use client";

import React from "react";
import { ModalPlantilla } from "@/app/components/ui/ModalPlantilla";

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
 * Modal de zona (alertas / tareas): misma plantilla visual que «Detalles de la caja».
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
  const footerNode =
    footer ?? (
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-base font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          Cerrar
        </button>
      </div>
    );

  return (
    <ModalPlantilla
      open
      onClose={onClose}
      titulo={title}
      tituloId={titleId ?? "bodega-zona-estado-modal-titulo"}
      headerIcon={icon}
      zIndexClass={zClass}
      maxWidthClass="max-w-2xl"
      cardMaxHeightClass="max-h-[90vh]"
      encabezadoSup={label}
      subtitulo={subtitle}
      footer={footerNode}
    >
      {children}
    </ModalPlantilla>
  );
}
