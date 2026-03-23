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
}

export const BodegaAsignarModal = ({ isOpen, onClose, onSuccess, clientId }: Props) => {
  // 1. Hook de Auth siempre en el nivel superior
  const { session } = useAuth(); 
  
  const [bodegas, setBodegas] = useState<WarehouseMeta[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [suggestedCode, setSuggestedCode] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, session]); // Re-ejecutar si cambia la sesión mientras está abierto

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Cargar bodegas pendientes
      const list = await AsignarBodegaService.getPendingBodegas();
      setBodegas(list);

      // 2. Extraer el code de la sesión (ya disponible por el hook arriba)
      if (session?.codeCuenta) {
        setSuggestedCode(session.codeCuenta);
      } else {
        console.warn("No se encontró codeCuenta en la sesión");
      }
    } catch (error) {
      console.error("Error cargando datos:", error);
    } finally {
      // El loading se apaga solo cuando AMBAS cosas terminan
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
      alert("Error al actualizar");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-md rounded-[12px] shadow-2xl p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-[18px] font-bold text-gray-800">Vincular Bodega</h2>
            <p className="text-[12px] text-gray-500">
              Se asignará el código: <b className="text-green-600">{suggestedCode || "Cargando..."}</b>
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <HiOutlineXMark size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[11px] font-bold text-gray-400 uppercase mb-2">Selecciona la Bodega</label>
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
                    {b.name}
                  </button>
                ))
              ) : (
                <p className="p-4 text-[12px] text-gray-400 text-center">No hay bodegas pendientes</p>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 text-gray-500 text-[14px]">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !selectedId || !suggestedCode}
              className="flex-1 py-2 bg-[#A8D5BA] text-[#2D5A3F] rounded-lg text-[14px] font-bold disabled:opacity-40"
            >
              {loading ? "Procesando..." : "Confirmar Asignación"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};