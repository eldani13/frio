"use client";
import { useState, useEffect } from "react";
import { Planta } from "@/app/types/planta";
import {
  FORMULARIO_CREACION_BODY,
  FORMULARIO_CREACION_BOOLEAN_ROW,
  FORMULARIO_CREACION_GRID,
  FORMULARIO_CREACION_INPUT,
  FORMULARIO_CREACION_LABEL,
  FormularioPlantilla,
  FormularioPlantillaAcciones,
} from "@/app/components/ui/FormularioPlantilla";

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
    <FormularioPlantilla
      isOpen={isOpen}
      onClose={onClose}
      titulo={planta ? "Editar planta" : "Nueva planta"}
      subtitulo="Capacidad planta"
      titleId="planta-form-title"
      maxWidthClass="max-w-lg"
      footer={
        <FormularioPlantillaAcciones
          formId="planta-form"
          onCancel={onClose}
          submitLabel={planta ? "Actualizar" : "Crear planta"}
          loading={loading}
        />
      }
    >
      <form id="planta-form" onSubmit={handleSubmit} className={`${FORMULARIO_CREACION_BODY} space-y-4`}>
          <div>
            <label htmlFor="planta-name" className={FORMULARIO_CREACION_LABEL}>
              Razón social
            </label>
            <input
              id="planta-name"
              autoFocus
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              placeholder="Ej. Logística Central S.A."
              className={FORMULARIO_CREACION_INPUT}
              required
            />
          </div>

          <div className={`${FORMULARIO_CREACION_GRID} md:grid-cols-2`}>
            <div>
              <label htmlFor="planta-plantName" className={FORMULARIO_CREACION_LABEL}>
                Nombre planta
              </label>
              <input
                id="planta-plantName"
                name="plantName"
                type="text"
                value={formData.plantName}
                onChange={handleChange}
                placeholder="Ej. Bodega Norte"
                className={FORMULARIO_CREACION_INPUT}
                required
              />
            </div>
            <div>
              <label htmlFor="planta-location" className={FORMULARIO_CREACION_LABEL}>
                Ubicación / zona
              </label>
              <input
                id="planta-location"
                name="location"
                type="text"
                value={formData.location}
                onChange={handleChange}
                placeholder="Ej. Barranquilla"
                className={FORMULARIO_CREACION_INPUT}
                required
              />
            </div>
          </div>

          <div className={`${FORMULARIO_CREACION_GRID} md:grid-cols-2`}>
            <div>
              <label htmlFor="planta-maxPallets" className={FORMULARIO_CREACION_LABEL}>
                Capacidad (pallets)
              </label>
              <input
                id="planta-maxPallets"
                name="maxPallets"
                type="number"
                value={formData.maxPallets}
                onChange={handleChange}
                className={FORMULARIO_CREACION_INPUT}
                required
              />
            </div>
            <div>
              <label htmlFor="planta-tempRange" className={FORMULARIO_CREACION_LABEL}>
                Rango térmico
              </label>
              <input
                id="planta-tempRange"
                name="tempRange"
                type="text"
                value={formData.tempRange}
                onChange={handleChange}
                placeholder="Ej. -18°C a 4°C"
                className={FORMULARIO_CREACION_INPUT}
                required
              />
            </div>
          </div>

          <div className={FORMULARIO_CREACION_BOOLEAN_ROW}>
            <input
              id="isOperational"
              name="isOperational"
              type="checkbox"
              checked={formData.isOperational}
              onChange={handleChange}
              className="h-4 w-4 shrink-0 rounded border-gray-300 text-[#A8D5BA] focus:ring-[#A8D5BA]"
            />
            <label htmlFor="isOperational" className="text-base font-medium text-gray-700">
              Planta operativa
            </label>
          </div>
        </form>
    </FormularioPlantilla>
  );
};