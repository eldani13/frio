"use client";
import { useEffect, useState } from "react";
import { TruckService } from "@/app/services/camionService";
import { ViajeVentaTransporteService } from "@/app/services/viajeVentaTransporteService";
import { Camion } from "@/app/types/camion";
import { TruckTable } from "@/app/components/ui/camiones/camionTable";
import { TruckForm } from "@/app/components/ui/camiones/camionForm";
import { HiOutlinePlus,HiOutlineSquares2X2 } from "react-icons/hi2";
import { useAuth } from "@/app/context/AuthContext";
import { swalConfirmDelete, swalError } from "@/lib/swal";

export default function TrucksPage() {
  const [trucks, setTrucks] = useState<Camion[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTruck, setSelectedTruck] = useState<Camion | null>(null);

  const { session } = useAuth();
  const codeCuenta = session?.codeCuenta ?? "";
  const idCliente = session?.clientId ?? "";

  useEffect(() => {
    if (!idCliente.trim()) {
      setTrucks([]);
      return;
    }
    const unsub = TruckService.subscribeByCodeCuenta(idCliente, codeCuenta, (data) => {
      void ViajeVentaTransporteService.reconciliarCamionesSegunViajes(idCliente, data).then(setTrucks);
    });
    return () => unsub();
  }, [idCliente, codeCuenta]);

  const handleSuccess = async (data: Omit<Camion, 'id' | 'numericId' | 'code' | 'createdAt'>) => {
    try {
      if (!idCliente) return;
      if (selectedTruck?.id) {
        await TruckService.update(idCliente, selectedTruck.id, data);
      } else {
        await TruckService.create(data, idCliente, codeCuenta);
      }
      setIsModalOpen(false); // Cerramos el modal tras el éxito
    } catch (_error) {
      void swalError("No se pudo guardar", "Hubo un error al guardar los datos del camión.");
    }
  };

  // Lógica de eliminación
  const handleDelete = async (id: string) => {
    if (!idCliente) return;
    const ok = await swalConfirmDelete(
      "¿Eliminar este vehículo?",
      "Esta acción no se puede deshacer.",
    );
    if (!ok) return;
    try {
      await TruckService.delete(idCliente, id);
    } catch (_error) {
      void swalError("No se pudo eliminar", "No se pudo eliminar el camión.");
    }
  };

  return (
    <main className="max-w-6xl mx-auto p-8">
      {/* Header de la página */}
      <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[#f8edb1] rounded-2xl text-[#2D5A3F]">
            <HiOutlineSquares2X2 size={28} />
          </div>
          <div>
            <h1 className="app-title">Flota de Camiones</h1>
          </div>
        </div>
        
        <button 
          onClick={() => { 
            setSelectedTruck(null); 
            setIsModalOpen(true); 
          }}
          className="bg-[#A8D5BA] text-[#2D5A3F] px-6 py-2.5 rounded-[10px] font-semibold text-base flex items-center gap-2 hover:bg-[#97c4a9] transition-all active:scale-95 shadow-sm"
        >
          <HiOutlinePlus strokeWidth={2.5} /> Nuevo Vehículo
        </button>
      </header>

      {/* Tabla de Datos */}
      <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <TruckTable 
          trucks={trucks} 
          onEdit={(t) => { 
            setSelectedTruck(t); 
            setIsModalOpen(true); 
          }} 
          onDelete={handleDelete} 
        />
      </section>

      {/* Modal de Formulario */}
      <TruckForm 
        isOpen={isModalOpen} 
        truck={selectedTruck}
        onClose={() => setIsModalOpen(false)} 
        onSuccess={handleSuccess} 
      />
      
      {/* Resumen rápido al pie (Opcional) */}
      <footer className="mt-6 flex gap-4 text-base text-gray-400">
        <span>Total unidades: <strong>{trucks.length}</strong></span>
        <span>•</span>
        <span>Disponibles: <strong>{trucks.filter(t => t.isAvailable).length}</strong></span>
      </footer>
    </main>
  );
}