"use client";
import { useEffect, useState } from "react";
import { CompradorService } from "@/app/services/compradorService"; // Importación del Service
import { Comprador } from "@/app/types/comprador"; // Importación del Type
import { CompradorTable } from "@/app/components/ui/compradores/CompradorTable";
import { CompradorForm } from "@/app/components/ui/compradores/CompradorForm";
import { HiOutlinePlus,HiOutlineSquares2X2 } from "react-icons/hi2";
import { useAuth } from "@/app/context/AuthContext";

export default function CompradoresPage() {
  const [compradores, setCompradores] = useState<Comprador[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedComprador, setSelectedComprador] = useState<Comprador | null>(null);

  const { session } = useAuth();
  const codeCuenta = session?.codeCuenta ?? "";
  const idCliente = session?.clientId ?? "";

  const load = async () => {
    if (!idCliente) {
      setCompradores([]);
      return;
    }
    const data = await CompradorService.getAll(idCliente, codeCuenta);
    setCompradores(data);
  };

  useEffect(() => {
    void load();
  }, [idCliente, codeCuenta]);

  const handleSuccess = async (name: string) => {
    try {
      if (!idCliente) return;
      if (selectedComprador?.id) {
        await CompradorService.update(idCliente, selectedComprador.id, { name });
      } else {
        await CompradorService.create(name, idCliente, codeCuenta);
      }
      await load();
    } catch (error) {
      console.error("Error en la operación:", error);
      alert("Hubo un error al procesar la solicitud.");
    }
  };

  // Manejador para Eliminar
  const handleDelete = async (id: string) => {
    if (!idCliente) return;
    if (window.confirm("¿Eliminar este comprador definitivamente?")) {
      try {
        await CompradorService.delete(idCliente, id);
        await load();
      } catch (error) {
        console.error("Error al eliminar:", error);
      }
    }
  };

  return (
    <main className="max-w-4xl mx-auto p-8 font-['Inter']">
      <header className="mb-10 flex justify-between items-center">
      <div className="flex items-center gap-4">
          <div className="p-3 bg-[#f8edb1] rounded-2xl text-[#2D5A3F]">
            <HiOutlineSquares2X2 size={28} />
          </div>
          <div>
            <h1 className="text-[28px] font-extrabold text-gray-900 tracking-tight">Compradores</h1>
          </div>
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