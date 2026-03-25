"use client";
import { useState, useEffect, useMemo } from "react";
import { BodegaAsignarModal } from "@/app/components/ui/bodegas/bodegaForm";
import { AsignarBodegaService } from "@/app/services/asignarbodegaService";
import { useAuth } from "@/app/context/AuthContext";
import { WarehouseMeta } from "@/app/interfaces/bodega";

export default function AsignarBodegasPage({ estado }: { estado: string }) {
  const [modalOpen, setModalOpen] = useState(false);
  const { session, loading } = useAuth();

  const clientId = session?.clientId || "";
  const codeCuenta = session?.codeCuenta || "";

  const [bodegasAsignadas, setBodegasAsignadas] = useState<WarehouseMeta[]>([]);
  const [isFetching, setIsFetching] = useState(true);

  const bodegasDeEsteTipo = useMemo(
    () => bodegasAsignadas.filter((b) => b.status === estado),
    [bodegasAsignadas, estado],
  );

  const fetchBodegas = async () => {
    if (codeCuenta) {
      setIsFetching(true);
      try {
        const list = await AsignarBodegaService.getWarehousesByCode(codeCuenta);
        setBodegasAsignadas(list ?? []); 
      } catch (error) {
        console.error("Error al traer bodegas:", error);
        setBodegasAsignadas([]);
      } finally {
        setIsFetching(false);
      }
    }
  };

  useEffect(() => {
    if (!loading) fetchBodegas();
  }, [codeCuenta, loading]);

  if (loading) return <div className="p-8 text-center animate-pulse">Cargando sesión...</div>;

  const tipoLabel = estado === "interna" ? "internas" : "externas";

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Infraestructura</h1>
          <p className="text-slate-500 text-sm">
            Bodegas <b>{tipoLabel}</b> vinculadas a tu cuenta:{" "}
            <b>{bodegasDeEsteTipo.length}</b>
          </p>
        </div>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="px-4 py-2 rounded-lg font-bold text-sm transition-all bg-emerald-100 text-emerald-700 hover:bg-emerald-200 shrink-0"
        >
          + Vincular otra bodega {estado}
        </button>
      </header>

      <div className="grid gap-4">
        {isFetching ? (
          <p className="text-slate-400 text-sm italic">Buscando bodegas...</p>
        ) : bodegasDeEsteTipo.length > 0 ? (
          bodegasDeEsteTipo.map((bodega) => (
            <div key={bodega.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded ${
                    bodega.status === 'interna' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'
                  }`}>
                    Bodega {bodega.status}
                  </span>
                  <h2 className="text-2xl font-bold text-slate-800 mt-2">{bodega.name}</h2>
                </div>
                <span className="text-xs font-medium text-slate-400">ID: {bodega.id.slice(0,6)}</span>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
            <p className="text-slate-400">
              No hay bodegas {tipoLabel} vinculadas. Usá el botón de arriba para agregar la primera.
            </p>
          </div>
        )}
      </div>

      <BodegaAsignarModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        onSuccess={fetchBodegas}
        clientId={clientId} 
        estado={estado}
      /> 
    </div>
  );
}