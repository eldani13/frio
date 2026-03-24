"use client";
import { useState, useEffect } from "react";
import { HiOutlineXMark } from "react-icons/hi2";
import { WarehouseMeta } from "@/app/interfaces/bodega";
import { AsignarBodegaService } from "@/app/services/asignarbodegaService";
import { useAuth } from "@/app/context/AuthContext";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void>;
  clientId: string; 
  estado: string; // Viene dinámico del Page (ej: "interna" o "externa")
  
}

export const BodegaAsignarModal = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  clientId, 
  estado, 
}: Props) => {
  
  const { session } = useAuth(); 
  const [bodegas, setBodegas] = useState<WarehouseMeta[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [suggestedCode, setSuggestedCode] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, session, estado]); // Se recarga si cambia cualquier filtro del Page

  const loadData = async () => {
    setLoading(true);
    try {
      // Usamos los parámetros exactos que nos pasó el Page
      const list = await AsignarBodegaService.getPendingBodegas(estado);
      setBodegas(list);

      if (session?.codeCuenta) {
        setSuggestedCode(session.codeCuenta);
      }
    } catch (error) {
      console.error("Error cargando datos:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId || !suggestedCode) return;

    setLoading(true);
    try {
      await AsignarBodegaService.assignCodeCuenta(selectedId, suggestedCode);
      await onSuccess();
      onClose();
    } catch (error) {
      console.error("Error al asignar:", error);
      alert("No se pudo vincular la bodega");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-md rounded-[12px] shadow-2xl p-6 animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-[18px] font-bold text-gray-800 capitalize">
              Vincular Bodega {estado}
            </h2>
            <p className="text-[12px] text-gray-500">
              Asignando a cuenta: <span className="font-mono text-green-600 font-bold">{suggestedCode || "---"}</span>
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <HiOutlineXMark size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[11px] font-bold text-gray-400 uppercase mb-2">
              Bodegas {estado}s disponibles
            </label>
            <div className="max-h-48 overflow-y-auto border border-gray-100 rounded-lg divide-y">
              {bodegas.length > 0 ? (
                bodegas.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setSelectedId(b.id)}
                    className={`w-full text-left px-4 py-3 text-[14px] transition-all ${
                      selectedId === b.id 
                        ? "bg-green-50 text-green-700 font-bold border-l-4 border-green-500" 
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <span>{b.name}</span>
                    
                  </button>
                ))
              ) : (
                <div className="p-10 text-center">
                  <p className="text-[12px] text-gray-400">No se encontraron registros</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button 
              type="button" 
              onClick={onClose} 
              className="flex-1 py-2 text-gray-400 text-[14px] hover:text-gray-600 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !selectedId || !suggestedCode}
              className="flex-1 py-2 bg-[#A8D5BA] text-[#2D5A3F] rounded-lg text-[14px] font-bold active:scale-95 transition-all disabled:opacity-40"
            >
              {loading ? "Vinculando..." : "Vincular Ahora"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};