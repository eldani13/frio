"use client";
import { useEffect, useState } from "react";
import { CatalogoService } from "@/app/services/catalogoService";
import { Catalogo } from "@/app/types/catalogo";
import { CatalogoTable } from "@/app/components/ui/catalogos/CatalogoTable";
import { CatalogoForm } from "@/app/components/ui/catalogos/CatalogoForm";
import { HiOutlinePlus, HiOutlineSquares2X2 } from "react-icons/hi2";
import { useAuth } from "@/app/context/AuthContext";
import { ImportExcel } from "@/app/utils/importarExcelCatalogo";



export default function CatalogoPage() {
  const [productos, setProductos] = useState<Catalogo[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProducto, setSelectedProducto] = useState<Catalogo | null>(null);
  const [loading, setLoading] = useState(true);

  const { session } = useAuth();
  const codeCuenta = session?.codeCuenta ?? "";
  const idCliente = session?.clientId ?? "";

  const load = async () => {
    setLoading(true);
    if (!idCliente) {
      setProductos([]);
      setLoading(false);
      return;
    }
    const data = await CatalogoService.getAll(idCliente, codeCuenta);
    setProductos(data);
    setLoading(false);
  };

  const handleImport = async (data: any[]) => {
    if (data.length === 0 || !idCliente) return;

    setLoading(true);
    try {
      await CatalogoService.importMany(data, idCliente, codeCuenta);
      alert("Importación exitosa!");
      await load(); // Recargar la tabla
    } catch (error) {
      alert("Error al importar los datos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [idCliente, codeCuenta]);

  const handleSuccess = async (data: Partial<Catalogo>) => {
    try {
      if (!idCliente) return;
      if (selectedProducto?.id) {
        await CatalogoService.update(idCliente, selectedProducto.id, data);
      } else {
        await CatalogoService.create(data as any, idCliente, codeCuenta);
      }
      await load();
    } catch (error) {
      alert("Hubo un error al procesar la solicitud.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!idCliente) return;
    if (window.confirm("¿Estás seguro de eliminar este producto? Esta acciónn no se puede deshacer.")) {
      await CatalogoService.delete(idCliente, id);
      await load();
    }
  };

  return (
    <main className="max-w-6xl mx-auto p-6 md:p-10 font-['Inter']">
      {/* Header de la pagina */}
      <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[#f8edb1] rounded-2xl text-[#2D5A3F]">
            <HiOutlineSquares2X2 size={28} />
          </div>
          <div>
            <h1 className="text-[28px] font-extrabold text-gray-900 tracking-tight">Catálogo</h1>
           
          </div>
        </div>

        <div className="flex gap-3">
          {/* Botón de Importación */}
          <ImportExcel onDataLoaded={handleImport} />

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