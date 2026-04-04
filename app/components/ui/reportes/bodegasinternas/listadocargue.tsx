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

const numberFormatter = new Intl.NumberFormat("es-CO", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function dashStr(v: string | null | undefined): string {
  if (v == null) return "—";
  const t = String(v).trim();
  return t === "" ? "—" : t;
}

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
          <table className="w-max min-w-full text-left border-separate border-spacing-0">
            <thead>
              <tr className="bg-white">
                <th className="whitespace-nowrap px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200">
                  RD
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200">
                  Renglón
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200">
                  Lote
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200">
                  Descripción
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200">
                  Marca
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200">
                  Embalaje
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200 text-right">
                  Peso Unit.
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200 text-right">
                  Piezas
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200 text-right">
                  Kilos actual
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200">
                  Caducidad
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200">
                  Fecha ingreso
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200">
                  Llave única
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200 text-center">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody className="text-slate-700 text-[14px]">
              {filasPagina.map((d) => (
                <tr key={d.key} className="hover:bg-slate-50/80 transition-colors">
                  <td className="whitespace-nowrap px-4 py-4 border-b border-slate-100 text-slate-700 tabular-nums">
                    {dashStr(d.rd)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 border-b border-slate-100 text-slate-700 tabular-nums">
                    {dashStr(d.renglon)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 border-b border-slate-100 font-bold text-slate-900">
                    {dashStr(d.lote)}
                  </td>
                  <td
                    className="whitespace-nowrap px-4 py-4 border-b border-slate-100"
                    title={d.descripcion || undefined}
                  >
                    {d.descripcion.trim() ? (
                      <span className="inline-block rounded-lg bg-slate-100 px-3 py-1.5 font-semibold text-[13px] text-slate-700">
                        {d.descripcion}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 border-b border-slate-100 text-slate-700">
                    {dashStr(d.marca)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 border-b border-slate-100 text-slate-700">
                    {dashStr(d.embalaje)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 border-b border-slate-100 text-right tabular-nums">
                    {d.pesoUnitario !== null
                      ? `${numberFormatter.format(d.pesoUnitario)} Kg`
                      : "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 border-b border-slate-100 text-right tabular-nums">
                    {d.piezas !== null ? numberFormatter.format(d.piezas) : "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 border-b border-slate-100 text-right font-bold text-slate-900 tabular-nums">
                    {d.kilosActual !== null
                      ? `${numberFormatter.format(d.kilosActual)} Kg`
                      : "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 border-b border-slate-100 text-slate-700">
                    {dashStr(d.caducidad)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 border-b border-slate-100 text-slate-700">
                    {dashStr(d.fechaIngreso)}
                  </td>
                  <td
                    className="whitespace-nowrap px-4 py-4 border-b border-slate-100 text-slate-700"
                    title={d.llaveUnica ?? undefined}
                  >
                    {dashStr(d.llaveUnica)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 border-b border-slate-100 text-center">
                    <div className="flex items-center justify-center gap-2 font-medium">
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${d.esAlerta ? "bg-red-500" : "bg-[#A8D5BA]"}`}
                        aria-hidden
                      />
                      <span className={d.esAlerta ? "font-semibold text-red-700" : "text-slate-700"}>
                        {d.estadoTexto}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {filas.length > 0 ? (
        <div
          className="shrink-0 border-t-2 border-[#A8D5BA]/50 bg-linear-to-r from-slate-50 via-white to-[#A8D5BA]/25 px-5 py-4"
          role="region"
          aria-label="Total de inventario"
        >
          <div className="flex flex-col items-stretch sm:flex-row sm:items-center sm:justify-end sm:gap-4">
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
        </div>
      ) : null}

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
