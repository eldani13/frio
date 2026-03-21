"use client";
import { useEffect, useState } from "react";
import { CompradorService } from "@/app/services/compradorService"; // Importación del Service
import { Comprador } from "@/app/types/comprador"; // Importación del Type
import { CompradorTable } from "@/app/components/ui/compradores/CompradorTable";
import { CompradorForm } from "@/app/components/ui/compradores/CompradorForm";
import { HiOutlinePlus } from "react-icons/hi2";

export default function CompradoresPage() {
  const [compradores, setCompradores] = useState<Comprador[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedComprador, setSelectedComprador] = useState<Comprador | null>(null);

  // Carga inicial de datos
  const load = async () => {
    const data = await CompradorService.getAll();
    setCompradores(data);
  };

  useEffect(() => {
    load();
  }, []);

  // Manejador para Crear o Actualizar
  const handleSuccess = async (name: string) => {
    try {
      if (selectedComprador?.id) {
        await CompradorService.update(selectedComprador.id, { name });
      } else {
        await CompradorService.create(name);
      }
      await load(); // Recargar la lista tras la operación
    } catch (error) {
      console.error("Error en la operación:", error);
      alert("Hubo un error al procesar la solicitud.");
    }
  };

  // Manejador para Eliminar
  const handleDelete = async (id: string) => {
    if (window.confirm("¿Eliminar este comprador definitivamente?")) {
      try {
        await CompradorService.delete(id);
        await load();
      } catch (error) {
        console.error("Error al eliminar:", error);
      }
    }
  };

  return (
    <main className="max-w-4xl mx-auto p-8 font-['Inter']">
      <header className="mb-10 flex justify-between items-center">
        <div>
          <h1 className="text-[32px] font-bold text-gray-900 tracking-tight">Compradores</h1>
          <p className="text-[#2D5A3F]/60 text-[14px]">Listado y gestión de compradores registrados</p>
        </div>
        
        <button 
          onClick={() => { 
            setSelectedComprador(null); 
            setIsModalOpen(true); 
          }}
          className="bg-[#A8D5BA] text-[#2D5A3F] px-6 py-2.5 rounded-[10px] font-semibold text-[14px] flex items-center gap-2 hover:bg-[#97c4a9] transition-all active:scale-95"
        >
          <HiOutlinePlus strokeWidth={2.5} /> Nuevo Comprador
        </button>
      </header>

      {/* Tabla de Resultados */}
      <CompradorTable 
        compradores={compradores} 
        onEdit={(c) => { 
          setSelectedComprador(c); 
          setIsModalOpen(true); 
        }} 
        onDelete={handleDelete} 
      />

      {/* Modal de Formulario */}
      <CompradorForm 
        isOpen={isModalOpen} 
        comprador={selectedComprador}
        onClose={() => setIsModalOpen(false)} 
        onSuccess={handleSuccess} 
      />
    </main>
  );
}