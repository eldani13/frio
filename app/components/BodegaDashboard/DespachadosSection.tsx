import React from "react";
import type { Box } from "../../interfaces/bodega";

interface DespachadosSectionProps {
  dispatchedBoxes: Box[];
  sortByPosition: <T extends { position: number }>(items: T[]) => T[];
}

const DespachadosSection: React.FC<DespachadosSectionProps> = ({
  dispatchedBoxes,
  sortByPosition,
}) => (
  <section className="rounded-2xl bg-white p-6 shadow-sm">
    <div className="flex items-center justify-between">
      <h2 className="text-lg font-semibold text-slate-900">Despachados</h2>
      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
        {dispatchedBoxes.length} cajas
      </span>
    </div>
    <p className="mt-1 text-sm text-slate-600">Cajas enviadas por el custodio.</p>
    <div className="mt-4 grid gap-3">
      {dispatchedBoxes.length === 0 ? (
        <p className="text-sm text-slate-500">No hay cajas despachadas.</p>
      ) : (
        sortByPosition(dispatchedBoxes).map((box) => (
          <div
            key={`despachado-${box.position}`}
            className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700"
          >
            <p className="font-semibold">Salida {box.position}</p>
            <p>Id unico: {box.autoId}</p>
            <p>Nombre: {box.name}</p>
            <p>Temperatura: {box.temperature} °C</p>
            <p>Cliente: {box.client || "—"}</p>
          </div>
        ))
      )}
    </div>
  </section>
);

export default DespachadosSection;