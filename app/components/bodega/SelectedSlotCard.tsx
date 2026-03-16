/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from "react";
import type { SelectedSlotCardProps } from "../../interfaces/bodega/SelectedSlotCard";

export default function SelectedSlotCard({
  slot,
  onClose,
  onSave,
  canEdit = true,
}: SelectedSlotCardProps) {
  const [name, setName] = useState<string>("");
  const [temperature, setTemperature] = useState<string>("");

  useEffect(() => {
    if (!slot) {
      return;
    }
    setName(slot.name);
    setTemperature(
      slot.temperature !== null && slot.temperature !== undefined
        ? String(slot.temperature)
        : ""
    );
  }, [slot]);

  if (!slot) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/10 animate-fade-in px-2 sm:px-4">
      <div
        className="w-full max-w-lg sm:max-w-xl rounded-3xl border border-blue-100 bg-white/90 shadow-2xl backdrop-blur-lg relative overflow-hidden animate-fade-in-up"
        style={{ fontFamily: '"Space Grotesk", "Work Sans", sans-serif' }}
      >
        {/* Header con gradiente y botón cerrar flotante */}
        <div className="flex flex-col items-center justify-center pt-8 pb-4 px-8 border-b border-blue-100 bg-linear-to-r from-blue-50 to-white rounded-t-3xl relative">
          <span className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-blue-100 shadow mb-2">
            <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-blue-500"><circle cx="12" cy="12" r="10" strokeWidth="2" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h8M12 8v8" /></svg>
          </span>
          <h2 className="text-2xl font-extrabold text-blue-700 drop-shadow mb-1 tracking-tight">Posición seleccionada</h2>
          <p className="text-sm text-slate-500 font-medium text-center">Detalles de la posición <span className="font-bold text-blue-700">{slot.position}</span>.</p>
          <button
            className="absolute top-4 right-4 text-slate-400 hover:text-blue-500 text-2xl font-bold focus:outline-none transition-colors"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 6 6 18" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 6l12 12" /></svg>
          </button>
        </div>
        {/* Detalles */}
        <div className="px-8 py-6 min-h-30 flex flex-col items-center max-h-[60vh] overflow-y-auto bg-white/80">
          <div className="w-full space-y-2 text-sm text-slate-700">
            <p>
              <span className="font-semibold">Id único:</span> {slot.autoId || "—"}
            </p>
            <p>
              <span className="font-semibold">Nombre:</span> {slot.name || "—"}
            </p>
            <p>
              <span className="font-semibold">Cliente:</span> {slot.client || "—"}
            </p>
            <p>
              <span className="font-semibold">Temperatura:</span> {slot.temperature !== null ? `${slot.temperature} °C` : "—"}
            </p>
          </div>
          {canEdit ? (
            <div className="mt-6 border-t border-slate-200 pt-4 w-full">
              <p className="text-sm font-semibold text-slate-900 mb-2">Ingresar/editar objeto</p>
              <div className="grid gap-3">
                <label className="text-sm font-medium text-slate-600">Nombre de la caja</label>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-700 shadow-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
                  placeholder="Ej: Caja banano"
                />
                <label className="text-sm font-medium text-slate-600">Temperatura (°C)</label>
                <input
                  value={temperature}
                  onChange={(event) => setTemperature(event.target.value)}
                  type="number"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-700 shadow-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
                  placeholder="Ej: -4"
                />
                <div className="flex justify-end gap-2 mt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => onSave(slot.position, name, temperature)}
                    className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white shadow-lg transition hover:bg-blue-800 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-300"
                  >
                    Guardar
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
