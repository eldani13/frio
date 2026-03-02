import type { SlotCardProps } from "../../interfaces/bodega/SlotCard";
import { FiPlus, FiBox } from "react-icons/fi";
import { MdInventory2 } from "react-icons/md";

export default function SlotCard({ slot, isSelected, onSelect }: SlotCardProps) {
  const isOccupied = slot.autoId && slot.autoId.trim() !== "";

  return (
    <button
      type="button"
      onClick={() => onSelect(slot.position)}
      className={`relative flex flex-col items-center justify-center rounded-[22px] border border-slate-200 p-2 transition w-full h-27.5 sm:h-27.5 shadow-sm ${
        isOccupied ? "bg-cyan-100" : "bg-white"
      } ${
        isSelected ? "ring-2 ring-emerald-300" : ""
      }`}
      style={{ minHeight: 110, maxWidth: 170 }}
    >
      {/* Número de posición */}
      <span className="absolute top-2 left-2 text-[12px] font-semibold text-slate-500">
        {slot.position}
      </span>

      {/* Contenido central */}
      {isOccupied ? (
        <>
          <div className="mb-1">
            <FiBox className="w-4 h-4 sm:w-6 sm:h-6 text-cyan-400" />
          </div>
          <div className="font-semibold text-[clamp(0.65rem,1vw,0.85rem)] text-center truncate w-full">
            {slot.name || "Sin nombre"}
          </div>
          <div className="text-[clamp(0.7rem,1.5vw,0.85rem)] mt-1 text-center truncate w-full">
            {slot.autoId}
          </div>
          <div className="mt-2 text-[clamp(0.7rem,1.5vw,0.85rem)] font-medium bg-cyan-200 rounded-full px-1.5 sm:px-3 py-0.5 inline-block">
            {typeof slot.temperature === "number"
              ? `${slot.temperature} °C`
              : "Sin temperatura"}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center w-full h-full">
          {/* Círculo punteado con + */}
          <div className="border-2 border-dashed border-slate-300 rounded-full w-9 h-9 flex items-center justify-center">
            <span className="text-[20px] text-slate-400">+</span>
          </div>
          <div className="text-[14px] mt-2 text-slate-400 font-medium">Vacía</div>
        </div>
      )}
      

     
    </button>
    
  );
}