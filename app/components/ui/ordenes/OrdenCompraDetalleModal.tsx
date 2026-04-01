"use client";

import React from "react";
import { HiOutlineXMark } from "react-icons/hi2";
import type { OrdenCompra } from "@/app/types/ordenCompra";

interface Props {
  orden: OrdenCompra | null;
  onClose: () => void;
}

export function OrdenCompraDetalleModal({ orden, onClose }: Props) {
  if (!orden) return null;

  const lineItems = orden.lineItems ?? [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="orden-detalle-title"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[12px] border border-gray-100 bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="orden-detalle-title" className="text-lg font-semibold text-gray-900">
              Detalle de orden
            </h2>
            <p className="mt-1 font-mono text-sm font-bold text-slate-800">{orden.numero}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 text-gray-400 hover:text-gray-600"
            aria-label="Cerrar"
          >
            <HiOutlineXMark size={24} />
          </button>
        </div>

        <dl className="mb-5 space-y-2 border-b border-slate-100 pb-4 text-sm">
          <div className="flex flex-wrap gap-x-2 gap-y-1">
            <dt className="font-semibold text-slate-500">Proveedor</dt>
            <dd className="text-slate-900">{orden.proveedorNombre || "—"}</dd>
          </div>
          <div className="flex flex-wrap gap-x-2 gap-y-1">
            <dt className="font-semibold text-slate-500">Fecha</dt>
            <dd className="text-slate-900">{orden.fecha}</dd>
          </div>
          <div className="flex flex-wrap gap-x-2 gap-y-1">
            <dt className="font-semibold text-slate-500">Estado</dt>
            <dd>
              <span
                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  orden.estado === "Terminado"
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-sky-100 text-sky-900"
                }`}
              >
                {orden.estado}
              </span>
            </dd>
          </div>
        </dl>

        <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">Productos</p>
        {lineItems.length === 0 ? (
          <p className="text-sm text-slate-500">Esta orden no tiene líneas registradas.</p>
        ) : (
          <ul className="space-y-3">
            {lineItems.map((li, i) => (
              <li
                key={`${li.catalogoProductId}-${i}`}
                className="rounded-lg border border-slate-100 bg-slate-50/80 px-4 py-3"
              >
                <p className="font-medium text-slate-900">{li.titleSnapshot || "—"}</p>
                <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm text-slate-600">
                  {li.pesoKg != null &&
                  Number.isFinite(Number(li.pesoKg)) &&
                  Number(li.pesoKg) > 0 ? (
                    <span>
                      <span className="text-slate-500">Peso:</span>{" "}
                      <span className="tabular-nums font-semibold text-slate-900">{li.pesoKg} kg</span>
                    </span>
                  ) : (
                    <span>
                      <span className="text-slate-500">Cantidad:</span>{" "}
                      <span className="tabular-nums font-semibold text-slate-900">{li.cantidad}</span>
                    </span>
                  )}
                  {li.skuSnapshot ? (
                    <span className="text-xs text-slate-500">SKU {li.skuSnapshot}</span>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[8px] bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
