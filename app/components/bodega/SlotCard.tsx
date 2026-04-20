import type { SlotCardProps } from "../../interfaces/bodega/SlotCard";
import { occupiedSlotVisualClasses } from "@/app/lib/bodegaDisplay";
import { FiBox } from "react-icons/fi";

export default function SlotCard({
  slot,
  isSelected,
  onSelect,
}: SlotCardProps) {
  const isOccupied = slot.autoId && slot.autoId.trim() !== "";
  const tone = isOccupied ? occupiedSlotVisualClasses(slot) : null;

  return (
    <button
      type="button"
      onClick={() => isOccupied && onSelect(slot.position)}
      className={`relative flex flex-col items-center justify-center rounded-3xl border p-2 sm:p-4 transition ${
        isOccupied && tone
          ? tone.card
          : "bg-slate-50 text-slate-400 border-slate-300 cursor-default"
      } ${isSelected ? "ring-2 ring-emerald-300" : ""}`}
      style={{ minHeight: 90, maxWidth: 140, width: "100%" }}
    >
      <span className="absolute top-1 left-1 text-[9px] font-semibold rounded-full px-1 py-0.5  text-slate-600">
        {slot.position}
      </span>

      {isOccupied && tone ? (
        <>
          <div className="mb-1">
            <FiBox className={`w-4 h-4 sm:w-6 sm:h-6 ${tone.icon}`} />
          </div>
          <div className="font-semibold text-[clamp(0.65rem,1vw,0.85rem)] text-center truncate w-full">
            {slot.name || "Sin nombre"}
          </div>
          <div className="text-[clamp(0.7rem,1.5vw,0.85rem)] mt-1 text-center truncate w-full">
            {slot.autoId}
          </div>
          {/* <div className="text-[clamp(0.68rem,1.4vw,0.8rem)] text-center truncate w-full text-slate-600">
            Cliente: {slot.client || "—"}
          </div> */}
          <div
            className={`mt-2 text-[clamp(0.7rem,1.5vw,0.85rem)] font-medium rounded-full px-1.5 sm:px-3 py-0.5 inline-block ${tone.pill}`}
          >
            {typeof slot.temperature === "number"
              ? `${slot.temperature} °C`
              : "Sin temperatura"}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center gap-1">
          <div className="border-2 border-dashed border-slate-300 rounded-3xl w-7 h-7 sm:w-9 sm:h-9 flex items-center justify-center">
            <span className="text-base sm:text-lg">+</span>
          </div>
          <div className="text-[clamp(0.7rem,1.5vw,0.85rem)] mt-1">Vacía</div>
        </div>
      )}
    </button>
  );
}
