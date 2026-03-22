import { HiOutlinePencilSquare, HiOutlineTrash } from "react-icons/hi2";
import { Camion } from "@/app/types/camion";

interface Props {
  trucks: Camion[];
  onEdit: (truck: Camion) => void;
  onDelete: (id: string) => void;
}

export const TruckTable = ({ trucks, onEdit, onDelete }: Props) => {
  return (
    <div className="bg-white rounded-[12px] border border-gray-100 shadow-sm overflow-hidden">
      {/* Contenedor con scroll horizontal */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[1200px]">
          <thead className="bg-[#A8D5BA]/10">
            <tr>
              <th className="p-4 text-[11px] font-bold text-gray-500 uppercase whitespace-nowrap">ID / Cód</th>
              <th className="p-4 text-[11px] font-bold text-gray-500 uppercase whitespace-nowrap">Placa</th>
              <th className="p-4 text-[11px] font-bold text-gray-500 uppercase whitespace-nowrap">Marca / Modelo</th>
              <th className="p-4 text-[11px] font-bold text-gray-500 uppercase whitespace-nowrap text-center">Tipo</th>
              <th className="p-4 text-[11px] font-bold text-gray-500 uppercase whitespace-nowrap text-right">Peso Máx</th>
              <th className="p-4 text-[11px] font-bold text-gray-500 uppercase whitespace-nowrap text-right">Volumen</th>
              <th className="p-4 text-[11px] font-bold text-gray-500 uppercase whitespace-nowrap text-center">Pallets</th>
              <th className="p-4 text-[11px] font-bold text-gray-500 uppercase whitespace-nowrap">Rango Temp</th>
              <th className="p-4 text-[11px] font-bold text-gray-500 uppercase whitespace-nowrap text-center">Estado</th>
              <th className="p-4 text-[11px] font-bold text-gray-500 uppercase whitespace-nowrap">Creado</th>
              {/* Columna Sticky */}
              <th className="sticky right-0 bg-[#f9fbf9] p-4 text-[11px] font-bold text-gray-500 uppercase text-right shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.05)]">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {trucks.map((t) => (
              <tr key={t.id} className="hover:bg-gray-50 transition-colors group">
                <td className="p-4">
                  <div className="flex flex-col">
                    <span className="text-[13px] text-gray-400">#{t.numericId}</span>
                    <span className="text-[13px] font-mono font-bold text-[#2D5A3F]">{t.code}</span>
                  </div>
                </td>
                <td className="p-4 text-[14px] font-bold text-gray-900 uppercase">{t.plate}</td>
                <td className="p-4 text-[13px] text-gray-600">{t.brand} <span className="text-gray-400">({t.model})</span></td>
                <td className="p-4 text-center">
                  <span className={`px-2 py-1 rounded-full text-[11px] font-medium ${
                    t.type === 'Refrigerado' ? 'bg-blue-50 text-blue-600' : 
                    t.type === 'Seco' ? 'bg-orange-50 text-orange-600' : 'bg-purple-50 text-purple-600'
                  }`}>
                    {t.type}
                  </span>
                </td>
                <td className="p-4 text-[13px] text-gray-700 text-right font-medium">{t.maxWeightKg.toLocaleString()} kg</td>
                <td className="p-4 text-[13px] text-gray-700 text-right font-medium">{t.maxVolumeM3} m³</td>
                <td className="p-4 text-center font-bold text-[13px] text-[#2D5A3F]">{t.palletCapacity}</td>
                <td className="p-4 text-[13px] text-gray-600 italic">{t.tempRange || 'N/A'}</td>
                <td className="p-4 text-center">
                   <span className={`inline-flex items-center gap-1 text-[12px] font-medium ${
                    t.isAvailable ? 'text-green-600' : 'text-red-400'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${t.isAvailable ? 'bg-green-500' : 'bg-red-400'}`}></span>
                    {t.isAvailable ? 'Disponible' : 'Ocupado'}
                  </span>
                </td>
                <td className="p-4 text-[12px] text-gray-400 whitespace-nowrap">
                  {new Date(t.createdAt).toLocaleDateString()}
                </td>
                
                {/* Celda Sticky para Acciones */}
                <td className="sticky right-0 bg-white group-hover:bg-gray-50 p-4 text-right shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.05)] transition-colors">
                  <div className="flex justify-end gap-1">
                    <button 
                      onClick={() => onEdit(t)}
                      className="p-2 text-[#AFCBFF] hover:text-[#2D5A3F] transition-colors hover:bg-[#AFCBFF]/10 rounded-lg"
                      title="Editar"
                    >
                      <HiOutlinePencilSquare size={18} />
                    </button>
                    <button 
                      onClick={() => t.id && onDelete(t.id)}
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
      
      {trucks.length === 0 && (
        <div className="p-12 text-center text-gray-400 text-[14px]">
          No hay camiones registrados en el sistema.
        </div>
      )}
    </div>
  );
};