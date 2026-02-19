import type { SlotsGridProps } from "../../interfaces/bodega/SlotsGrid";
import SlotCard from "./SlotCard";

export default function SlotsGrid({
  slots,
  selectedPosition,
  onSelect,
  headerActions,
}: SlotsGridProps) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">
          Zona de almacenamiento
        </h2>
        {headerActions ? <div>{headerActions}</div> : null}
      </div>
      <p className="mt-1 text-sm text-slate-600">
        Selecciona una tarjeta para ver su estado actual.
      </p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
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
