"use client";

import React, { useCallback, useEffect, useState } from "react";
import { OrdenVentaService } from "@/app/services/ordenVentaService";
import type { VentaPendienteCartonaje } from "@/app/types/ventaCuenta";
import type { WarehouseMeta } from "@/app/interfaces/bodega";
import { MdShoppingBag } from "react-icons/md";
import { IoCloseOutline } from "react-icons/io5";

type Props = {
  warehousesFallback?: WarehouseMeta[];
};

function nombresCortos(o: VentaPendienteCartonaje): string {
  const names = (o.lineItems ?? []).map((li) => li.titleSnapshot).filter(Boolean);
  return names.length ? names.slice(0, 3).join(" · ") + (names.length > 3 ? "…" : "") : "—";
}

function ventaEstadoBadgeClass(estado: string): string {
  const e = String(estado ?? "").trim().toLowerCase();
  if (e.startsWith("cerrado")) return "bg-slate-200 text-slate-800";
  if (e === "transporte") return "bg-sky-100 text-sky-900";
  if (e === "iniciado" || e === "pendiente") return "bg-amber-100 text-amber-900";
  return "bg-emerald-100 text-emerald-900";
}

export default function CustodioOrdenesVentaTab({ warehousesFallback = [] }: Props) {
  const [list, setList] = useState<VentaPendienteCartonaje[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detalle, setDetalle] = useState<VentaPendienteCartonaje | null>(null);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    void OrdenVentaService.listTodasOrdenesVentaGlobal(400)
      .then(setList)
      .catch(() => {
        setList([]);
        setError(
          "No se pudieron cargar las órdenes de venta. Revisá permisos de Firestore, conexión y la colección clientes/ordenesVenta.",
        );
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const nombreBodega = (wid: string | undefined) => {
    const w = String(wid ?? "").trim();
    if (!w) return "—";
    const m = warehousesFallback.find((x) => x.id === w);
    return m?.name?.trim() || w;
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="rounded-2xl bg-teal-100 p-3 text-teal-800">
            <MdShoppingBag size={28} />
          </span>
          <div>
            <h2 className="app-title">Órdenes de venta</h2>
            <p className="mt-1 text-sm text-slate-600">
              Listado global de todas las cuentas. Abrí el detalle para ver líneas, comprador y destino.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => reload()}
          disabled={loading}
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Actualizar
        </button>
      </div>

      {error ? (
        <p className="mb-4 rounded-lg border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-slate-200">
        <div className="max-h-[min(70vh,32rem)] overflow-auto">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-3 py-2 text-base font-bold uppercase tracking-wide text-slate-500">
                  Orden
                </th>
                <th className="px-3 py-2 text-base font-bold uppercase tracking-wide text-slate-500">
                  Cuenta
                </th>
                <th className="px-3 py-2 text-base font-bold uppercase tracking-wide text-slate-500">
                  Comprador
                </th>
                <th className="px-3 py-2 text-base font-bold uppercase tracking-wide text-slate-500">
                  Estado
                </th>
                <th className="px-3 py-2 text-base font-bold uppercase tracking-wide text-slate-500">
                  Fecha
                </th>
                <th className="px-3 py-2 text-base font-bold uppercase tracking-wide text-slate-500">
                  Destino
                </th>
                <th className="px-3 py-2 text-base font-bold uppercase tracking-wide text-slate-500">
                  Productos
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-3 py-12 text-center text-slate-500">
                    Cargando…
                  </td>
                </tr>
              ) : list.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-12 text-center text-slate-500">
                    No hay órdenes de venta registradas.
                  </td>
                </tr>
              ) : (
                list.map((o) => (
                  <tr
                    key={`${o.idClienteDueno}-${o.id}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => setDetalle(o)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setDetalle(o);
                      }
                    }}
                    className="cursor-pointer border-b border-slate-100 transition hover:bg-teal-50/60"
                  >
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-xs font-semibold text-slate-900">
                      {o.numero}
                    </td>
                    <td className="px-3 py-2 font-mono text-base text-slate-600">{o.codeCuenta || "—"}</td>
                    <td className="max-w-[140px] px-3 py-2 text-xs text-slate-800">
                      <span className="line-clamp-2" title={o.compradorNombre}>
                        {o.compradorNombre || "—"}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-base font-semibold ${ventaEstadoBadgeClass(o.estado)}`}
                      >
                        {o.estado}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-xs text-slate-700">{o.fecha || "—"}</td>
                    <td className="max-w-[160px] px-3 py-2 text-base text-slate-600">
                      <span
                        className="line-clamp-2"
                        title={o.destinoWarehouseNombre || nombreBodega(o.destinoWarehouseId)}
                      >
                        {(() => {
                          const nb = nombreBodega(o.destinoWarehouseId);
                          return nb !== "—" ? nb : o.destinoWarehouseNombre || "—";
                        })()}
                      </span>
                    </td>
                    <td className="max-w-[180px] px-3 py-2 text-xs text-slate-700">
                      <span className="line-clamp-2" title={nombresCortos(o)}>
                        {nombresCortos(o)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {detalle ? (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={() => setDetalle(null)}
        >
          <div
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 flex items-start justify-between gap-3 border-b border-slate-100 bg-linear-to-r from-teal-50 to-white px-6 py-4">
              <div>
                <p className="font-mono text-lg font-bold text-slate-900">{detalle.numero}</p>
                <p className="mt-1 text-xs text-slate-500">Cuenta {detalle.codeCuenta || "—"}</p>
              </div>
              <button
                type="button"
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                onClick={() => setDetalle(null)}
                aria-label="Cerrar"
              >
                <IoCloseOutline className="h-6 w-6" />
              </button>
            </div>
            <div className="space-y-4 px-6 py-4 text-sm text-slate-700">
              <div className="flex flex-wrap justify-between gap-2">
                <span className="text-slate-500">Estado</span>
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${ventaEstadoBadgeClass(detalle.estado)}`}
                >
                  {detalle.estado}
                </span>
              </div>
              <div className="flex flex-wrap justify-between gap-2">
                <span className="text-slate-500">Comprador</span>
                <span className="max-w-[60%] text-right font-medium">{detalle.compradorNombre || "—"}</span>
              </div>
              <div className="flex flex-wrap justify-between gap-2">
                <span className="text-slate-500">Fecha</span>
                <span>{detalle.fecha || "—"}</span>
              </div>
              <div className="flex flex-wrap justify-between gap-2">
                <span className="text-slate-500">Destino bodega</span>
                <span className="max-w-[60%] text-right">
                  {detalle.destinoWarehouseNombre || nombreBodega(detalle.destinoWarehouseId) || "—"}
                </span>
              </div>
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Líneas</p>
                <ul className="space-y-2 rounded-lg border border-slate-100 bg-slate-50/80 p-3">
                  {(detalle.lineItems ?? []).map((li, idx) => (
                    <li key={idx} className="flex justify-between gap-2 text-xs">
                      <span className="min-w-0 flex-1">{li.titleSnapshot || "—"}</span>
                      <span className="shrink-0 font-mono text-slate-600">×{li.cantidad}</span>
                    </li>
                  ))}
                </ul>
              </div>
              {detalle.recepcionBodega ? (
                <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-3 text-xs">
                  <p className="font-semibold text-emerald-900">Recepción en bodega</p>
                  <p className="mt-1 text-emerald-800">
                    {detalle.recepcionBodega.sinDiferencias ? "Sin diferencias" : "Con diferencias"} · cerrada{" "}
                    {detalle.recepcionBodega.cerradaAt
                      ? new Date(detalle.recepcionBodega.cerradaAt).toLocaleString("es-CO")
                      : "—"}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
