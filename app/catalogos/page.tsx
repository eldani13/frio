"use client";
import { useEffect, useState } from "react";
import { CatalogoService } from "@/app/services/catalogoService";
import { Catalogo } from "@/app/types/catalogo";
import { CatalogoTable } from "@/app/components/ui/catalogos/CatalogoTable";
import { CatalogoForm } from "@/app/components/ui/catalogos/CatalogoForm";
import { HiOutlinePlus, HiOutlineSquares2X2 } from "react-icons/hi2";

export default function CatalogoPage() {
  const [productos, setProductos] = useState<Catalogo[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProducto, setSelectedProducto] = useState<Catalogo | null>(null);
  const [loading, setLoading] = useState(true);

  // Carga de datos
  const load = async () => {
    setLoading(true);
    const data = await CatalogoService.getAll();
    setProductos(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  // Lógica para Crear o Actualizar
  const handleSuccess = async (data: Partial<Catalogo>) => {
    try {
      if (selectedProducto?.id) {
        // Si hay un ID, actualizamos
        await CatalogoService.update(selectedProducto.id, data);
      } else {
        // Si no, creamos uno nuevo (asegurándonos de cumplir con los requeridos)
        await CatalogoService.create(data as any);
      }
      await load();
    } catch (error) {
      alert("Hubo un error al procesar la solicitud.");
    }
  };

  // Lógica para Eliminar
  const handleDelete = async (id: string) => {
    if (window.confirm("¿Estás seguro de eliminar este producto? Esta acción no se puede deshacer.")) {
      await CatalogoService.delete(id);
      await load();
    }
  };

  return (
    <main className="max-w-6xl mx-auto p-6 md:p-10 font-['Inter']">
      {/* Header de la página */}
      <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[#f8edb1] rounded-2xl text-[#2D5A3F]">
            <HiOutlineSquares2X2 size={28} />
          </div>
          <div>
            <h1 className="text-[28px] font-extrabold text-gray-900 tracking-tight">Catálogo</h1>
           
          </div>
        </div>

        <button 
          onClick={() => { setSelectedProducto(null); setIsModalOpen(true); }}
          className="bg-[#A8D5BA] text-[#2D5A3F] px-6 py-3 rounded-[14px] font-bold text-[14px] flex items-center gap-2 hover:bg-[#97c4a9] transition-all active:scale-95 shadow-sm shadow-[#A8D5BA]/30"
        >
          <HiOutlinePlus strokeWidth={3} size={18} /> Nuevo Producto
        </button>
      </header>

      {/* Tabla de Resultados */}
      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center bg-white rounded-3xl border border-dashed border-gray-200">
          <div className="w-8 h-8 border-4 border-[#A8D5BA] border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-400 text-sm font-medium">Cargando catálogo...</p>
        </div>
      ) : (
        <CatalogoTable 
          productos={productos} 
          onEdit={(p) => { setSelectedProducto(p); setIsModalOpen(true); }} 
          onDelete={handleDelete} 
        />
      )}

      {/* Modal del Formulario */}
      <CatalogoForm 
        isOpen={isModalOpen} 
        producto={selectedProducto}
        onClose={() => setIsModalOpen(false)} 
        onSuccess={handleSuccess} 
      />
    </main>
  );
}