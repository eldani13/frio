"use client";
import React, { useState } from "react";
import Operacion from "./operacion";
import ListadoCargue from "./listadocargue";

export default function TransportesPage() {
  // Establecemos "CA" (Cargue) como la vista inicial por defecto
  const [view, setView] = useState<"OP" | "CA">("CA");

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Transportes</h1>
        
        <div className="flex gap-2 bg-slate-100 p-1 rounded-xl shadow-inner">
          {/* Listado - primero y estado inicial */}
          <button 
            onClick={() => setView("CA")}
            className={`px-4 py-2 rounded-lg font-bold transition-all ${
              view === "CA" ? "bg-white shadow text-blue-600" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Listado
          </button>

          {/* Grafico - segundo */}
          <button 
            onClick={() => setView("OP")}
            className={`px-4 py-2 rounded-lg font-bold transition-all ${
              view === "OP" ? "bg-white shadow text-blue-600" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Grafico
          </button>
        </div>
      </div>

      {/* Renderizado condicional: Mostramos ListadoCargue si el estado es "CA" */}
      <div className="mt-4">
        {view === "CA" ? <ListadoCargue /> : <Operacion />}
      </div>
    </div>
  );
}