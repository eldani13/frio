"use client";
import { useState, useEffect, type CSSProperties } from "react";
import { PhoneInput } from "react-international-phone";
import {
  FORMULARIO_CREACION_BODY,
  FORMULARIO_CREACION_INPUT,
  FORMULARIO_CREACION_LABEL,
  FormularioPlantilla,
  FormularioPlantillaAcciones,
} from "@/app/components/ui/FormularioPlantilla";
import "react-international-phone/style.css";
import { Provider } from "@/app/types/provider";
import { normalizeStoredTelefono } from "./providerPhone";

export type ProviderFormPayload = {
  name: string;
  nombre: string;
  telefono: string;
  email: string;
};

interface ProviderFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: ProviderFormPayload) => Promise<void>;
  provider?: Provider | null; // Agregamos el proveedor opcional
}

export const ProviderForm = ({ isOpen, onClose, onSuccess, provider }: ProviderFormProps) => {
  const [name, setName] = useState("");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  // Sincronizar cuando se abre para crear o editar
  useEffect(() => {
    if (provider) {
      setName(provider.name);
      setNombre(provider.nombre ?? "");
      setTelefono(normalizeStoredTelefono(provider.telefono));
      setEmail(provider.email ?? "");
    } else {
      setName("");
      setNombre("");
      setTelefono("");
      setEmail("");
    }
  }, [provider, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setLoading(true);
    await onSuccess({
      name: name.trim(),
      nombre: nombre.trim(),
      telefono: telefono.trim(),
      email: email.trim(),
    });
    setLoading(false);
    setName("");
    setNombre("");
    setTelefono("");
    setEmail("");
    onClose();
  };

  return (
    <FormularioPlantilla
      isOpen={isOpen}
      onClose={onClose}
      titulo={provider ? "Editar proveedor" : "Nuevo proveedor"}
      subtitulo="Datos contacto"
      titleId="provider-form-title"
      maxWidthClass="max-w-md"
      footer={
        <FormularioPlantillaAcciones
          formId="provider-form"
          onCancel={onClose}
          submitLabel={provider ? "Actualizar" : "Crear proveedor"}
          loading={loading}
        />
      }
    >
      <form id="provider-form" onSubmit={handleSubmit} className={`${FORMULARIO_CREACION_BODY} space-y-5`}>
          <div>
            <label htmlFor="provider-name" className={FORMULARIO_CREACION_LABEL}>
              Proveedor
            </label>
            <input
              id="provider-name"
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Suministros Industriales S.A."
              className={FORMULARIO_CREACION_INPUT}
              required
            />
          </div>
          <div>
            <label htmlFor="provider-nombre" className={FORMULARIO_CREACION_LABEL}>
              Nombre
            </label>
            <input
              id="provider-nombre"
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. contacto o representante"
              className={FORMULARIO_CREACION_INPUT}
            />
          </div>
          <div>
            <span className={FORMULARIO_CREACION_LABEL}>Teléfono</span>
            <div
              className="provider-phone-input [&_.react-international-phone-country-selector-dropdown]:z-[100] [&_.react-international-phone-input-container]:w-full [&_.react-international-phone-input]:min-w-0 [&_.react-international-phone-input]:flex-1 [&_.react-international-phone-input]:text-base [&_.react-international-phone-input-container]:focus-within:[&_.react-international-phone-country-selector-button]:border-[#A8D5BA] [&_.react-international-phone-input-container]:focus-within:[&_.react-international-phone-input]:border-[#A8D5BA]"
              style={
                {
                  "--react-international-phone-height": "48px",
                  "--react-international-phone-border-radius": "12px",
                  "--react-international-phone-border-color": "#e5e7eb",
                  "--react-international-phone-font-size": "16px",
                  "--react-international-phone-background-color": "#ffffff",
                } as CSSProperties
              }
            >
              <PhoneInput
                value={telefono}
                onChange={(phone) => setTelefono(phone)}
                defaultCountry="co"
                preferredCountries={["co", "mx", "es", "us", "ar", "pe", "cl", "ec", "pa", "ve"]}
                placeholder="Número"
                inputProps={{
                  name: "telefono",
                  autoComplete: "tel",
                }}
              />
            </div>
          </div>
          <div>
            <label htmlFor="provider-email" className={FORMULARIO_CREACION_LABEL}>
              Email
            </label>
            <input
              id="provider-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contacto@empresa.com"
              className={FORMULARIO_CREACION_INPUT}
            />
          </div>
        </form>
    </FormularioPlantilla>
  );
};