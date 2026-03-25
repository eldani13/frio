"use client";
import React, { useState } from "react";
import Operacion from "./operacion";
import ListadoCargue from "./listadocargue";

type Props = { warehouseName?: string };

export default function BodegasExternasPage({ warehouseName }: Props) {
  // Cambiamos el estado inicial a "CA" para que se muestre CARGUE primero
  const [view, setView] = useState<"OP" | "CA">("CA");

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Bodegas externas</h1>
          {warehouseName ? (
            <p className="mt-1 text-sm font-medium text-slate-500">{warehouseName}</p>
          ) : null}
        </div>
        
        <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
          {/* Botón CARGUE primero */}
          <button 
            onClick={() => setView("CA")}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              view === "CA" 
                ? "bg-white shadow text-blue-600" 
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            CARGUE
          </button>

          {/* Botón OPERACIÓN segundo */}
          <button 
            onClick={() => setView("OP")}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              view === "OP" 
                ? "bg-white shadow text-blue-600" 
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            OPERACIÓN
          </button>
        </div>
      </div>

      {/* Renderizado condicional */}
      <div className="mt-4">
        {view === "CA" ? <ListadoCargue /> : <Operacion />}
      </div>
    </div>
  );
}