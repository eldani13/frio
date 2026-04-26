"use client";
import React, { useState } from "react";
import Operacion from "./operacion";
import ListadoCargue from "./listadocargue";

export default function ProveedoresPage() {
  const [view, setView] = useState<"OP" | "CA">("CA");

  return (
    <div className="p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center mb-6">
        <h1 className="app-title">Proveedores</h1>

        <div className="flex gap-2 bg-slate-100 p-1 rounded-xl shadow-inner">
          <button
            type="button"
            onClick={() => setView("CA")}
            className={`px-4 py-2 rounded-lg font-bold transition-all ${
              view === "CA" ? "bg-white shadow text-blue-600" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Listado
          </button>

          <button
            type="button"
            onClick={() => setView("OP")}
            className={`px-4 py-2 rounded-lg font-bold transition-all ${
              view === "OP" ? "bg-white shadow text-blue-600" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Grafico
          </button>
        </div>
      </div>

      <div className="mt-4">{view === "CA" ? <ListadoCargue /> : <Operacion />}</div>
    </div>
  );
}
