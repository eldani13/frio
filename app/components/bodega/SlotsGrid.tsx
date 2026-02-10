import type { SlotsGridProps } from "../../interfaces/bodega/SlotsGrid";
import SlotCard from "./SlotCard";

export default function SlotsGrid({
  slots,
  selectedPosition,
  onSelect,
}: SlotsGridProps) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">
        Posiciones de la bodega
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        Selecciona una tarjeta para ver su estado actual.
      </p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {slots.map((slot) => (
          <SlotCard
            key={slot.position}
            slot={slot}
            isSelected={slot.position === selectedPosition}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}
