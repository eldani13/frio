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
import { precioCatalogoNumerico } from "@/lib/catalogoPrecio";

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
    if (!sortConfig) return data;
    if (sortConfig.key === "price") {
      data.sort((a, b) => {
        const na = precioCatalogoNumerico(a);
        const nb = precioCatalogoNumerico(b);
        const aHas = na !== undefined;
        const bHas = nb !== undefined;
        if (!aHas && !bHas) return 0;
        if (!aHas) return 1;
        if (!bHas) return -1;
        const va = na as number;
        const vb = nb as number;
        if (va < vb) return sortConfig.direction === "asc" ? -1 : 1;
        if (va > vb) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
      return data;
    }
    data.sort((a, b) => {
      const aValue = a[sortConfig.key] ?? "";
      const bValue = b[sortConfig.key] ?? "";
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
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

  const handleImport = async (data: Record<string, unknown>[]) => {
    if (data.length === 0 || !idCliente) return;
    setLoading(true);
    try {
      await CatalogoService.importMany(data, idCliente, codeCuenta);
      alert("¡Importación exitosa!");
      await load();
    } catch (_error) {
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
        await CatalogoService.create(data as Omit<Catalogo, "id" | "numericId" | "code" | "createdAt" | "codeCuenta">, idCliente, codeCuenta);
      }
      setIsModalOpen(false);
      await load();
    } catch (_error) {
      alert("Hubo un error al procesar la solicitud.");
    }
  };

  const handleSecundarioSuccess = async (data: Partial<Catalogo>) => {
    if (!idCliente) throw new Error("sin_cliente");
    await CatalogoService.create(data as Omit<Catalogo, "id" | "numericId" | "code" | "createdAt" | "codeCuenta">, idCliente, codeCuenta);
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
    <main className="max-w-[1400px] mx-auto p-6 md:p-10 ">
      <header className="mb-8 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[#f8edb1] rounded-2xl text-[#2D5A3F]">
            <HiOutlineSquares2X2 size={28} />
          </div>
          <div>
            <h1 className="app-title">Catálogo</h1>
            <p className="text-sm text-gray-500">{productos.length} productos en total</p>
          </div>
        </div>

        <div className="flex w-full flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end lg:w-auto">
          <div className="relative w-full sm:w-56 sm:min-w-[12rem]">
            <HiOutlineMagnifyingGlass className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <input
              type="text"
              placeholder="Buscar..."
              className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-300 focus:ring-1 focus:ring-slate-200"
              value={filterText}
              onChange={(e) => {
                setFilterText(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ImportExcel onDataLoaded={handleImport} />

            <button
              type="button"
              onClick={() => {
                setSelectedProducto(null);
                setIsModalOpen(true);
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-emerald-200/90 bg-white px-2.5 py-1.5 text-xs font-medium text-emerald-900 transition hover:bg-emerald-50/90"
            >
              <HiOutlinePlus className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
              Nuevo producto
            </button>
            <button
              type="button"
              title="Crear producto secundario"
              onClick={() => setIsSecundarioOpen(true)}
              className="inline-flex items-center gap-1 rounded-lg border border-violet-200 bg-white px-2.5 py-1.5 text-xs font-medium text-violet-800 transition hover:bg-violet-50/90"
            >
              <HiOutlinePlus className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
              Crear secundario
            </button>
          </div>
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