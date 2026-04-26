"use client";
import { useState, useEffect } from "react";
import { WarehouseMeta } from "@/app/interfaces/bodega";
import {
  FORMULARIO_CREACION_BODY,
  FORMULARIO_CREACION_LABEL,
  FormularioPlantilla,
  FormularioPlantillaAcciones,
} from "@/app/components/ui/FormularioPlantilla";
import { AsignarBodegaService } from "@/app/services/asignarbodegaService";
import { useAuth } from "@/app/context/AuthContext";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void>;
  clientId: string; 
  estado: string; // Viene dinámico del Page (ej: "interna" o "externa")
  
}

export const BodegaAsignarModal = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  clientId: _clientId, 
  estado, 
}: Props) => {
  
  const { session } = useAuth(); 
  const [bodegas, setBodegas] = useState<WarehouseMeta[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [suggestedCode, setSuggestedCode] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, session, estado]); // Se recarga si cambia cualquier filtro del Page

  const loadData = async () => {
    setLoading(true);
    try {
      // Usamos los parámetros exactos que nos pasó el Page
      const list = await AsignarBodegaService.getPendingBodegas(estado);
      setBodegas(list);

      if (session?.codeCuenta) {
        setSuggestedCode(session.codeCuenta);
      }
    } catch (error) {
      console.error("Error cargando datos:", error);
    } finally {
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
      console.error("Error al asignar:", error);
      alert("No se pudo vincular la bodega");
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormularioPlantilla
      isOpen={isOpen}
      onClose={onClose}
      titulo={`Vincular bodega ${estado}`}
      subtitulo="Vincular cuenta"
      titleId="bodega-asignar-title"
      maxWidthClass="max-w-md"
      footer={
        <FormularioPlantillaAcciones
          formId="bodega-asignar-form"
          onCancel={onClose}
          submitLabel="Vincular ahora"
          loading={loading}
          loadingLabel="Vinculando…"
          submitDisabled={!selectedId || !suggestedCode}
        />
      }
    >
      <form id="bodega-asignar-form" onSubmit={handleSubmit} className={`${FORMULARIO_CREACION_BODY} space-y-5`}>
          <p className="text-base text-gray-600">
            Cuenta:{" "}
            <span className="font-mono font-bold text-[#2D5A3F]">{suggestedCode || "—"}</span>
          </p>
          <div>
            <span className={FORMULARIO_CREACION_LABEL}>Listado</span>
            <div className="max-h-48 divide-y overflow-y-auto rounded-[12px] border border-gray-200 bg-white shadow-sm">
              {bodegas.length > 0 ? (
                bodegas.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setSelectedId(b.id)}
                    className={`w-full text-left px-4 py-3 text-base transition-all ${
                      selectedId === b.id 
                        ? "bg-green-50 text-green-700 font-bold border-l-4 border-green-500" 
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <span>{b.name}</span>
                    
                  </button>
                ))
              ) : (
                <div className="p-10 text-center">
                  <p className="text-base text-gray-400">Sin registros.</p>
                </div>
              )}
            </div>
          </div>
        </form>
    </FormularioPlantilla>
  );
};