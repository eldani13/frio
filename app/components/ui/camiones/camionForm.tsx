"use client";
import { useState, useEffect } from "react";
import { HiOutlineXMark } from "react-icons/hi2";
import { Camion } from "@/app/types/camion";

interface TruckFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: TruckFormData) => Promise<void>;
  truck?: Camion | null;
}

// Definimos un tipo para los datos del formulario basándonos en la interfaz original
type TruckFormData = Omit<Camion, 'id' | 'numericId' | 'code' | 'createdAt'>;

const INITIAL_STATE: TruckFormData = {
  plate: "",
  brand: "",
  model: "",
  maxWeightKg: 0,
  maxVolumeM3: 0,
  palletCapacity: 0,
  type: 'Seco', // Ahora TypeScript sabe que es de tipo 'Refrigerado' | 'Seco' | 'Isotérmico'
  tempRange: "",
  isAvailable: true,
  codeCuenta: "",
};

export const TruckForm = ({ isOpen, onClose, onSuccess, truck }: TruckFormProps) => {
  const [formData, setFormData] = useState<TruckFormData>(INITIAL_STATE);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (truck) {
      setFormData({
        plate: truck.plate,
        brand: truck.brand,
        model: truck.model,
        maxWeightKg: truck.maxWeightKg,
        maxVolumeM3: truck.maxVolumeM3,
        palletCapacity: truck.palletCapacity,
        type: truck.type,
        tempRange: truck.tempRange || "",
        isAvailable: truck.isAvailable,
        codeCuenta: truck.codeCuenta,
      });
    } else {
      setFormData(INITIAL_STATE);
    }
  }, [truck, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSuccess(formData);
      onClose();
    } catch (error) {
      console.error("Error al guardar:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-2xl rounded-[12px] shadow-xl border border-gray-100 p-6 animate-in fade-in zoom-in duration-200 overflow-y-auto max-h-[90vh]">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-[18px] font-semibold text-gray-900">
            {truck ? "Editar Camión" : "Nuevo Camión"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <HiOutlineXMark size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Fila 1: Placa y Marca */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Placa / Matrícula</label>
              <input
                name="plate"
                type="text"
                value={formData.plate}
                onChange={handleChange}
                placeholder="ABC-123"
                className="w-full px-4 py-2 border border-gray-200 rounded-[8px] focus:outline-none focus:border-[#A8D5BA] transition-all text-[14px] uppercase"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Marca y Modelo</label>
              <div className="flex gap-2">
                <input
                  name="brand"
                  placeholder="Marca"
                  value={formData.brand}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-200 rounded-[8px] focus:outline-none focus:border-[#A8D5BA] text-[14px]"
                  required
                />
                <input
                  name="model"
                  placeholder="Año"
                  value={formData.model}
                  onChange={handleChange}
                  className="w-32 px-4 py-2 border border-gray-200 rounded-[8px] focus:outline-none focus:border-[#A8D5BA] text-[14px]"
                />
              </div>
            </div>
          </div>

          {/* Fila 2: Capacidades */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Peso Máx (Kg)</label>
              <input
                name="maxWeightKg"
                type="number"
                value={formData.maxWeightKg}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-200 rounded-[8px] focus:outline-none focus:border-[#A8D5BA] text-[14px]"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Volumen (M³)</label>
              <input
                name="maxVolumeM3"
                type="number"
                value={formData.maxVolumeM3}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-200 rounded-[8px] focus:outline-none focus:border-[#A8D5BA] text-[14px]"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Cap. Pallets</label>
              <input
                name="palletCapacity"
                type="number"
                value={formData.palletCapacity}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-200 rounded-[8px] focus:outline-none focus:border-[#A8D5BA] text-[14px]"
                required
              />
            </div>
          </div>

          {/* Fila 3: Tipo y Temperatura */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Tipo de Vehículo</label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-200 rounded-[8px] focus:outline-none focus:border-[#A8D5BA] text-[14px] bg-white"
              >
                <option value="Seco">Seco</option>
                <option value="Refrigerado">Refrigerado</option>
                <option value="Isotérmico">Isotérmico</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Rango Térmico (Opcional)</label>
              <input
                name="tempRange"
                type="text"
                disabled={formData.type === 'Seco'}
                value={formData.tempRange}
                onChange={handleChange}
                placeholder="-18°C a 5°C"
                className="w-full px-4 py-2 border border-gray-200 rounded-[8px] focus:outline-none focus:border-[#A8D5BA] text-[14px] disabled:bg-gray-50"
              />
            </div>
          </div>

          {/* Footer del Modal */}
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
              className="flex-1 px-4 py-2 bg-[#A8D5BA] text-[#2D5A3F] rounded-[8px] text-[14px] font-medium hover:bg-[#97c4a9] active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? "Guardando..." : truck ? "Actualizar Camión" : "Crear Camión"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};