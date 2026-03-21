"use client";
import { useState, useEffect } from "react";
import { HiOutlineXMark } from "react-icons/hi2";
import { Comprador } from "@/app/types/comprador"; // Importación actualizada

interface CompradorFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (name: string) => Promise<void>;
  comprador?: Comprador | null; // Cambiado de provider a comprador
}

export const CompradorForm = ({ isOpen, onClose, onSuccess, comprador }: CompradorFormProps) => {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  // Sincronizar el nombre cuando se abre para editar o se limpia para crear
  useEffect(() => {
    if (comprador) {
      setName(comprador.name);
    } else {
      setName("");
    }
  }, [comprador, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setLoading(true);
    try {
      await onSuccess(name);
      setName("");
      onClose();
    } catch (error) {
      console.error("Error al guardar el comprador:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-[12px] shadow-xl border border-gray-100 p-6 animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-[18px] font-semibold text-gray-900">
            {comprador ? "Editar Comprador" : "Nuevo Comprador"}
          </h2>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <HiOutlineXMark size={24} />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-[12px] font-medium text-gray-500 uppercase mb-2">
              Nombre del Comprador
            </label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Juan Pérez o Distribuidora Central"
              className="w-full px-4 py-3 border border-gray-200 rounded-[8px] focus:outline-none focus:border-[#A8D5BA] transition-all text-[14px]"
              required
            />
          </div>

          {/* Acciones */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-200 rounded-[8px] text-[14px] font-medium text-gray-600 hover:bg-gray-50 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-[#A8D5BA] text-[#2D5A3F] rounded-[8px] text-[14px] font-medium hover:bg-[#97c4a9] active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? "Guardando..." : comprador ? "Actualizar" : "Crear Comprador"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};