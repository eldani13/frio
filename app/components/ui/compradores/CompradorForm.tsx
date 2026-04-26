"use client";
import { useState, useEffect } from "react";
import { Comprador } from "@/app/types/comprador"; // Importación actualizada
import {
  FORMULARIO_CREACION_BODY,
  FORMULARIO_CREACION_INPUT,
  FORMULARIO_CREACION_LABEL,
  FormularioPlantilla,
  FormularioPlantillaAcciones,
} from "@/app/components/ui/FormularioPlantilla";

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
    <FormularioPlantilla
      isOpen={isOpen}
      onClose={onClose}
      titulo={comprador ? "Editar comprador" : "Nuevo comprador"}
      subtitulo="Cuenta comprador"
      titleId="comprador-form-title"
      maxWidthClass="max-w-md"
      footer={
        <FormularioPlantillaAcciones
          formId="comprador-form"
          onCancel={onClose}
          submitLabel={comprador ? "Actualizar" : "Crear comprador"}
          loading={loading}
        />
      }
    >
      <form id="comprador-form" onSubmit={handleSubmit} className={`${FORMULARIO_CREACION_BODY} space-y-6`}>
          <div>
            <label htmlFor="comprador-name" className={FORMULARIO_CREACION_LABEL}>
              Nombre del comprador
            </label>
            <input
              id="comprador-name"
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Juan Pérez o Distribuidora Central"
              className={FORMULARIO_CREACION_INPUT}
              required
            />
          </div>
        </form>
    </FormularioPlantilla>
  );
};