"use client";
import React from "react";
import ListadoCargue from "./listadocargue";

export default function ProveedoresPage() {
  return (
    <div className="p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center mb-6">
        <h1 className="app-title">Proveedores</h1>

        <div className="flex gap-2 bg-slate-100 p-1 rounded-xl shadow-inner">
          <button
            type="button"
            className="rounded-lg bg-white px-4 py-2 font-bold text-blue-600 shadow transition-all"
          >
            Listado
          </button>

          <button
            type="button"
            disabled
            aria-disabled="true"
            title="Vista en gráfico no disponible por ahora."
            className="cursor-not-allowed rounded-lg px-4 py-2 font-bold text-slate-400 opacity-65"
          >
            Grafico
          </button>
        </div>
      </div>

      <div className="mt-4">
        <ListadoCargue />
      </div>
    </div>
  );
}
