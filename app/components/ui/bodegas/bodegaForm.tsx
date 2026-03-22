"use client";
import { useState, useEffect } from "react";
import { HiOutlineXMark } from "react-icons/hi2";
import { WarehouseMeta } from "@/app/interfaces/bodega";
import { AsignarBodegaService } from "@/app/services/asignarbodegaService";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void>;
  clientId: string; // Pasamos el clientId del usuario logueado
}

export const BodegaAsignarModal = ({ isOpen, onClose, onSuccess, clientId }: Props) => {
  const [bodegas, setBodegas] = useState<WarehouseMeta[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [suggestedCode, setSuggestedCode] = useState(""); // El "MIT00"
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    setLoading(true);
    // 1. Cargar bodegas pendientes
    const list = await AsignarBodegaService.getPendingBodegas();
    setBodegas(list);

    // 2. Cargar el 'code' del cliente (ej. MIT00)
    const code = await AsignarBodegaService.getClienteCode(clientId);
    if (code) setSuggestedCode(code);
    setLoading(false);
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
            <p className="text-[12px] text-gray-500">Se asignará el código: <b className="text-green-600">{suggestedCode}</b></p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><HiOutlineXMark size={24} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[11px] font-bold text-gray-400 uppercase mb-2">Selecciona la Bodega</label>
            <div className="max-h-48 overflow-y-auto border border-gray-100 rounded-lg divide-y">
              {bodegas.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setSelectedId(b.id)}
                  className={`w-full text-left px-4 py-3 text-[14px] transition-all ${
                    selectedId === b.id ? "bg-green-50 text-green-700 font-bold border-l-4 border-green-500" : "hover:bg-gray-50"
                  }`}
                >
                  {b.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 text-gray-500 text-[14px]">Cancelar</button>
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