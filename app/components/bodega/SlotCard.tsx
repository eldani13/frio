import type { SlotCardProps } from "../../interfaces/bodega/SlotCard";

export default function SlotCard({ slot, isSelected, onSelect }: SlotCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(slot.position)}
      className={`w-full rounded-xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-sm ${
        isSelected
          ? "border-emerald-300 bg-emerald-50"
          : "border-slate-200 bg-slate-50"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-500">
          Posición {slot.position}
        </span>
        <span
          className={`rounded-full px-2 py-1 text-xs font-semibold ${
            slot.autoId
              ? "bg-emerald-100 text-emerald-700"
              : "bg-slate-200 text-slate-600"
          }`}
        >
          {slot.autoId ? "Ocupada" : "Libre"}
        </span>
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
    </button>
  );
}
