"use client";
import { useState, useEffect } from "react";
import { HiOutlineXMark } from "react-icons/hi2";
import { Planta } from "@/app/types/planta";

// Definimos los campos que el FORMULARIO no maneja (se generan en DB o son automáticos)
type PlantaFormData = Omit<Planta, 'id' | 'numericId' | 'code' | 'createdAt' | 'codeCuenta'>;

interface PlantaFormProps {
  isOpen: boolean;
  onClose: () => void;
  // El éxito devuelve la data limpia sin los campos automáticos
  onSuccess: (data: PlantaFormData) => Promise<void>;
  planta?: Planta | null;
}

const initialForm: PlantaFormData = {
  name: "",
  plantName: "",
  location: "",
  maxPallets: 0,
  tempRange: "",
  isOperational: true,
};

export const PlantaForm = ({ isOpen, onClose, onSuccess, planta }: PlantaFormProps) => {
  const [formData, setFormData] = useState<PlantaFormData>(initialForm);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (planta) {
      setFormData({
        name: planta.name,
        plantName: planta.plantName,
        location: planta.location,
        maxPallets: planta.maxPallets,
        tempRange: planta.tempRange,
        isOperational: planta.isOperational,
      });
    } else {
      setFormData(initialForm);
    }
  }, [planta, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSuccess(formData);
      onClose();
    } catch (error) {
      console.error("Error al procesar planta:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" 
        ? (e.target as HTMLInputElement).checked 
        : type === "number" ? Number(value) : value,
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-lg rounded-[12px] shadow-xl border border-gray-100 p-6 animate-in fade-in zoom-in duration-200 overflow-y-auto max-h-[90vh]">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-[18px] font-semibold text-gray-900">
            {planta ? "Editar Planta" : "Nueva Planta"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <HiOutlineXMark size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Razón Social</label>
            <input
              autoFocus
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              placeholder="Ej. Logística Central S.A."
              className="w-full px-4 py-2 border border-gray-200 rounded-[8px] focus:outline-none focus:border-[#A8D5BA] text-[14px]"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Nombre Planta</label>
              <input
                name="plantName"
                type="text"
                value={formData.plantName}
                onChange={handleChange}
                placeholder="Ej. Bodega Norte"
                className="w-full px-4 py-2 border border-gray-200 rounded-[8px] focus:outline-none focus:border-[#A8D5BA] text-[14px]"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Ubicación / Zona</label>
              <input
                name="location"
                type="text"
                value={formData.location}
                onChange={handleChange}
                placeholder="Ej. Barranquilla"
                className="w-full px-4 py-2 border border-gray-200 rounded-[8px] focus:outline-none focus:border-[#A8D5BA] text-[14px]"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Capacidad (Pallets)</label>
              <input
                name="maxPallets"
                type="number"
                value={formData.maxPallets}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-200 rounded-[8px] focus:outline-none focus:border-[#A8D5BA] text-[14px]"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Rango Térmico</label>
              <input
                name="tempRange"
                type="text"
                value={formData.tempRange}
                onChange={handleChange}
                placeholder="Ej. -18°C a 4°C"
                className="w-full px-4 py-2 border border-gray-200 rounded-[8px] focus:outline-none focus:border-[#A8D5BA] text-[14px]"
                required
              />
            </div>
          </div>

          <div className="flex items-center gap-3 py-2">
            <input
              id="isOperational"
              name="isOperational"
              type="checkbox"
              checked={formData.isOperational}
              onChange={handleChange}
              className="w-4 h-4 text-[#A8D5BA] border-gray-300 rounded focus:ring-[#A8D5BA]"
            />
            <label htmlFor="isOperational" className="text-[14px] font-medium text-gray-700">Planta Operativa</label>
          </div>

          <div className="flex gap-3 pt-4">
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
              className="flex-1 px-4 py-2 bg-[#A8D5BA] text-[#2D5A3F] rounded-[8px] text-[14px] font-bold hover:bg-[#97c4a9] active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? "Guardando..." : planta ? "Actualizar" : "Crear Planta"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};