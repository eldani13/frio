"use client";
import { useEffect, useState, useMemo } from "react";
import { CatalogoService } from "@/app/services/catalogoService";
import { Catalogo } from "@/app/types/catalogo";
import { CatalogoTable } from "@/app/components/ui/catalogos/CatalogoTable";
import { CatalogoForm } from "@/app/components/ui/catalogos/CatalogoForm";
import { CatalogoSecundarioForm } from "@/app/components/ui/catalogos/CatalogoSecundarioForm";
import { HiOutlinePlus, HiOutlineSquares2X2, HiOutlineMagnifyingGlass } from "react-icons/hi2";
import { useAuth } from "@/app/context/AuthContext";
import { ImportExcel } from "@/app/utils/importarExcelCatalogo";

export default function CatalogoPage() {
  const [productos, setProductos] = useState<Catalogo[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSecundarioOpen, setIsSecundarioOpen] = useState(false);
  const [selectedProducto, setSelectedProducto] = useState<Catalogo | null>(null);
  const [loading, setLoading] = useState(true);

  // --- ESTADOS PARA FILTRO, ORDEN Y PAGINACIÓN ---
  const [filterText, setFilterText] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: keyof Catalogo; direction: 'asc' | 'desc' } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

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

  useEffect(() => {
    void load();
  }, [idCliente, codeCuenta]);

  // --- LÓGICA DE PROCESAMIENTO (Memoizada para rendimiento) ---
  
  // 1. Filtrado simple por Título o SKU
  const filteredData = useMemo(() => {
    return productos.filter(p => 
      p.title?.toLowerCase().includes(filterText.toLowerCase()) ||
      p.sku?.toLowerCase().includes(filterText.toLowerCase())
    );
  }, [productos, filterText]);

  // 2. Ordenamiento
  const sortedData = useMemo(() => {
    const data = [...filteredData];
    if (sortConfig) {
      data.sort((a, b) => {
        const aValue = a[sortConfig.key] ?? "";
        const bValue = b[sortConfig.key] ?? "";
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return data;
  }, [filteredData, sortConfig]);

  // 3. Paginación
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedData.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedData, currentPage]);

  const totalPages = Math.ceil(sortedData.length / itemsPerPage);

  // --- HANDLERS ---
  const handleSort = (key: keyof Catalogo) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig?.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleImport = async (data: any[]) => {
    if (data.length === 0 || !idCliente) return;
    setLoading(true);
    try {
      await CatalogoService.importMany(data, idCliente, codeCuenta);
      alert("¡Importación exitosa!");
      await load();
    } catch (error) {
      alert("Error al importar los datos.");
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = async (data: Partial<Catalogo>) => {
    try {
      if (!idCliente) return;
      if (selectedProducto?.id) {
        await CatalogoService.update(idCliente, selectedProducto.id, data);
      } else {
        await CatalogoService.create(data as any, idCliente, codeCuenta);
      }
      setIsModalOpen(false);
      await load();
    } catch (error) {
      alert("Hubo un error al procesar la solicitud.");
    }
  };

  const handleSecundarioSuccess = async (data: Partial<Catalogo>) => {
    if (!idCliente) throw new Error("sin_cliente");
    await CatalogoService.create(data as any, idCliente, codeCuenta);
    await load();
  };

  const handleDelete = async (id: string) => {
    if (!idCliente) return;
    if (window.confirm("¿Estás seguro de eliminar este producto?")) {
      await CatalogoService.delete(idCliente, id);
      await load();
    }
  };

  return (
    <main className="max-w-[1400px] mx-auto p-6 md:p-10 font-['Inter']">
      <header className="mb-8 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[#f8edb1] rounded-2xl text-[#2D5A3F]">
            <HiOutlineSquares2X2 size={28} />
          </div>
          <div>
            <h1 className="text-[28px] font-extrabold text-gray-900 tracking-tight">Catálogo</h1>
            <p className="text-sm text-gray-500">{productos.length} productos en total</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
          {/* Input de Búsqueda */}
          <div className="relative w-full sm:w-64">
            <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text"
              placeholder="Buscar..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#A8D5BA] outline-none transition-all"
              value={filterText}
              onChange={(e) => { setFilterText(e.target.value); setCurrentPage(1); }}
            />
          </div>

          <ImportExcel onDataLoaded={handleImport} />

          <button
            type="button"
            onClick={() => {
              setSelectedProducto(null);
              setIsModalOpen(true);
            }}
            className="flex w-full items-center justify-center gap-2 rounded-[14px] bg-[#A8D5BA] px-6 py-3 text-[14px] font-bold text-[#2D5A3F] shadow-sm transition-all hover:bg-[#97c4a9] active:scale-95 sm:w-auto"
          >
            <HiOutlinePlus strokeWidth={3} size={18} /> Nuevo producto
          </button>
          <button
            type="button"
            onClick={() => setIsSecundarioOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-[14px] border border-violet-200 bg-violet-50 px-6 py-3 text-[14px] font-bold text-violet-900 shadow-sm transition-all hover:bg-violet-100 active:scale-95 sm:w-auto"
          >
            <HiOutlinePlus strokeWidth={3} size={18} /> Crear producto secundario
          </button>
        </div>
      </header>

      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center bg-white rounded-3xl border border-dashed border-gray-200">
          <div className="w-8 h-8 border-4 border-[#A8D5BA] border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-400 text-sm font-medium">Cargando catálogo...</p>
        </div>
      ) : (
        <div className="space-y-4">
          <CatalogoTable
            productos={paginatedData}
            productosCatalogo={productos}
            onEdit={(p) => {
              setSelectedProducto(p);
              setIsModalOpen(true);
            }}
            onDelete={handleDelete}
            onSort={handleSort}
          />

          {/* Controles de Paginación */}
          <div className="flex items-center justify-between bg-white px-6 py-4 rounded-2xl border border-gray-100 shadow-sm">
            <p className="text-sm text-gray-500">
              Mostrando {paginatedData.length} de {filteredData.length} resultados
            </p>
            <div className="flex gap-2">
              <button 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
                className="px-4 py-2 text-sm font-medium border rounded-xl disabled:opacity-30 hover:bg-gray-50 transition-colors"
              >
                Anterior
              </button>
              <button 
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(prev => prev + 1)}
                className="px-4 py-2 text-sm font-medium border rounded-xl disabled:opacity-30 hover:bg-gray-50 transition-colors"
              >
                Siguiente
              </button>
            </div>
          </div>
        </div>
      )}

      <CatalogoForm
        isOpen={isModalOpen}
        producto={selectedProducto}
        productosCatalogo={productos}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleSuccess}
      />

      <CatalogoSecundarioForm
        isOpen={isSecundarioOpen}
        productosCatalogo={productos}
        onClose={() => setIsSecundarioOpen(false)}
        onSubmit={handleSecundarioSuccess}
      />
    </main>
  );
}