"use client";
import { useState, useEffect, useMemo } from "react";
import { Camion } from "@/app/types/camion";
import { MARCA_VEHICULO_OTRA, MARCAS_VEHICULOS, marcaEstaEnLista } from "@/app/lib/marcasVehiculos";
import {
  FORMULARIO_CREACION_BODY,
  FORMULARIO_CREACION_GRID,
  FORMULARIO_CREACION_INPUT,
  FORMULARIO_CREACION_LABEL,
  FORMULARIO_CREACION_SELECT,
  FormularioPlantilla,
  FormularioPlantillaAcciones,
} from "@/app/components/ui/FormularioPlantilla";

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
  const [marcaError, setMarcaError] = useState<string | null>(null);

  const valorMarcaEnSelect = useMemo(() => {
    const b = formData.brand.trim();
    if (!b) return "";
    const canon = MARCAS_VEHICULOS.find(
      (m) => m.localeCompare(b, "es", { sensitivity: "base" }) === 0,
    );
    return canon ?? MARCA_VEHICULO_OTRA;
  }, [formData.brand]);

  const marcaEsOtra = valorMarcaEnSelect === MARCA_VEHICULO_OTRA;

  useEffect(() => {
    setMarcaError(null);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMarcaError(null);
    if (!formData.brand.trim()) {
      setMarcaError("Elegí marca.");
      return;
    }
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
    if (name === "brand") setMarcaError(null);
    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? Number(value) : value,
    }));
  };

  const handleMarcaSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value;
    setMarcaError(null);
    if (v === "") {
      setFormData((p) => ({ ...p, brand: "" }));
      return;
    }
    if (v === MARCA_VEHICULO_OTRA) {
      setFormData((p) => ({
        ...p,
        brand: marcaEstaEnLista(p.brand) ? "" : p.brand.trim(),
      }));
      return;
    }
    setFormData((p) => ({ ...p, brand: v }));
  };

  return (
    <FormularioPlantilla
      isOpen={isOpen}
      onClose={onClose}
      titulo={truck ? "Editar camión" : "Nuevo camión"}
      subtitulo="Flota básica"
      titleId="camion-form-title"
      maxWidthClass="max-w-2xl"
      footer={
        <FormularioPlantillaAcciones
          formId="camion-form"
          onCancel={onClose}
          submitLabel={truck ? "Actualizar camión" : "Crear camión"}
          loading={loading}
        />
      }
    >
      <form id="camion-form" onSubmit={handleSubmit} className={`${FORMULARIO_CREACION_BODY} space-y-5`}>
          <div className="grid grid-cols-1 gap-x-4 gap-y-5 md:grid-cols-[minmax(8.5rem,10.5rem)_minmax(0,1fr)] md:items-end">
            <div className="w-full max-w-[11rem] md:max-w-none">
              <label htmlFor="camion-plate" className={FORMULARIO_CREACION_LABEL}>
                Placa
              </label>
              <input
                id="camion-plate"
                name="plate"
                type="text"
                value={formData.plate}
                onChange={handleChange}
                placeholder="ABC-123"
                maxLength={16}
                className={`w-full ${FORMULARIO_CREACION_INPUT} uppercase`}
                required
              />
            </div>
            <div className="min-w-0 w-full">
              <div className="flex w-full min-w-0 flex-row flex-nowrap items-end gap-2 sm:gap-3">
                <div className="min-w-0 flex-1 basis-0">
                  <label htmlFor="camion-brand" className={FORMULARIO_CREACION_LABEL}>
                    Marca
                  </label>
                  <div className="flex flex-row flex-nowrap gap-2">
                    <select
                      id="camion-brand"
                      value={valorMarcaEnSelect}
                      onChange={handleMarcaSelect}
                      className={`min-h-[48px] w-full min-w-[9rem] flex-1 sm:min-w-[11rem] ${FORMULARIO_CREACION_SELECT}`}
                    >
                      <option value="">— Elegí marca —</option>
                      {MARCAS_VEHICULOS.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                      <option value={MARCA_VEHICULO_OTRA}>Otra marca…</option>
                    </select>
                    {marcaEsOtra ? (
                      <input
                        id="camion-brand-otra"
                        name="brand"
                        type="text"
                        value={formData.brand}
                        onChange={handleChange}
                        placeholder="Marca"
                        title="Escribí la marca"
                        className={`block w-[9rem] shrink-0 ${FORMULARIO_CREACION_INPUT}`}
                        autoComplete="organization"
                      />
                    ) : null}
                  </div>
                </div>
                <div className="w-32 shrink-0 sm:w-36">
                  <label htmlFor="camion-model" className={FORMULARIO_CREACION_LABEL}>
                    Modelo
                  </label>
                  <input
                    id="camion-model"
                    name="model"
                    placeholder="Ej. 2022"
                    value={formData.model}
                    onChange={handleChange}
                    className={`w-full ${FORMULARIO_CREACION_INPUT}`}
                  />
                </div>
              </div>
              {marcaError ? <p className="mt-1.5 text-base text-red-600">{marcaError}</p> : null}
            </div>
          </div>

          <div className={FORMULARIO_CREACION_GRID}>
            <div>
              <label htmlFor="camion-maxWeight" className={FORMULARIO_CREACION_LABEL}>
                Peso máx (kg)
              </label>
              <input
                id="camion-maxWeight"
                name="maxWeightKg"
                type="number"
                value={formData.maxWeightKg}
                onChange={handleChange}
                className={FORMULARIO_CREACION_INPUT}
                required
              />
            </div>
            <div>
              <label htmlFor="camion-maxVol" className={FORMULARIO_CREACION_LABEL}>
                Volumen (m³)
              </label>
              <input
                id="camion-maxVol"
                name="maxVolumeM3"
                type="number"
                value={formData.maxVolumeM3}
                onChange={handleChange}
                className={FORMULARIO_CREACION_INPUT}
                required
              />
            </div>
            <div>
              <label htmlFor="camion-pallets" className={FORMULARIO_CREACION_LABEL}>
                Cap. pallets
              </label>
              <input
                id="camion-pallets"
                name="palletCapacity"
                type="number"
                value={formData.palletCapacity}
                onChange={handleChange}
                className={FORMULARIO_CREACION_INPUT}
                required
              />
            </div>
          </div>

          <div className={`${FORMULARIO_CREACION_GRID} border-t border-gray-100 pt-4 md:grid-cols-2`}>
            <div>
              <label htmlFor="camion-type" className={FORMULARIO_CREACION_LABEL}>
                Tipo de vehículo
              </label>
              <select
                id="camion-type"
                name="type"
                value={formData.type}
                onChange={handleChange}
                className={FORMULARIO_CREACION_SELECT}
              >
                <option value="Seco">Seco</option>
                <option value="Refrigerado">Refrigerado</option>
                <option value="Isotérmico">Isotérmico</option>
              </select>
            </div>
            <div>
              <label htmlFor="camion-temp" className={FORMULARIO_CREACION_LABEL}>
                Rango térmico
              </label>
              <input
                id="camion-temp"
                name="tempRange"
                type="text"
                disabled={formData.type === "Seco"}
                value={formData.tempRange}
                onChange={handleChange}
                placeholder="-18°C a 5°C"
                className={`${FORMULARIO_CREACION_INPUT} disabled:bg-gray-50`}
              />
            </div>
          </div>
        </form>
    </FormularioPlantilla>
  );
};