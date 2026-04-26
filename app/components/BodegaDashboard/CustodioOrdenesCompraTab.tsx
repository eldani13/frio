"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { compareOrdenCompraNewestFirst } from "@/lib/ordenCompraSort";
import {
  OrdenCompraService,
  type OrdenCompraPendienteRecepcion,
} from "@/app/services/ordenCompraService";
import { OrdenCompraDetalleModal } from "@/app/components/ui/ordenes/OrdenCompraDetalleModal";
import { ordenCompraEstadoBadgeClass } from "@/app/types/ordenCompra";
import type { WarehouseMeta } from "@/app/interfaces/bodega";
import { MdAssignment } from "react-icons/md";

type Props = {
  warehousesFallback?: WarehouseMeta[];
};

function nombresCortos(o: OrdenCompraPendienteRecepcion): string {
  const names = (o.lineItems ?? []).map((li) => li.titleSnapshot).filter(Boolean);
  return names.length ? names.slice(0, 3).join(" · ") + (names.length > 3 ? "…" : "") : "—";
}

export default function CustodioOrdenesCompraTab({ warehousesFallback = [] }: Props) {
  const [list, setList] = useState<OrdenCompraPendienteRecepcion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detalle, setDetalle] = useState<OrdenCompraPendienteRecepcion | null>(null);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    void OrdenCompraService.listTodasOrdenesCompraGlobal(400)
      .then(setList)
      .catch(() => {
        setList([]);
        setError(
          "No se pudieron cargar las órdenes. Revisá permisos de Firestore, conexión y la colección clientes.",
        );
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const listTabla = useMemo(() => [...list].sort(compareOrdenCompraNewestFirst), [list]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="rounded-2xl bg-violet-100 p-3 text-violet-800">
            <MdAssignment size={28} />
          </span>
          <div>
            <h2 className="app-title">Órdenes de compra</h2>
            <p className="mt-1 text-sm text-slate-600">
              Listado global de todas las cuentas. Abrí el detalle para ver líneas, destino y estados.
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
                  Proveedor
                </th>
                <th className="px-3 py-2 text-base font-bold uppercase tracking-wide text-slate-500">
                  Estado
                </th>
                <th className="px-3 py-2 text-base font-bold uppercase tracking-wide text-slate-500">
                  Fecha OC
                </th>
                <th className="px-3 py-2 text-base font-bold uppercase tracking-wide text-slate-500">
                  Llegada
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
                  <td colSpan={8} className="px-3 py-12 text-center text-slate-500">
                    Cargando…
                  </td>
                </tr>
              ) : listTabla.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-12 text-center text-slate-500">
                    No hay órdenes registradas.
                  </td>
                </tr>
              ) : (
                listTabla.map((o) => (
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
                    className="cursor-pointer border-b border-slate-100 transition hover:bg-violet-50/60"
                  >
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-xs font-semibold text-slate-900">
                      {o.numero}
                    </td>
                    <td className="px-3 py-2 font-mono text-base text-slate-600">{o.codeCuenta || "—"}</td>
                    <td className="max-w-[120px] px-3 py-2 text-xs text-slate-800">
                      <span className="line-clamp-2" title={o.proveedorNombre}>
                        {o.proveedorNombre || "—"}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-base font-semibold ${ordenCompraEstadoBadgeClass(o.estado)}`}
                      >
                        {o.estado}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-xs text-slate-700">{o.fecha || "—"}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-xs text-slate-700">
                      {o.fechaLlegadaEstipulada?.trim() || "—"}
                    </td>
                    <td className="max-w-[140px] px-3 py-2 text-base text-slate-600">
                      {o.destinoTipo ? `${o.destinoTipo === "interna" ? "Int." : "Ext."} ` : ""}
                      <span className="line-clamp-2" title={o.destinoWarehouseNombre}>
                        {o.destinoWarehouseNombre || "—"}
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

      <OrdenCompraDetalleModal
        orden={detalle}
        onClose={() => setDetalle(null)}
        esOperadorCuentas={false}
        idCliente={detalle?.idClienteDueno ?? ""}
        codeCuenta={detalle?.codeCuenta ?? ""}
        warehousesFallback={warehousesFallback}
      />
    </section>
  );
}
