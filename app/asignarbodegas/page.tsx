"use client";
import { useState, useEffect } from "react";
import { BodegaAsignarModal } from "@/app/components/ui/bodegas/bodegaForm";
import { AsignarBodegaService } from "@/app/services/asignarbodegaService";
import { useAuth } from "@/app/context/AuthContext";
import { WarehouseMeta } from "@/app/interfaces/bodega"; // Asegúrate de importar la interfaz

export default function AsignarBodegasPage({ estado }: { estado: string }) {
  const [modalOpen, setModalOpen] = useState(true);
  const { session, loading } = useAuth();
  
  const clientId = session?.clientId || "";
  const codeCuenta = session?.codeCuenta || "";
  
  // CAMBIO: Ahora es una lista de objetos de bodega
  const [bodegasAsignadas, setBodegasAsignadas] = useState<WarehouseMeta[]>([]);
  const [isFetching, setIsFetching] = useState(true);

  const fetchBodegas = async () => {
    if (codeCuenta) {
      setIsFetching(true);
      try {
        const list = await AsignarBodegaService.getWarehousesByCode(codeCuenta);
        
        // ✅ CORRECCIÓN: Si 'list' es null o undefined, usamos []
        setBodegasAsignadas(list ?? []); 
        
      } catch (error) {
        console.error("Error al traer bodegas:", error);
        setBodegasAsignadas([]); // En caso de error, lista vacía
      } finally {
        setIsFetching(false);
      }
    }
  };

  useEffect(() => {
    if (!loading) fetchBodegas();
  }, [codeCuenta, loading]);

  const handleRefresh = async () => {
    console.log("Refrescando lista de bodegas...");
    await fetchBodegas();
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="animate-pulse text-slate-500 font-medium">Cargando sesión...</p>
    </div>
  );

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Infraestructura Asignada</h1>
         
        </div>
        <button 
          onClick={() => setModalOpen(true)}
          className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg font-bold text-sm hover:bg-emerald-200 transition-colors"
        >
          + Vincular otra
        </button>
      </header>
      
      <div className="grid gap-4">
        {isFetching ? (
          <p className="text-slate-400 text-sm italic">Buscando bodegas...</p>
        ) : bodegasAsignadas.length > 0 ? (
          bodegasAsignadas.map((bodega) => (
            <div key={bodega.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded ${
                    bodega.status === 'interna' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'
                  }`}>
                    Bodega {bodega.status || 'Asignada'}
                  </span>
                  <h2 className="text-2xl font-bold text-slate-800 mt-2">{bodega.name}</h2>
                </div>
                <span className="text-xs font-medium text-slate-400">ID: {bodega.id.slice(0,6)}</span>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400 text-[10px] uppercase font-bold">Cuenta vinculada</p>
                  <p className="font-mono text-sm text-slate-600">{codeCuenta}</p>
                </div>
               
              </div>
            </div>
          ))
        ) : (
          <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
            <p className="text-slate-400">No tienes bodegas asignadas actualmente.</p>
          </div>
        )}
      </div>

      <BodegaAsignarModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        onSuccess={handleRefresh}
        clientId={clientId} 
        estado={estado}
      /> 
    </div>
  );
}