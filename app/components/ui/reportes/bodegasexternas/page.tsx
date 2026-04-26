"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import Operacion from "./operacion";
import ListadoCargue from "./listadocargue";
import { fetchFridemInventoryRows, type FridemInventoryRow } from "@/lib/fridemInventory";

type Props = {
  warehouseName?: string;
  warehouseId?: string;
  onTotalChange?: (totalKg: number) => void;
};

export default function BodegasExternasPage({ warehouseName, warehouseId, onTotalChange }: Props) {
  const [view, setView] = useState<"OP" | "CA">("CA");
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
      const rows = await fetchFridemInventoryRows(warehouseId);
      setItems(rows);
      setLastUpdatedAt(new Date());
    } catch (err) {
      console.error("No se pudo cargar el inventario externo", err);
      setItems([]);
      setError("No se pudo cargar el inventario externo. Revisa la base de lectura y las credenciales.");
    } finally {
      setLoading(false);
    }
  }, [warehouseId]);

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
            onClick={() => setView("CA")}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              view === "CA" 
                ? "bg-white shadow text-blue-600" 
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Listado
          </button>

          {/* Grafico segundo */}
          <button 
            onClick={() => setView("OP")}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              view === "OP" 
                ? "bg-white shadow text-blue-600" 
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Grafico
          </button>
        </div>
      </div>

      {/* Renderizado condicional */}
      <div className="mt-4">
        {view === "CA" ? (
          <ListadoCargue
            items={items}
            loading={loading}
            error={error}
            onRetry={loadInventory}
            lastUpdatedAt={lastUpdatedAt}
          />
        ) : (
          <Operacion items={items} loading={loading} error={error} />
        )}
      </div>
    </div>
  );
}