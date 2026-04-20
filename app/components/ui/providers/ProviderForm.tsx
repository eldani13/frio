"use client";
import { useState, useEffect, type CSSProperties } from "react";
import { HiOutlineXMark } from "react-icons/hi2";
import { PhoneInput } from "react-international-phone";
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

  if (!isOpen) return null;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-[12px] shadow-xl border border-gray-100 p-6 animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-[18px] font-semibold text-gray-900">
            {provider ? "Editar Proveedor" : "Nuevo Proveedor"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <HiOutlineXMark size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[12px] font-medium text-gray-500 uppercase mb-2">
              Proveedor
            </label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Suministros Industriales S.A."
              className="w-full px-4 py-3 border border-gray-200 rounded-[8px] focus:outline-none focus:border-[#A8D5BA] transition-all text-[14px]"
              required
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-gray-500 uppercase mb-2">
              Nombre
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. contacto o representante"
              className="w-full px-4 py-3 border border-gray-200 rounded-[8px] focus:outline-none focus:border-[#A8D5BA] transition-all text-[14px]"
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-gray-500 uppercase mb-2">
              Teléfono
            </label>
            <div
              className="provider-phone-input [&_.react-international-phone-country-selector-dropdown]:z-[100] [&_.react-international-phone-input-container]:w-full [&_.react-international-phone-input]:min-w-0 [&_.react-international-phone-input]:flex-1 [&_.react-international-phone-input]:text-[14px] [&_.react-international-phone-input-container]:focus-within:[&_.react-international-phone-country-selector-button]:border-[#A8D5BA] [&_.react-international-phone-input-container]:focus-within:[&_.react-international-phone-input]:border-[#A8D5BA]"
              style={
                {
                  "--react-international-phone-height": "46px",
                  "--react-international-phone-border-radius": "8px",
                  "--react-international-phone-border-color": "#e5e7eb",
                  "--react-international-phone-font-size": "14px",
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
            <label className="block text-[12px] font-medium text-gray-500 uppercase mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contacto@empresa.com"
              className="w-full px-4 py-3 border border-gray-200 rounded-[8px] focus:outline-none focus:border-[#A8D5BA] transition-all text-[14px]"
            />
          </div>

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
              {loading ? "Guardando..." : provider ? "Actualizar" : "Crear Proveedor"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};