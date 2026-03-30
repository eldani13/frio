"use client";

import { HiOutlineXMark } from "react-icons/hi2";
import type { Provider } from "@/app/types/provider";

export type ProveedorOrdenCompraRow = {
  id: string;
  ordenCompra: string;
  estado: string;
  /** Resumen de líneas vinculadas al catálogo */
  resumenProductos?: string;
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
        className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-[12px] border border-gray-100 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#eef1f4] px-6 py-4">
          <div>
            <h2 id="provider-ordenes-title" className="text-lg font-semibold text-gray-900">
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

        <div className="overflow-hidden p-5">
          <div className="overflow-x-auto overflow-y-auto rounded-[12px] border border-[#e5e7eb]">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[#eef1f4] bg-[#F8FAFB]">
                  <th className="px-5 py-3.5 text-left text-[12px] font-semibold uppercase tracking-wide text-[#6B7280]">
                    Orden de compra
                  </th>
                  {/* <th className="px-5 py-3.5 text-left text-[12px] font-semibold uppercase tracking-wide text-[#6B7280]">
                    Productos (catálogo)
                  </th> */}
                  <th className="px-5 py-3.5 text-left text-[12px] font-semibold uppercase tracking-wide text-[#6B7280]">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={3} className="px-5 py-10 text-center text-sm text-[#6B7280]">
                      Cargando órdenes…
                    </td>
                  </tr>
                ) : ordenes.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-5 py-10 text-center text-sm text-[#6B7280]">
                      No hay órdenes de compra registradas para este proveedor.
                    </td>
                  </tr>
                ) : (
                  ordenes.map((row) => (
                    <tr
                      key={row.id}
                      className="border-t border-[#f3f4f6] transition-colors hover:bg-[#F8FAFB]"
                    >
                      <td className="px-5 py-3.5 align-middle font-mono text-[14px] font-bold text-[#0D3B43] whitespace-nowrap">
                        {row.ordenCompra}
                      </td>
                      {/* <td className="max-w-md px-5 py-3.5 align-middle text-[13px] text-[#374151]">
                        <span className="line-clamp-2" title={row.resumenProductos}>
                          {row.resumenProductos || "—"}
                        </span>
                      </td> */}
                      <td className="px-5 py-3.5 align-middle whitespace-nowrap">
                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-800">
                          {row.estado}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="border-t border-[#eef1f4] px-6 py-3">
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
