"use client";

import React from "react";
import { FiClipboard } from "react-icons/fi";
import type { SolicitudCompra } from "@/app/types/solicitudCompra";
import { formatKgEs } from "@/app/lib/decimalEs";
import { ModalPlantilla } from "@/app/components/ui/ModalPlantilla";

interface Props {
  solicitud: SolicitudCompra | null;
  onClose: () => void;
}

export function SolicitudDetalleModal({ solicitud, onClose }: Props) {
  if (!solicitud) return null;

  const lineItems = solicitud.lineItems ?? [];

  return (
    <ModalPlantilla
      open
      onClose={onClose}
      titulo="Detalle de solicitud"
      tituloId="solicitud-detalle-title"
      headerIcon={<FiClipboard className="h-7 w-7 text-blue-600" strokeWidth={2} aria-hidden />}
      zIndexClass="z-50"
      maxWidthClass="max-w-lg"
      cardMaxHeightClass="max-h-[90vh]"
      subtitulo={<span className="font-mono font-semibold text-slate-800">{solicitud.numero}</span>}
      footer={
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-base font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Cerrar
          </button>
        </div>
      }
    >
      <p className="mb-2 text-base font-bold uppercase tracking-wide text-slate-500">Productos y peso</p>
      {lineItems.length === 0 ? (
        <p className="text-base text-slate-500">Esta solicitud no tiene líneas registradas.</p>
      ) : (
        <ul className="space-y-3">
          {lineItems.map((li, i) => (
            <li
              key={`${li.catalogoProductId}-${i}`}
              className="rounded-lg border border-cyan-100 bg-cyan-50/50 px-4 py-3"
            >
              <p className="font-medium text-slate-900">{li.titleSnapshot || "—"}</p>
              <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-base text-slate-600">
                <span>
                  <span className="text-slate-500">Peso:</span>{" "}
                  <span className="tabular-nums font-semibold text-slate-900">
                    {formatKgEs(Number(li.pesoKg))} kg
                  </span>
                </span>
                {li.skuSnapshot ? (
                  <span className="text-base text-slate-500">SKU {li.skuSnapshot}</span>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </ModalPlantilla>
  );
}
