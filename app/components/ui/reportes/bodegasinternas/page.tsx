"use client";
import React, { useState } from "react";
import Operacion from "./operacion";
import ListadoCargue from "./listadocargue";

type Props = {
  warehouseId?: string;
  warehouseName?: string;
  onTotalChange?: (totalKg: number) => void;
};

export default function BodegasInternasPage({ warehouseId, warehouseName, onTotalChange }: Props) {
  const [view, setView] = useState<"OP" | "CA">("CA");

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="app-title">Bodegas internas</h1>
          {warehouseName ? (
            <p className="mt-1 text-sm font-medium text-slate-500">{warehouseName}</p>
          ) : null}
        </div>
        
        <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
          {/* Listado a la izquierda */}
          <button 
            onClick={() => setView("CA")}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              view === "CA" ? "bg-white shadow text-blue-600" : "text-slate-500"
            }`}
          >
            Listado
          </button>

          {/* Grafico a la derecha */}
          <button 
            onClick={() => setView("OP")}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              view === "OP" ? "bg-white shadow text-blue-600" : "text-slate-500"
            }`}
          >
            Grafico
          </button>
        </div>
      </div>

      {/* Renderizado condicional: Mostramos ListadoCargue si view es "CA" */}
      <div className="mt-4">
        {view === "CA" ? (
          <ListadoCargue warehouseId={warehouseId} onTotalChange={onTotalChange} />
        ) : (
          <Operacion warehouseId={warehouseId} onTotalChange={onTotalChange} />
        )}
      </div>
    </div>
  );
}