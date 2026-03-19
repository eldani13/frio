"use client";
import { useEffect, useState } from "react";
import { PlantaService } from "@/app/services/plantaService";
import { Planta } from "@/app/types/planta";
import { PlantaTable } from "@/app/components/ui/plantas/PlantaTable";
import { PlantaForm } from "@/app/components/ui/plantas/PlantaForm";
import { HiOutlinePlus } from "react-icons/hi2";

export default function PlantasPage() {
  const [plantas, setPlantas] = useState<Planta[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlanta, setSelectedPlanta] = useState<Planta | null>(null);

  const load = async () => setPlantas(await PlantaService.getAll());
  
  useEffect(() => { 
    load(); 
  }, []);

  const handleSuccess = async (data: Omit<Planta, 'id' | 'numericId' | 'code' | 'createdAt'>) => {
    try {
      if (selectedPlanta?.id) {
        await PlantaService.update(selectedPlanta.id, data);
      } else {
        await PlantaService.create(data);
      }
      await load();
    } catch (error) {
      console.error("Error al guardar la planta:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("¿Eliminar esta planta definitivamente?")) {
      await PlantaService.delete(id);
      await load();
    }
  };

  return (
    <main className="max-w-5xl mx-auto p-8 font-['Inter']">
      <header className="mb-10 flex justify-between items-center">
        <div>
          <h1 className="text-[32px] font-bold text-gray-900 tracking-tight">Plantas</h1>
          <p className="text-[#2D5A3F]/60 text-[14px]">Gestión de plantas</p>
        </div>
        <button 
          onClick={() => { setSelectedPlanta(null); setIsModalOpen(true); }}
          className="bg-[#A8D5BA] text-[#2D5A3F] px-6 py-2.5 rounded-[10px] font-semibold text-[14px] flex items-center gap-2 hover:bg-[#97c4a9] transition-all active:scale-95"
        >
          <HiOutlinePlus strokeWidth={2.5} /> Nueva Planta
        </button>
      </header>

      <PlantaTable 
        plantas={plantas} 
        onEdit={(p) => { setSelectedPlanta(p); setIsModalOpen(true); }} 
        onDelete={handleDelete} 
      />

      <PlantaForm 
        isOpen={isModalOpen} 
        planta={selectedPlanta}
        onClose={() => setIsModalOpen(false)} 
        onSuccess={handleSuccess} 
      />
    </main>
  );
}