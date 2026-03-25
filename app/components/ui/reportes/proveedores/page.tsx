"use client";
import React, { useState } from "react";
import Operacion from "./operacion";
import ListadoCargue from "./listadocargue";

export default function ProveedoresPage() {
  // Cambiamos a "CA" como vista inicial
  const [view, setView] = useState<"OP" | "CA">("CA");

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Proveedores</h1>
        
        <div className="flex gap-2 bg-slate-100 p-1 rounded-xl shadow-inner">
          {/* Botón CARGUE (Principal / Izquierda) */}
          <button 
            onClick={() => setView("CA")}
            className={`px-4 py-2 rounded-lg font-bold transition-all ${
              view === "CA" ? "bg-white shadow text-blue-600" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            CARGUE
          </button>

          {/* Botón OPERACIÓN (Secundario / Derecha) */}
          <button 
            onClick={() => setView("OP")}
            className={`px-4 py-2 rounded-lg font-bold transition-all ${
              view === "OP" ? "bg-white shadow text-blue-600" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            OPERACIÓN
          </button>
        </div>
      </div>

      {/* Renderizado condicional: Prioridad a ListadoCargue */}
      <div className="mt-4">
        {view === "CA" ? <ListadoCargue /> : <Operacion />}
      </div>
    </div>
  );
}