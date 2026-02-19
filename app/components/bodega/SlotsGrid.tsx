import type { SlotsGridProps } from "../../interfaces/bodega/SlotsGrid";
import SlotCard from "./SlotCard";

export default function SlotsGrid({
  slots,
  selectedPosition,
  onSelect,
  headerActions,
}: SlotsGridProps) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <h2 className="text-base font-semibold text-slate-900 sm:text-lg">
          Zona de almacenamiento
        </h2>
        {headerActions ? <div>{headerActions}</div> : null}
      </div>
      <p className="mt-1 text-xs text-slate-600 sm:text-sm">
        Selecciona una tarjeta para ver su estado actual.
      </p>
      <div className="mt-4 grid gap-3 sm:mt-5 sm:gap-4 sm:grid-cols-2 2xl:grid-cols-3">
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
