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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Posición seleccionada
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Detalles de la posición {slot.position}.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 transition hover:text-slate-600"
            aria-label="Cerrar modal"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path d="M18 6 6 18" />
              <path d="M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="mt-4 space-y-2 text-sm text-slate-700">
          <p>
            <span className="font-semibold">Id unico:</span> {slot.autoId || "—"}
          </p>
          <p>
            <span className="font-semibold">Nombre:</span> {slot.name || "—"}
          </p>
          <p>
            <span className="font-semibold">Temperatura:</span>{" "}
            {slot.temperature !== null ? `${slot.temperature} °C` : "—"}
          </p>
        </div>
        {canEdit ? (
          <div className="mt-6 border-t border-slate-200 pt-4">
            <p className="text-sm font-semibold text-slate-900">
              Ingresar/editar objeto
            </p>
            <div className="mt-3 grid gap-3">
              <label className="text-sm font-medium text-slate-600">
                Nombre de la caja
              </label>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                placeholder="Ej: Caja banano"
              />
              <label className="text-sm font-medium text-slate-600">
                Temperatura (°C)
              </label>
              <input
                value={temperature}
                onChange={(event) => setTemperature(event.target.value)}
                type="number"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                placeholder="Ej: -4"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => onSave(slot.position, name, temperature)}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
