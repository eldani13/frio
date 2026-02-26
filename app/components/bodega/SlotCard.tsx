import type { SlotCardProps } from "../../interfaces/bodega/SlotCard";
import { FiPlus } from "react-icons/fi";

export default function SlotCard({ slot, isSelected, onSelect }: SlotCardProps) {
  const isOccupied = slot.autoId && slot.autoId.trim() !== "";

  return (
    <button
      type="button"
      onClick={() => onSelect(slot.position)}
      className={`relative flex flex-col items-center justify-center rounded-[22px] border border-slate-200 p-0 transition w-full h-[110px] sm:h-[110px] shadow-sm ${
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
        <div className="flex flex-col items-center justify-center w-full h-full">
          {/* Círculo punteado con icono */}
          <div className="flex items-center justify-center mb-2">
            <div className="border-2 border-cyan-400 border-dashed rounded-full w-9 h-9 flex items-center justify-center">
              <FiPlus className="w-5 h-5 text-cyan-400" />
            </div>
          </div>
          {/* Nombre y autoId */}
          <div className="font-semibold text-[13px] text-center truncate w-full text-slate-900">{slot.name || "Sin nombre"}</div>
          <div className="text-[12px] mt-1 text-center truncate w-full text-slate-500">{slot.autoId}</div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center w-full h-full">
          {/* Círculo punteado con + */}
          <div className="border-2 border-dashed border-slate-300 rounded-full w-9 h-9 flex items-center justify-center">
            <span className="text-[20px] text-slate-400">+</span>
          </div>
          <div className="text-[14px] mt-2 text-slate-400 font-medium">Vacía</div>
        </div>
      )}
      

      {/* Indicador de ocupada/vacía */}
      <span className={`absolute bottom-3 right-3 w-3 h-3 rounded-full border border-white shadow ${
        isOccupied ? "bg-cyan-400" : "bg-slate-300"
      }`}></span>
      
    </button>
    
  );
}