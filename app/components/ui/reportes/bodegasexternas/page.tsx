"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import Operacion from "./operacion";
import ListadoCargue from "./listadocargue";
import {
  algunaVistaExternaDisponible,
  disponibilidadVistasExternas,
  primeraVistaExternaDisponible,
  vistaExternaHabilitada,
  type ExternaViewKey,
} from "./viewAvailability";
import { getExternaReportEmbedUrl } from "./externaReportEmbed";
import ReporteLookerEmbed from "./ReporteLookerEmbed";
import { fetchFridemInventoryRows, type FridemInventoryRow } from "@/lib/fridem/fridemInventory";

type Props = {
  warehouseName?: string;
  warehouseId?: string;
  codeCuenta?: string;
  onTotalChange?: (totalKg: number) => void;
};

export default function BodegasExternasPage({
  warehouseName,
  warehouseId,
  codeCuenta,
  onTotalChange,
}: Props) {
  const [view, setView] = useState<ExternaViewKey | null>(null);
  const [items, setItems] = useState<FridemInventoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  const loadInventory = useCallback(async () => {
    if (!warehouseId) {
      setItems([]);
      setLastUpdatedAt(null);
      setError("Selecciona una bodega externa para ver su inventario.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const rows = await fetchFridemInventoryRows(warehouseId, codeCuenta);
      setItems(rows);
      setLastUpdatedAt(new Date());
    } catch (err) {
      console.error("No se pudo cargar el inventario externo", err);
      setItems([]);
      setError("No se pudo cargar el inventario externo. Revisa la base de lectura y las credenciales.");
    } finally {
      setLoading(false);
    }
  }, [warehouseId, codeCuenta]);

  useEffect(() => {
    void loadInventory();
  }, [loadInventory]);

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
    if (typeof onTotalChange === "function") {
      onTotalChange(totalKg);
    }
  }, [totalKg, onTotalChange]);

  const reportEmbedUrl = useMemo(() => getExternaReportEmbedUrl(codeCuenta), [codeCuenta]);

  const availability = useMemo(
    () => disponibilidadVistasExternas(items, loading, error, codeCuenta),
    [items, loading, error, codeCuenta],
  );

  useEffect(() => {
    if (!vistaExternaHabilitada(view, availability)) {
      setView(primeraVistaExternaDisponible(availability));
    }
  }, [view, availability]);

  const tabLabel = (nombre: string, enabled: boolean) => (enabled ? nombre : "No aplica");

  const tabClass = (active: boolean, enabled: boolean) => {
    const base = "px-4 py-2 rounded-lg font-medium transition-all min-w-[5.5rem]";
    if (!enabled) return `${base} text-slate-400 cursor-not-allowed opacity-70 italic`;
    if (active && enabled) return `${base} bg-white shadow text-blue-600`;
    return `${base} text-slate-500 hover:text-slate-700`;
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="app-title">Bodegas externas</h1>
          {warehouseName ? (
            <p className="mt-1 text-sm font-medium text-slate-500">{warehouseName}</p>
          ) : null}
        </div>
        
        <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
          {/* Listado primero */}
          <button
            type="button"
            disabled={!availability.listado}
            title={availability.listado ? undefined : "No aplica: sin datos para listado"}
            onClick={() => availability.listado && setView("CA")}
            className={tabClass(view === "CA", availability.listado)}
          >
            {tabLabel("Listado", availability.listado)}
          </button>

          <button
            type="button"
            disabled={!availability.grafico}
            title={availability.grafico ? undefined : "No aplica: sin datos para gráfico"}
            onClick={() => availability.grafico && setView("OP")}
            className={tabClass(view === "OP", availability.grafico)}
          >
            {tabLabel("Grafico", availability.grafico)}
          </button>

          <button
            type="button"
            disabled={!availability.reporte}
            title={availability.reporte ? undefined : "No aplica: sin reporte para esta cuenta"}
            onClick={() => availability.reporte && setView("REP")}
            className={tabClass(view === "REP", availability.reporte)}
          >
            {tabLabel("Reporte", availability.reporte)}
          </button>
        </div>
      </div>

      <div className="mt-4">
        {view === "REP" && availability.reporte && reportEmbedUrl ? (
          <ReporteLookerEmbed src={reportEmbedUrl} title={`Reporte ${warehouseName ?? "bodega externa"}`} />
        ) : loading ? (
          <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-12 text-center text-sm text-slate-500">
            Cargando inventario externo…
          </p>
        ) : error ? (
          <div className="rounded-xl border border-red-100 bg-red-50/80 px-6 py-10 text-center">
            <p className="text-sm text-red-800">{error}</p>
            <button
              type="button"
              onClick={() => void loadInventory()}
              className="mt-4 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-800 hover:bg-red-50"
            >
              Reintentar
            </button>
          </div>
        ) : view === "CA" && availability.listado ? (
          <ListadoCargue
            items={items}
            loading={loading}
            error={error}
            onRetry={loadInventory}
            lastUpdatedAt={lastUpdatedAt}
          />
        ) : view === "OP" && availability.grafico ? (
          <Operacion items={items} loading={loading} error={error} />
        ) : !algunaVistaExternaDisponible(availability) ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-12 text-center">
            <p className="text-sm text-slate-600">
              No hay inventario disponible en la base externa para esta bodega. Las vistas de listado, gráfico y
              reporte se activan cuando existan datos para cada una.
            </p>
            <button
              type="button"
              onClick={() => void loadInventory()}
              className="mt-4 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Recargar
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}