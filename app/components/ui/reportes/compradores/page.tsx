"use client";
import React, { useState } from "react";
import Operacion from "./operacion";
import ListadoCargue from "./listadocargue";

export default function CompradoresPage() {
  // Cambiamos el estado inicial a "CA" para que sea la vista por defecto
  const [view, setView] = useState<"OP" | "CA">("CA");

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Venta</h1>
        
        <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
          {/* Listado primero a la izquierda */}
          <button 
            onClick={() => setView("CA")}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              view === "CA" ? "bg-white shadow text-blue-600" : "text-slate-500"
            }`}
          >
            Listado
          </button>

          {/* Grafico segundo */}
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

      {/* Renderizado condicional priorizando Listado */}
      <div className="mt-4">
        {view === "CA" ? <ListadoCargue /> : <Operacion />}
      </div>
    </div>
  );
}