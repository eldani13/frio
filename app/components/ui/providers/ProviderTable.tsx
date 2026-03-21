import { HiOutlinePencilSquare, HiOutlineTrash } from "react-icons/hi2";
import { Provider } from "@/app/types/provider";

interface Props {
  providers: Provider[];
  onEdit: (provider: Provider) => void;
  onDelete: (id: string) => void;
}

export const ProviderTable = ({ providers, onEdit, onDelete }: Props) => {
  return (
    <div className="bg-white rounded-[12px] border border-gray-100 overflow-hidden shadow-sm">
      <table className="w-full text-left border-collapse">
        <thead className="bg-[#A8D5BA]/10">
          <tr>
            <th className="p-4 text-[12px] font-medium text-gray-500 uppercase">ID</th>
            <th className="p-4 text-[12px] font-medium text-gray-500 uppercase">Código </th>
            <th className="p-4 text-[12px] font-medium text-gray-500 uppercase">Proveedor</th>
            <th className="p-4 text-[12px] font-medium text-gray-500 uppercase text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {providers.map((p) => (
            <tr key={p.id} className="hover:bg-gray-50 transition-colors">
              <td className="p-4 text-[14px] text-gray-700">{p.numericId}</td>
              <td className="p-4 text-[14px] font-mono font-bold text-[#2D5A3F]">{p.code}</td>
              <td className="p-4 text-[14px] text-gray-900 font-medium">{p.name}</td>
              <td className="p-4 text-right">
                <div className="flex justify-end gap-1">
                  {/* Botón Editar - Azul Suave */}
                  <button 
                    onClick={() => onEdit(p)}
                    className="p-2 text-[#AFCBFF] hover:text-[#2D5A3F] transition-colors hover:bg-[#AFCBFF]/10 rounded-lg"
                    title="Editar"
                  >
                    <HiOutlinePencilSquare size={18} />
                  </button>
                  
                  {/* Botón Eliminar - Rosa Suave */}
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
      {providers.length === 0 && (
        <div className="p-8 text-center text-gray-400 text-[14px]">
          No hay proveedores registrados.
        </div>
      )}
    </div>
  );
};