"use client";
import { useEffect, useState } from "react";
import { CompradorService } from "@/app/services/compradorService"; // Importación del Service
import { Comprador } from "@/app/types/comprador"; // Importación del Type
import { CompradorTable } from "@/app/components/ui/compradores/CompradorTable";
import { CompradorForm } from "@/app/components/ui/compradores/CompradorForm";
import { HiOutlinePlus,HiOutlineSquares2X2 } from "react-icons/hi2";
import { useAuth } from "@/app/context/AuthContext";
import { swalConfirmDelete, swalError } from "@/lib/swal";

export default function CompradoresPage() {
  const [compradores, setCompradores] = useState<Comprador[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedComprador, setSelectedComprador] = useState<Comprador | null>(null);

  const { session } = useAuth();
  const codeCuenta = session?.codeCuenta ?? "";
  const idCliente = session?.clientId ?? "";

  useEffect(() => {
    if (!idCliente.trim()) {
      setCompradores([]);
      return;
    }
    const unsub = CompradorService.subscribeByCodeCuenta(idCliente, codeCuenta, setCompradores);
    return () => unsub();
  }, [idCliente, codeCuenta]);

  const handleSuccess = async (name: string) => {
    try {
      if (!idCliente) return;
      if (selectedComprador?.id) {
        await CompradorService.update(idCliente, selectedComprador.id, { name });
      } else {
        await CompradorService.create(name, idCliente, codeCuenta);
      }
    } catch (error) {
      console.error("Error en la operación:", error);
      void swalError("Error", "Hubo un error al procesar la solicitud.");
    }
  };

  // Manejador para Eliminar
  const handleDelete = async (id: string) => {
    if (!idCliente) return;
    const ok = await swalConfirmDelete("¿Eliminar este comprador?", "Se eliminará de forma definitiva.");
    if (!ok) return;
    try {
      await CompradorService.delete(idCliente, id);
    } catch (error) {
      console.error("Error al eliminar:", error);
      void swalError("No se pudo eliminar", "Reintentá o revisá que el comprador no esté en uso.");
    }
  };

  return (
    <main className="max-w-4xl mx-auto p-8">
      <header className="mb-10 flex justify-between items-center">
      <div className="flex items-center gap-4">
          <div className="p-3 bg-[#f8edb1] rounded-2xl text-[#2D5A3F]">
            <HiOutlineSquares2X2 size={28} />
          </div>
          <div>
            <h1 className="app-title">Compradores</h1>
          </div>
        </div>
        
        <button 
          onClick={() => { 
            setSelectedComprador(null); 
            setIsModalOpen(true); 
          }}
          className="bg-[#A8D5BA] text-[#2D5A3F] px-6 py-2.5 rounded-[10px] font-semibold text-base flex items-center gap-2 hover:bg-[#97c4a9] transition-all active:scale-95"
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