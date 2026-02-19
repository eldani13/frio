import type { SlotCardProps } from "../../interfaces/bodega/SlotCard";

export default function SlotCard({ slot, isSelected, onSelect }: SlotCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(slot.position)}
      className={`w-full rounded-xl border p-2.5 text-left transition hover:-translate-y-0.5 hover:shadow-sm sm:p-3 ${
        isSelected
          ? "border-emerald-300 bg-emerald-50"
          : "border-slate-200 bg-slate-50"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-slate-500 sm:text-xs">
          Posición {slot.position}
        </span>
        <span
          className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold sm:px-2 sm:text-[10px] ${
            slot.autoId
              ? "bg-emerald-100 text-emerald-700"
              : "bg-slate-200 text-slate-600"
          }`}
        >
          {slot.autoId ? "Ocupada" : "Libre"}
        </span>
      </div>
      <div className="mt-2 space-y-1 text-[10px] text-slate-700 sm:mt-3 sm:space-y-1.5 sm:text-[11px]">
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
