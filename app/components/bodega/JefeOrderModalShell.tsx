"use client";

import React from "react";
import { FiAlertTriangle, FiX } from "react-icons/fi";

export type JefeModalAccent = "emerald" | "blue" | "orange" | "pink";

export const jefeModalAccentClass: Record<
  JefeModalAccent,
  {
    header: string;
    iconWrap: string;
    iconColor: string;
    cardBorder: string;
    primary: string;
    primaryHover: string;
    selectFocus: string;
  }
> = {
  emerald: {
    header: "from-emerald-50 via-white to-slate-50/30",
    iconWrap: "bg-emerald-100",
    iconColor: "text-emerald-600",
    cardBorder: "border-emerald-100",
    primary: "bg-emerald-600",
    primaryHover: "hover:bg-emerald-500",
    selectFocus: "focus:border-emerald-400 focus:ring-emerald-200/60",
  },
  blue: {
    header: "from-blue-50 via-white to-slate-50/30",
    iconWrap: "bg-blue-100",
    iconColor: "text-blue-600",
    cardBorder: "border-blue-100",
    primary: "bg-blue-600",
    primaryHover: "hover:bg-blue-500",
    selectFocus: "focus:border-blue-400 focus:ring-blue-200/60",
  },
  orange: {
    header: "from-orange-50 via-white to-slate-50/30",
    iconWrap: "bg-orange-100",
    iconColor: "text-orange-600",
    cardBorder: "border-orange-100",
    primary: "bg-orange-600",
    primaryHover: "hover:bg-orange-500",
    selectFocus: "focus:border-orange-400 focus:ring-orange-200/60",
  },
  pink: {
    header: "from-pink-50 via-white to-slate-50/30",
    iconWrap: "bg-pink-100",
    iconColor: "text-pink-600",
    cardBorder: "border-pink-100",
    primary: "bg-pink-600",
    primaryHover: "hover:bg-pink-500",
    selectFocus: "focus:border-pink-400 focus:ring-pink-200/60",
  },
};

export const jefeNestedShellBorder: Record<JefeModalAccent, string> = {
  emerald: "border-emerald-100",
  blue: "border-blue-100",
  orange: "border-orange-100",
  pink: "border-pink-100",
};

export const jefeBtnGhost =
  "inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 sm:w-auto";

export function JefeModalEmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5 rounded-xl border border-amber-200/80 bg-amber-50/90 px-3.5 py-2.5 text-xs leading-snug text-amber-950">
      <FiAlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
      <div>{children}</div>
    </div>
  );
}

export function JefeModalField({
  label,
  icon,
  hint,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {icon ? (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
            {icon}
          </span>
        ) : null}
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>
      </div>
      {children}
      {hint ? <p className="text-xs leading-relaxed text-slate-500">{hint}</p> : null}
    </div>
  );
}

export function JefeOrderModalShell({
  id,
  title,
  description,
  accent,
  icon,
  onClose,
  children,
  footer,
  contentMaxWidthClass = "max-w-lg",
  bodyMaxHeightClass = "max-h-[min(62vh,480px)]",
  headerStart,
  zIndexClass = "z-50",
  tituloClassName,
}: {
  id: string;
  title: string;
  description?: string;
  accent: JefeModalAccent;
  icon: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
  contentMaxWidthClass?: string;
  bodyMaxHeightClass?: string;
  headerStart?: React.ReactNode;
  zIndexClass?: string;
  /** Clases extra del título (p. ej. `font-mono`). */
  tituloClassName?: string;
}) {
  const a = jefeModalAccentClass[accent];
  return (
    <div
      className={`fixed inset-0 ${zIndexClass} flex items-center justify-center bg-slate-900/45 p-3 backdrop-blur-[2px] sm:p-4`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${id}-title`}
      onClick={onClose}
    >
      <div
        className={`w-full ${contentMaxWidthClass} overflow-hidden rounded-3xl border bg-white shadow-2xl shadow-slate-900/10 ring-1 ring-black/5 ${a.cardBorder}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`relative flex items-start gap-4 border-b border-slate-100/80 bg-linear-to-r px-5 py-5 sm:px-6 ${a.header}`}
        >
          {headerStart ? <div className="shrink-0 pt-0.5">{headerStart}</div> : null}
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-inner ${a.iconWrap}`}
          >
            <span className={a.iconColor}>{icon}</span>
          </div>
          <div className="min-w-0 flex-1 pr-10">
            <h2 id={`${id}-title`} className={`app-title${tituloClassName ? ` ${tituloClassName}` : ""}`}>
              {title}
            </h2>
            {description ? (
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
            aria-label="Cerrar"
          >
            <FiX className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>
        <div className={`${bodyMaxHeightClass} overflow-y-auto px-5 py-5 sm:px-6`}>
          <div className="flex flex-col gap-5">{children}</div>
        </div>
        <div className="border-t border-slate-100 bg-slate-50/90 px-5 py-4 sm:px-6">{footer}</div>
      </div>
    </div>
  );
}
