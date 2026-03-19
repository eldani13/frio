import { HiOutlinePencilSquare, HiOutlineTrash } from "react-icons/hi2";
import { Planta } from "@/app/types/planta";

interface Props {
  plantas: Planta[];
  onEdit: (planta: Planta) => void;
  onDelete: (id: string) => void;
}

export const PlantaTable = ({ plantas, onEdit, onDelete }: Props) => {
  return (
    <div className="bg-white rounded-[12px] border border-gray-100 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-[#A8D5BA]/10">
            <tr>
              <th className="p-4 text-[12px] font-medium text-gray-500 uppercase">Código</th>
              <th className="p-4 text-[12px] font-medium text-gray-500 uppercase">Nombre / Planta</th>
              <th className="p-4 text-[12px] font-medium text-gray-500 uppercase">Ubicación</th>
              <th className="p-4 text-[12px] font-medium text-gray-500 uppercase text-center">Capacidad</th>
              <th className="p-4 text-[12px] font-medium text-gray-500 uppercase text-center">Estado</th>
              <th className="p-4 text-[12px] font-medium text-gray-500 uppercase text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {plantas.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                {/* Código Base36 */}
                <td className="p-4 text-[14px] font-mono font-bold text-[#2D5A3F]">
                  {p.code}
                </td>
                
                {/* Nombre y Razón Social */}
                <td className="p-4">
                  <div className="flex flex-col">
                    <span className="text-[14px] text-gray-900 font-medium">{p.plantName}</span>
                    <span className="text-[11px] text-gray-400">{p.name}</span>
                  </div>
                </td>

                {/* Ubicación y Rango Térmico */}
                <td className="p-4">
                  <div className="flex flex-col">
                    <span className="text-[13px] text-gray-700">{p.location}</span>
                    <span className="text-[11px] text-gray-400">{p.tempRange}</span>
                  </div>
                </td>

                {/* Capacidad */}
                <td className="p-4 text-[14px] text-gray-700 text-center">
                  {p.maxPallets.toLocaleString()} <span className="text-[10px] text-gray-400">PLTS</span>
                </td>

                {/* Estado Operacional */}
                <td className="p-4 text-center">
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                    p.isOperational 
                      ? "bg-green-100 text-green-700" 
                      : "bg-red-100 text-red-700"
                  }`}>
                    {p.isOperational ? "Operativa" : "Inactiva"}
                  </span>
                </td>

                {/* Acciones */}
                <td className="p-4 text-right">
                  <div className="flex justify-end gap-1">
                    <button 
                      onClick={() => onEdit(p)}
                      className="p-2 text-[#AFCBFF] hover:text-[#2D5A3F] transition-colors hover:bg-[#AFCBFF]/10 rounded-lg"
                      title="Editar"
                    >
                      <HiOutlinePencilSquare size={18} />
                    </button>
                    
                    <button 
                      onClick={() => p.id && onDelete(p.id)}
                      className="p-2 text-[#FFB3C1] hover:text-red-500 transition-colors hover:bg-[#FFB3C1]/10 rounded-lg"
                      title="Eliminar"
                    >
                      <HiOutlineTrash size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {plantas.length === 0 && (
        <div className="p-8 text-center text-gray-400 text-[14px]">
          No hay plantas registradas.
        </div>
      )}
    </div>
  );
};