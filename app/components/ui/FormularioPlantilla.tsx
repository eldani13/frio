"use client";

import type { ReactNode } from "react";
import { HiOutlineXMark } from "react-icons/hi2";

/** Overlay: mismo contraste que el formulario de catálogo. */
export const FORMULARIO_CREACION_OVERLAY_BASE =
  "fixed inset-0 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm";

/** Tarjeta contenedora (scroll interno según uso). */
export const FORMULARIO_CREACION_CARD =
  "flex max-h-[90vh] w-full flex-col overflow-hidden rounded-[24px] border border-gray-100 bg-white shadow-2xl animate-in fade-in zoom-in duration-200";

/** Cabecera con título + subtítulo + cerrar. */
export const FORMULARIO_CREACION_HEADER =
  "z-10 flex shrink-0 items-center justify-between border-b border-gray-50 bg-white p-6";

/** Subtítulo bajo el título (mayúsculas / gris como catálogo). */
export const FORMULARIO_CREACION_SUBTITULO =
  "text-base font-medium uppercase tracking-tight text-gray-500";

/** Cuerpo del formulario con fondo suave (área scroll típica). */
export const FORMULARIO_CREACION_BODY =
  "min-h-0 flex-1 overflow-y-auto bg-gray-50/30 p-6";

/** Rejilla estándar de campos (1 / 2 / 3 columnas). */
export const FORMULARIO_CREACION_GRID =
  "grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2 lg:grid-cols-3";

/** Etiqueta de campo (mayúsculas). */
export const FORMULARIO_CREACION_LABEL =
  "mb-1.5 ml-1 block text-base font-bold uppercase tracking-widest text-gray-400";

/** Input y textarea base. */
export const FORMULARIO_CREACION_INPUT =
  "w-full rounded-[12px] border border-gray-200 bg-white px-4 py-3 text-base shadow-sm transition-all focus:border-[#A8D5BA] focus:outline-none focus:ring-1 focus:ring-[#A8D5BA]";

/** Select alineado a inputs. */
export const FORMULARIO_CREACION_SELECT = FORMULARIO_CREACION_INPUT;

/** Fila tipo checkbox «Publicado…» del catálogo. */
export const FORMULARIO_CREACION_BOOLEAN_ROW =
  "flex h-[48px] items-center rounded-[12px] border border-gray-200 bg-white px-4 shadow-sm";

/** Pie con botones Cancelar / Acción principal. */
export const FORMULARIO_CREACION_FOOTER =
  "flex shrink-0 gap-3 border-t border-gray-100 bg-white p-6";

export const FORMULARIO_CREACION_BTN_CANCEL =
  "flex-1 rounded-[16px] border border-gray-200 px-4 py-3 text-base font-bold text-gray-500 transition-all hover:bg-gray-50";

export const FORMULARIO_CREACION_BTN_SUBMIT =
  "flex-[2] rounded-[16px] bg-[#A8D5BA] px-4 py-3 text-base font-bold text-[#2D5A3F] shadow-lg shadow-[#A8D5BA]/20 transition-all hover:bg-[#97c4a9] active:scale-[0.98] disabled:opacity-50";

export type FormularioPlantillaProps = {
  isOpen: boolean;
  onClose: () => void;
  titulo: string;
  /** Por defecto «Formulario»; en catálogo: «Formulario completo de catálogo». */
  subtitulo?: string;
  titleId?: string;
  children: ReactNode;
  /** Pie fijo (si no se pasa, no se muestra fila de pie). */
  footer?: ReactNode;
  zIndexClass?: string;
  /** Ancho máximo de la tarjeta (`max-w-lg`, `max-w-4xl`, …). */
  maxWidthClass?: string;
};

/**
 * Carcasa común para formularios de creación y edición (referencia: `CatalogoForm`).
 */
export function FormularioPlantilla({
  isOpen,
  onClose,
  titulo,
  subtitulo = "Formulario",
  titleId = "formulario-plantilla-titulo",
  children,
  footer,
  zIndexClass = "z-50",
  maxWidthClass = "max-w-4xl",
}: FormularioPlantillaProps) {
  if (!isOpen) return null;

  return (
    <div
      className={`${FORMULARIO_CREACION_OVERLAY_BASE} ${zIndexClass}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onClose}
    >
      <div
        className={`${FORMULARIO_CREACION_CARD} ${maxWidthClass}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={FORMULARIO_CREACION_HEADER}>
          <div>
            <h2 id={titleId} className="app-title">
              {titulo}
            </h2>
            <p className={FORMULARIO_CREACION_SUBTITULO}>{subtitulo}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 transition-colors hover:bg-gray-100"
            aria-label="Cerrar"
          >
            <HiOutlineXMark size={24} className="text-gray-500" />
          </button>
        </div>
        {children}
        {footer ?? null}
      </div>
    </div>
  );
}

export type FormularioPlantillaAccionesProps = {
  formId?: string;
  cancelLabel?: string;
  submitLabel: string;
  loading?: boolean;
  loadingLabel?: string;
  onCancel: () => void;
  submitDisabled?: boolean;
};

/** Botones Cancelar + principal (mismas proporciones que catálogo: 1 / 2). */
export function FormularioPlantillaAcciones({
  formId,
  cancelLabel = "Cancelar",
  submitLabel,
  loading = false,
  loadingLabel = "Guardando…",
  onCancel,
  submitDisabled,
}: FormularioPlantillaAccionesProps) {
  return (
    <div className={FORMULARIO_CREACION_FOOTER}>
      <button type="button" onClick={onCancel} className={FORMULARIO_CREACION_BTN_CANCEL}>
        {cancelLabel}
      </button>
      <button
        form={formId}
        type="submit"
        disabled={Boolean(loading) || submitDisabled}
        className={FORMULARIO_CREACION_BTN_SUBMIT}
      >
        {loading ? loadingLabel : submitLabel}
      </button>
    </div>
  );
}

/** Etiqueta de campo con asterisco opcional (misma tipografía que catálogo). */
export function FormularioPlantillaEtiquetaCampo({
  children,
  requerido,
}: {
  children: ReactNode;
  requerido?: boolean;
}) {
  return (
    <label className={FORMULARIO_CREACION_LABEL}>
      {children} {requerido ? <span className="text-red-400">*</span> : null}
    </label>
  );
}
