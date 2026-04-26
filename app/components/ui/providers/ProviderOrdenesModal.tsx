"use client";

import { HiCheckCircle, HiOutlineXMark, HiXCircle } from "react-icons/hi2";
import type { Provider } from "@/app/types/provider";
import { ordenCompraEstadoBadgeClass } from "@/app/types/ordenCompra";
import type { LineaRecepcionDiff } from "@/app/lib/ordenCompraRecepcionDiff";

export type ProveedorOrdenCompraRow = {
  id: string;
  ordenCompra: string;
  estado: string;
  /** Resumen de líneas vinculadas al catálogo */
  resumenProductos?: string;
  lineasDiff?: LineaRecepcionDiff[];
  adicionales?: string[];
  tieneRecepcion?: boolean;
};

interface ProviderOrdenesModalProps {
  isOpen: boolean;
  provider: Provider | null;
  ordenes: ProveedorOrdenCompraRow[];
  loading?: boolean;
  onClose: () => void;
}

export function ProviderOrdenesModal({
  isOpen,
  provider,
  ordenes,
  loading = false,
  onClose,
}: ProviderOrdenesModalProps) {
  if (!isOpen || !provider) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/20 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="provider-ordenes-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[min(90vh,900px)] w-full max-w-4xl flex-col overflow-hidden rounded-[12px] border border-gray-100 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[#eef1f4] px-6 py-4">
          <div>
            <h2 id="provider-ordenes-title" className="app-title">
              Órdenes de compra
            </h2>
            <p className="mt-0.5 text-sm text-[#6B7280]">{provider.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 transition-colors hover:text-gray-600"
            aria-label="Cerrar"
          >
            <HiOutlineXMark size={24} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[520px] border-collapse text-left text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_0_rgb(226_232_240)]">
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="bg-slate-50 px-4 py-3 text-left text-base font-bold uppercase tracking-wide text-slate-500">
                    Orden de compra
                  </th>
                  <th className="bg-slate-50 px-4 py-3 text-left text-base font-bold uppercase tracking-wide text-slate-500">
                    Estado
                  </th>
                  <th className="bg-slate-50 px-4 py-3 text-left text-base font-bold uppercase tracking-wide text-slate-500">
                    Pedido vs ingreso (bodega)
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="border-b border-slate-100 px-4 py-12 text-center text-sm text-slate-500"
                    >
                      Cargando órdenes…
                    </td>
                  </tr>
                ) : ordenes.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="border-b border-slate-100 px-4 py-12 text-center text-sm text-slate-500"
                    >
                      No hay órdenes de compra registradas para este proveedor.
                    </td>
                  </tr>
                ) : (
                  ordenes.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-slate-100 transition-colors hover:bg-violet-50/80"
                    >
                      <td className="whitespace-nowrap px-4 py-3 align-top font-mono text-base font-semibold text-slate-900">
                        {row.ordenCompra}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 align-top">
                        <span
                          className={`inline-flex rounded-full border-0 px-2.5 py-0.5 text-xs font-semibold ${ordenCompraEstadoBadgeClass(row.estado)}`}
                        >
                          {row.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-top text-base text-slate-700">
                        {!row.tieneRecepcion ? (
                          <span className="text-slate-400">Aún no hay recepción en bodega.</span>
                        ) : !row.lineasDiff?.length ? (
                          <span className="text-slate-400">Sin líneas en la orden.</span>
                        ) : (
                          <ul className="space-y-1.5">
                            {row.lineasDiff.map((ln, lnIdx) => (
                              <li
                                key={`${row.id}-ln-${lnIdx}-${ln.catalogoProductId}`}
                                className="flex items-start gap-2 text-base leading-snug"
                              >
                                {ln.ok ? (
                                  <HiCheckCircle
                                    className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
                                    aria-label="Coincide con el pedido"
                                  />
                                ) : (
                                  <HiXCircle
                                    className="mt-0.5 h-4 w-4 shrink-0 text-rose-600"
                                    aria-label="No coincide con el pedido"
                                  />
                                )}
                                <span>
                                  <span className="font-medium text-slate-800">{ln.titleSnapshot}</span>
                                  <span className="text-slate-500">
                                    {" "}
                                    · pedido {ln.pedidoLabel} → recibido {ln.recibidoLabel}
                                  </span>
                                </span>
                              </li>
                            ))}
                            {(row.adicionales ?? []).map((txt, i) => (
                              <li
                                key={`extra-${row.id}-${i}`}
                                className="flex items-start gap-2 text-base text-amber-900"
                              >
                                <HiXCircle
                                  className="mt-0.5 h-4 w-4 shrink-0 text-amber-600"
                                  aria-label="Producto adicional"
                                />
                                <span>{txt}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="shrink-0 border-t border-[#eef1f4] bg-white px-6 py-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-[8px] border border-gray-200 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
