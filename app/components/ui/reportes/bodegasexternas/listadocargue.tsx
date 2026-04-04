
"use client";

import { useEffect, useMemo, useState } from "react";
import type { FridemInventoryRow } from "@/lib/fridemInventory";

type Props = {
  items: FridemInventoryRow[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  /** Momento en que los datos se obtuvieron correctamente desde la API */
  lastUpdatedAt?: Date | null;
};

const dateTimeFormatter = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "short",
  timeStyle: "short",
});

const numberFormatter = new Intl.NumberFormat("es-CO", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export default function ListadoCargue({ items, loading, error, onRetry, lastUpdatedAt = null }: Props) {
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);

  const totalKg = useMemo(
    () =>
      items.reduce(
        (acc, current) =>
          acc + (Number.isFinite(current.kilosActual ?? current.kilos) ? (current.kilosActual ?? current.kilos) : 0),
        0,
      ),
    [items],
  );

  useEffect(() => {
    setPage(1);
  }, [items]);

  const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageItems = useMemo(
    () => items.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [items, currentPage],
  );

  const showEmpty = !loading && !error && items.length === 0;

  return (
    <div className="border border-slate-100 rounded-2xl overflow-hidden font-['Inter'] bg-white shadow-sm">
      <div className="bg-[#A8D5BA]/20 p-5 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="text-[18px] font-bold text-slate-800 tracking-tight uppercase">En Inventario en bodega externa</h3>
          <p className="text-xs text-slate-600 mt-1">
            {items.length} registros · Página {currentPage} de {pageCount}
          </p>
          {lastUpdatedAt ? (
            <p className="text-xs text-slate-500 mt-1.5 tabular-nums">
              Última actualización:{" "}
              <span className="font-semibold text-slate-700">{dateTimeFormatter.format(lastUpdatedAt)}</span>
            </p>
          ) : !loading ? (
            <p className="text-xs text-slate-400 mt-1.5">Aún no hay datos cargados</p>
          ) : null}
        </div>

        <div className="flex items-center gap-3 self-start sm:self-center">
          {error ? <span className="text-xs text-red-600 font-semibold max-w-[220px] text-right">{error}</span> : null}
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              disabled={loading}
              className="px-3 py-2 text-xs font-bold uppercase tracking-wider rounded-xl border border-slate-200 bg-white shadow-sm hover:border-slate-300 disabled:opacity-50 shrink-0"
            >
              {loading ? "Actualizando…" : "Recargar"}
            </button>
          ) : null}
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-max min-w-full text-left border-separate border-spacing-0">
          <thead>
            <tr className="bg-white">
              <th className="whitespace-nowrap px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200">RD</th>
              <th className="whitespace-nowrap px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200">Renglón</th>
              <th className="whitespace-nowrap px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200">Lote</th>
              <th className="whitespace-nowrap px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200">Descripción</th>
              <th className="whitespace-nowrap px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200">Marca</th>
              <th className="whitespace-nowrap px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200">Embalaje</th>
              <th className="whitespace-nowrap px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200 text-right">Peso Unit.</th>
              <th className="whitespace-nowrap px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200 text-right">Piezas</th>
              <th className="whitespace-nowrap px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200 text-right">Kilos actual</th>
              <th className="whitespace-nowrap px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200">Caducidad</th>
              <th className="whitespace-nowrap px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200">Fecha ingreso</th>
              <th className="whitespace-nowrap px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200">Llave única</th>
              <th className="whitespace-nowrap px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200 text-center">Estado</th>
            </tr>
          </thead>
          <tbody className="text-slate-700 text-[14px]">
            {loading
              ? Array.from({ length: 4 }).map((_, idx) => (
                  <tr key={`skeleton-${idx}`} className="animate-pulse">
                    <td className="whitespace-nowrap px-4 py-4 border-b border-slate-100"><div className="h-4 w-20 rounded bg-slate-200" /></td>
                    <td className="whitespace-nowrap px-4 py-4 border-b border-slate-100"><div className="h-4 w-12 rounded bg-slate-200" /></td>
                    <td className="whitespace-nowrap px-4 py-4 border-b border-slate-100"><div className="h-4 w-20 rounded bg-slate-200" /></td>
                    <td className="whitespace-nowrap px-4 py-4 border-b border-slate-100"><div className="h-4 w-[28rem] max-w-none rounded bg-slate-200" /></td>
                    <td className="whitespace-nowrap px-4 py-4 border-b border-slate-100"><div className="h-4 w-24 rounded bg-slate-200" /></td>
                    <td className="whitespace-nowrap px-4 py-4 border-b border-slate-100"><div className="h-4 w-16 rounded bg-slate-200" /></td>
                    <td className="whitespace-nowrap px-4 py-4 border-b border-slate-100 text-right"><div className="h-4 w-16 rounded bg-slate-200 inline-block" /></td>
                    <td className="whitespace-nowrap px-4 py-4 border-b border-slate-100 text-right"><div className="h-4 w-14 rounded bg-slate-200 inline-block" /></td>
                    <td className="whitespace-nowrap px-4 py-4 border-b border-slate-100 text-right"><div className="h-4 w-16 rounded bg-slate-200 inline-block" /></td>
                    <td className="whitespace-nowrap px-4 py-4 border-b border-slate-100"><div className="h-4 w-20 rounded bg-slate-200" /></td>
                    <td className="whitespace-nowrap px-4 py-4 border-b border-slate-100"><div className="h-4 w-24 rounded bg-slate-200" /></td>
                    <td className="whitespace-nowrap px-4 py-4 border-b border-slate-100"><div className="h-4 w-32 rounded bg-slate-200" /></td>
                    <td className="whitespace-nowrap px-4 py-4 border-b border-slate-100 text-center"><div className="h-4 w-20 rounded bg-slate-200 inline-block" /></td>
                  </tr>
                ))
              : null}

            {showEmpty ? (
              <tr>
                <td colSpan={13} className="px-4 py-8 text-center text-sm text-slate-500">
                  No hay inventario disponible en la base externa.
                </td>
              </tr>
            ) : null}

            {!loading && !showEmpty
              ? pageItems.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="whitespace-nowrap px-4 py-4 border-b border-slate-100 text-slate-700 tabular-nums">{d.rd ?? "—"}</td>
                    <td className="whitespace-nowrap px-4 py-4 border-b border-slate-100 text-slate-700 tabular-nums">{d.renglon ?? "—"}</td>
                    <td className="whitespace-nowrap px-4 py-4 border-b border-slate-100 font-bold text-slate-900">{d.lote}</td>
                    <td
                      className="whitespace-nowrap px-4 py-4 border-b border-slate-100"
                      title={d.descripcion}
                    >
                      <span className="inline-block rounded-lg bg-slate-100 px-3 py-1.5 font-semibold text-[13px] text-slate-700">
                        {d.descripcion}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 border-b border-slate-100 text-slate-700">{d.marca || ""}</td>
                    <td className="whitespace-nowrap px-4 py-4 border-b border-slate-100 text-slate-700">{d.embalaje || ""}</td>
                    <td className="whitespace-nowrap px-4 py-4 border-b border-slate-100 text-right tabular-nums">
                      {d.pesoUnitario !== null ? `${numberFormatter.format(d.pesoUnitario)} Kg` : "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 border-b border-slate-100 text-right tabular-nums">
                      {d.piezas !== null ? numberFormatter.format(d.piezas) : "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 border-b border-slate-100 text-right font-bold text-slate-900 tabular-nums">
                      {numberFormatter.format(d.kilosActual ?? d.kilos)} Kg
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 border-b border-slate-100 text-slate-700">{d.caducidad || ""}</td>
                    <td className="whitespace-nowrap px-4 py-4 border-b border-slate-100 text-slate-700">{d.fechaIngreso || ""}</td>
                    <td className="whitespace-nowrap px-4 py-4 border-b border-slate-100 text-slate-700" title={d.llaveUnica ?? undefined}>
                      {d.llaveUnica ?? ""}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 border-b border-slate-100 text-center">
                      <div className="flex items-center justify-center gap-2 font-medium">
                        <span className="h-2 w-2 shrink-0 rounded-full bg-[#A8D5BA]" aria-hidden />
                        {d.estado}
                      </div>
                    </td>
                  </tr>
                ))
              : null}
          </tbody>
        </table>
      </div>

      {items.length > 0 ? (
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

      {items.length > 0 ? (
        <div className="flex flex-col gap-3 border-t border-slate-100 bg-white px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs text-slate-500 tabular-nums">
            Mostrando {pageItems.length} de {items.length} registros
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={loading || currentPage === 1}
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
              disabled={loading || currentPage === pageCount}
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