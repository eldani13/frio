"use client";
import React, { useState } from "react";
import Operacion from "./operacion";
import ListadoCargue from "./listadocargue";

export default function ProveedoresPage() {
  const [view, setView] = useState<"OP" | "CA">("OP");

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Proveedores</h1>
        
        <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
          <button 
            onClick={() => setView("OP")}
            className={`px-4 py-2 rounded-lg ${view === "OP" ? "bg-white shadow text-blue-600" : "text-slate-500"}`}
          >
            OPERACIÓN
          </button>
          <button 
            onClick={() => setView("CA")}
            className={`px-4 py-2 rounded-lg ${view === "CA" ? "bg-white shadow text-blue-600" : "text-slate-500"}`}
          >
            CARGUE
          </button>
        </div>
      </div>

      {/* SEPARACIÓN TOTAL DE LÓGICA */}
      <div className="mt-4">
        {view === "OP" ? <Operacion /> : <ListadoCargue />}
      </div>
    </div>
  );
}