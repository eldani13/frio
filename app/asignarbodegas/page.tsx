"use client";
import { useState, useEffect } from "react";
import { BodegaAsignarModal } from "@/app/components/ui/bodegas/bodegaForm";
import { AsignarBodegaService } from "@/app/services/asignarbodegaService";
import { useAuth } from "@/app/context/AuthContext"; 

export default function AsignarBodegasPage() {
  // El modal abre automático como pediste
  const [modalOpen, setModalOpen] = useState(true);
  const { session, loading } = useAuth();
  
  const clientId = session?.clientId;
  const codeCuenta = session?.codeCuenta;
  
  const [bodegaName, setBodegaName] = useState<string>("Buscando...");

  // Carga el nombre de la bodega basado en el codeCuenta
  useEffect(() => {
    const fetchBodega = async () => {
      if (codeCuenta) {
        const name = await AsignarBodegaService.getWarehouseNameByCode(codeCuenta);
        setBodegaName(name || "No encontrada");
      } else if (!loading) {
        setBodegaName("Sin cuenta asignada");
      }
    };

    fetchBodega();
  }, [codeCuenta, loading]);

  const handleRefresh = async () => {
    console.log("Bodega actualizada con éxito");
    // Refrescamos el nombre tras la asignación
    if (codeCuenta) {
      const name = await AsignarBodegaService.getWarehouseNameByCode(codeCuenta);
      setBodegaName(name || "Actualizado");
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="animate-pulse text-slate-500 font-medium">Cargando sesión...</p>
    </div>
  );

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Asignación de Bodegas</h1>
        
      </header>
      
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest">
          Bodega asignada
        </span>
        
        {/* Aquí se muestra el nombre buscado por codeCuenta */}
        <h2 className="text-2xl font-bold text-slate-800 mt-1">
          {bodegaName}
        </h2>

        <div className="mt-4 pt-4 border-t border-slate-100">
          <p className="text-gray-400 text-[10px] uppercase">ID Cliente</p>
          <p className="font-mono text-sm text-slate-600 mb-3">
            {clientId || "Sin cliente asignada"}
          </p>

          <p className="text-gray-400 text-[10px] uppercase">Cuenta asignada</p>
          <p className="font-bold text-slate-800">
            {codeCuenta || "Sin cuenta asignada"}
          </p>
        </div>

        <BodegaAsignarModal 
          isOpen={modalOpen} 
          onClose={() => setModalOpen(false)} 
          onSuccess={handleRefresh}
          clientId={clientId || ""} 
        /> 
      </div>
    </div>
  );
}