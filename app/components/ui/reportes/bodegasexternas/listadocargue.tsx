
"use client";

import { useEffect, useMemo, useState } from "react";
import type { FridemInventoryRow } from "@/lib/fridemInventory";

type Props = {
  items: FridemInventoryRow[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
};

const numberFormatter = new Intl.NumberFormat("es-CO", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export default function ListadoCargue({ items, loading, error, onRetry }: Props) {
  const PAGE_SIZE = 20;
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
          <h3 className="text-[18px] font-bold text-slate-800 tracking-tight uppercase">En Inventario BEX</h3>
          <p className="text-xs text-slate-600 mt-1">
            {items.length} registros · Página {currentPage} de {pageCount}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {error ? <span className="text-xs text-red-600 font-semibold">{error}</span> : null}
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              disabled={loading}
              className="px-3 py-2 text-xs font-bold uppercase tracking-wider rounded-xl border border-slate-200 bg-white shadow-sm hover:border-slate-300 disabled:opacity-50"
            >
              {loading ? "Actualizando…" : "Recargar"}
            </button>
          ) : null}
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-separate border-spacing-0">
          <thead>
            <tr className="bg-white">
              <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">RD</th>
              <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Renglón</th>
              <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Lote</th>
              <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Descripción</th>
              <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Marca</th>
              <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Embalaje</th>
              <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Peso Unit.</th>
              <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Piezas</th>
              <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Kilos actual</th>
              <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Caducidad</th>
              <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Fecha ingreso</th>
              <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Llave única</th>
              <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center">Estado</th>
            </tr>
          </thead>
          <tbody className="text-slate-700 text-[14px]">
            {loading
              ? Array.from({ length: 4 }).map((_, idx) => (
                  <tr key={`skeleton-${idx}`} className="animate-pulse">
                    <td className="p-4 border-b border-slate-50"><div className="h-4 w-20 rounded bg-slate-200" /></td>
                    <td className="p-4 border-b border-slate-50"><div className="h-4 w-12 rounded bg-slate-200" /></td>
                    <td className="p-4 border-b border-slate-50"><div className="h-4 w-20 rounded bg-slate-200" /></td>
                    <td className="p-4 border-b border-slate-50"><div className="h-4 w-48 rounded bg-slate-200" /></td>
                    <td className="p-4 border-b border-slate-50"><div className="h-4 w-24 rounded bg-slate-200" /></td>
                    <td className="p-4 border-b border-slate-50"><div className="h-4 w-16 rounded bg-slate-200" /></td>
                    <td className="p-4 border-b border-slate-50 text-right"><div className="h-4 w-16 rounded bg-slate-200 inline-block" /></td>
                    <td className="p-4 border-b border-slate-50 text-right"><div className="h-4 w-14 rounded bg-slate-200 inline-block" /></td>
                    <td className="p-4 border-b border-slate-50 text-right"><div className="h-4 w-16 rounded bg-slate-200 inline-block" /></td>
                    <td className="p-4 border-b border-slate-50"><div className="h-4 w-20 rounded bg-slate-200" /></td>
                    <td className="p-4 border-b border-slate-50"><div className="h-4 w-24 rounded bg-slate-200" /></td>
                    <td className="p-4 border-b border-slate-50"><div className="h-4 w-24 rounded bg-slate-200" /></td>
                    <td className="p-4 border-b border-slate-50 text-center"><div className="h-4 w-20 rounded bg-slate-200 inline-block" /></td>
                  </tr>
                ))
              : null}

            {showEmpty ? (
              <tr>
                <td colSpan={4} className="p-5 text-center text-sm text-slate-500">
                  No hay inventario disponible en la base externa.
                </td>
              </tr>
            ) : null}

            {!loading && !showEmpty
              ? pageItems.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 border-b border-slate-50 text-slate-700 tabular-nums">{d.rd ?? "—"}</td>
                    <td className="p-4 border-b border-slate-50 text-slate-700 tabular-nums">{d.renglon ?? "—"}</td>
                    <td className="p-4 border-b border-slate-50 font-bold text-slate-900">{d.lote}</td>              
                    <td className="p-4 border-b border-slate-50">
                      <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg font-semibold text-[12px]">
                        {d.descripcion}
                      </span>
                    </td>
                    <td className="p-4 border-b border-slate-50 text-slate-700">{d.marca || ""}</td>
                    <td className="p-4 border-b border-slate-50 text-slate-700">{d.embalaje || ""}</td>
                    <td className="p-4 border-b border-slate-50 text-right tabular-nums">
                      {d.pesoUnitario !== null ? `${numberFormatter.format(d.pesoUnitario)} Kg` : "—"}
                    </td>
                    <td className="p-4 border-b border-slate-50 text-right tabular-nums">
                      {d.piezas !== null ? numberFormatter.format(d.piezas) : "—"}
                    </td>
                    <td className="p-4 border-b border-slate-50 text-right font-bold text-slate-900 tabular-nums">
                      {numberFormatter.format(d.kilosActual ?? d.kilos)} Kg
                    </td>
                    <td className="p-4 border-b border-slate-50 text-slate-700">{d.caducidad || ""}</td>
                    <td className="p-4 border-b border-slate-50 text-slate-700">{d.fechaIngreso || ""}</td>
                    <td className="p-4 border-b border-slate-50 text-slate-700 break-all">{d.llaveUnica ?? ""}</td>
                    <td className="p-4 border-b border-slate-50 text-center">
                      <div className="flex justify-center items-center gap-2 font-medium">
                        <span className="w-2 h-2 rounded-full bg-[#A8D5BA]"></span>
                        {d.estado}
                      </div>
                    </td>
                  </tr>
                ))
              : null}
          </tbody>
          <tfoot className="bg-slate-50/50">
            <tr>
              <td colSpan={9} className="p-5 text-sm font-bold text-slate-900 text-right uppercase tracking-wider">
                Total Inventario
              </td>
              <td className="p-5 text-[18px] font-bold text-slate-950 text-right border-l border-slate-100 bg-white tabular-nums">
                {numberFormatter.format(totalKg)} Kg
              </td>
              <td colSpan={3} className="p-5 bg-white border-l border-slate-100"></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-white">
        <span className="text-xs text-slate-500">Mostrando {pageItems.length} de {items.length} registros</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={loading || currentPage === 1}
            className="px-3 py-2 text-xs font-bold uppercase tracking-wider rounded-xl border border-slate-200 bg-white shadow-sm hover:border-slate-300 disabled:opacity-50"
          >
            Anterior
          </button>
          <span className="text-xs text-slate-600">
            Página {currentPage} / {pageCount}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            disabled={loading || currentPage === pageCount}
            className="px-3 py-2 text-xs font-bold uppercase tracking-wider rounded-xl border border-slate-200 bg-white shadow-sm hover:border-slate-300 disabled:opacity-50"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
}