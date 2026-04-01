"use client";

import { useEffect, useMemo, useState } from "react";
import {
  subscribeWarehouseState,
  type CloudWarehouseState,
} from "@/lib/bodegaCloudState";
import {
  filasInventarioInternoFromSlots,
  type FilaInventarioInterno,
} from "@/lib/bodegaInternalInventoryRows";

const PAGE_SIZE = 10;

type Props = {
  warehouseId?: string;
  onTotalChange?: (totalKg: number) => void;
};

export default function ListadoCargue({ warehouseId, onTotalChange }: Props) {
  const [cloud, setCloud] = useState<CloudWarehouseState | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const id = warehouseId?.trim();
    if (!id) {
      setCloud(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = subscribeWarehouseState(id, (s) => {
      setCloud(s);
      setLoading(false);
    });
    return () => unsub();
  }, [warehouseId]);

  useEffect(() => {
    setPage(1);
  }, [warehouseId]);

  const filas = useMemo(
    () => filasInventarioInternoFromSlots(cloud?.slots ?? []),
    [cloud?.slots],
  );

  const pageCount = Math.max(1, Math.ceil(filas.length / PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, page), pageCount);

  useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), pageCount));
  }, [pageCount]);

  const filasPagina = useMemo(
    () => filas.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filas, currentPage],
  );

  const totalKg = useMemo(
    () =>
      filas.reduce((acc: number, r: FilaInventarioInterno) => acc + (r.cantidadKg ?? 0), 0),
    [filas],
  );

  useEffect(() => {
    if (typeof onTotalChange !== "function") return;
    if (!warehouseId?.trim()) {
      onTotalChange(0);
      return;
    }
    onTotalChange(totalKg);
  }, [warehouseId, totalKg, onTotalChange]);

  if (!warehouseId?.trim()) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Elegí una bodega en el paso anterior para ver el inventario del mapa.
      </div>
    );
  }

  if (loading && !cloud) {
    return (
      <p className="text-slate-500 text-sm py-8 text-center italic">
        Cargando posiciones desde la bodega…
      </p>
    );
  }

  return (
    <div className="border border-slate-100 rounded-2xl overflow-hidden font-['Inter'] bg-white shadow-sm">
      <div className="bg-[#A8D5BA]/20 p-5 border-b border-slate-100">
        <h3 className="text-[18px] font-bold text-slate-800 tracking-tight uppercase">
          Inventario en bodega INTERNA
        </h3>
        {filas.length > 0 ? (
          <p className="mt-1 text-xs text-slate-600 tabular-nums">
            {filas.length} {filas.length === 1 ? "registro" : "registros"} · Página {currentPage} de{" "}
            {pageCount}
          </p>
        ) : null}
      </div>

      <div className="overflow-x-auto">
        {filas.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">
            No hay posiciones ocupadas en el mapa de esta bodega.
          </p>
        ) : (
          <table className="w-full text-left border-separate border-spacing-0">
            <thead>
              <tr className="bg-white">
                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center w-24">
                  Posición
                </th>
                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                  Nombre del producto
                </th>
                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">
                  Cantidad (kg)
                </th>
                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center">
                  Temperatura
                </th>
                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody className="text-slate-700 text-[14px]">
              {filasPagina.map((d) => (
                <tr key={d.key} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 border-b border-slate-50 text-center font-bold tabular-nums text-slate-900">
                    {d.posicion}
                  </td>
                  <td className="p-4 border-b border-slate-50">
                    <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg font-semibold text-[12px]">
                      {d.nombre}
                    </span>
                  </td>
                  <td className="p-4 border-b border-slate-50 text-right font-bold text-slate-900 tabular-nums">
                    {d.cantidadKg !== null ? `${d.cantidadKg} kg` : "—"}
                  </td>
                  <td className="p-4 border-b border-slate-50 text-center tabular-nums">
                    {d.temperatura !== null && d.temperatura !== undefined
                      ? `${d.temperatura} °C`
                      : "—"}
                  </td>
                  <td className="p-4 border-b border-slate-50 text-center">
                    <div className="flex justify-center items-center gap-2 font-medium">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          d.esAlerta ? "bg-red-500" : "bg-[#A8D5BA]"
                        }`}
                      />
                      <span className={d.esAlerta ? "text-red-700 font-semibold" : "text-slate-700"}>
                        {d.estadoTexto}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={5} className="p-0 align-top">
                  <div className="mt-1 flex flex-col items-stretch border-t-2 border-[#A8D5BA]/50 bg-linear-to-r from-slate-50 via-white to-[#A8D5BA]/25 sm:flex-row sm:items-center sm:justify-end sm:gap-4 px-5 py-4">
                    <span className="text-center text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500 sm:text-right sm:pt-1">
                      Total cantidad registrada
                    </span>
                    <div className="mt-2 flex justify-center sm:mt-0 sm:justify-end">
                      <span className="inline-flex min-w-[10rem] items-center justify-center rounded-xl border border-[#A8D5BA]/60 bg-white px-5 py-2 text-right text-xl font-extrabold tracking-tight text-slate-900 shadow-sm tabular-nums sm:min-w-[12rem] sm:text-2xl">
                        {totalKg > 0
                          ? `${totalKg.toLocaleString("es-CO", { maximumFractionDigits: 3 })} kg`
                          : "—"}
                      </span>
                    </div>
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {filas.length > 0 ? (
        <div className="flex flex-col gap-3 border-t border-slate-100 bg-white px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs text-slate-500 tabular-nums">
            Mostrando {filasPagina.length} de {filas.length} registros
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold uppercase tracking-wider shadow-sm hover:border-slate-300 disabled:opacity-50"
            >
              Anterior
            </button>
            <span className="text-xs text-slate-600 tabular-nums">
              Página {currentPage} / {pageCount}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              disabled={currentPage === pageCount}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold uppercase tracking-wider shadow-sm hover:border-slate-300 disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
