"use client";
import { HiOutlinePencilSquare, HiOutlineTrash, HiArrowsUpDown } from "react-icons/hi2";
import { Catalogo } from "@/app/types/catalogo";

interface Props {
  productos: Catalogo[];
  onEdit: (producto: Catalogo) => void;
  onDelete: (id: string) => void;
  onSort: (key: keyof Catalogo) => void; // Nueva prop para ordenamiento
}

export const CatalogoTable = ({ productos, onEdit, onDelete, onSort }: Props) => {
  
  // Helper para renderizar headers con ordenamiento
  const SortableHeader = ({ label, sortKey }: { label: string, sortKey?: keyof Catalogo }) => (
    <th 
      className={`p-4 sticky top-0 bg-gray-50 z-20 border-b border-gray-100 ${sortKey ? 'cursor-pointer hover:bg-gray-100 transition-colors' : ''}`}
      onClick={() => sortKey && onSort(sortKey)}
    >
      <div className="flex items-center gap-2">
        {label}
        {sortKey && <HiArrowsUpDown className="text-gray-400" size={12} />}
      </div>
    </th>
  );

  return (
    /* Contenedor principal con altura máxima para el sticky header */
    <div className="bg-white rounded-[16px] border border-gray-100 shadow-sm overflow-hidden">
      <div className="overflow-x-auto overflow-y-auto max-h-[70vh] custom-scrollbar">
        <table className="w-full text-left border-separate border-spacing-0 table-auto min-w-[4500px]">
          <thead className="bg-gray-50">
            <tr className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              <SortableHeader label="ID Num" sortKey="numericId" />
              <SortableHeader label="Código" sortKey="code" />
              <SortableHeader label="Título" sortKey="title" />
              <SortableHeader label="Slug" />
              <SortableHeader label="Descripción" />
              <SortableHeader label="Proveedor" sortKey="provider" />
              <SortableHeader label="Categoría" sortKey="category" />
              <SortableHeader label="Tipo" />
              <SortableHeader label="Etiquetas" />
              <SortableHeader label="Publicado" />
              <SortableHeader label="Estado" sortKey="status" />
              <SortableHeader label="SKU" sortKey="sku" />
              <SortableHeader label="Cód. Barras" />
              <SortableHeader label="Nombre Op 1" />
              <SortableHeader label="Valor Op 1" />
              <SortableHeader label="Vinculado" />
              <SortableHeader label="Precio" sortKey="price" />
              {/* ... Agrega los demás headers siguiendo el mismo patrón ... */}
              <SortableHeader label="Stock" sortKey="inventoryQty" />
              
              {/* HEADER DE ACCIONES: Sticky a la derecha Y arriba */}
              <th className="p-4 sticky top-0 right-0 bg-gray-50 z-30 border-b border-gray-100 shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.05)] text-right">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 text-[13px]">
            {productos.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50/80 transition-colors whitespace-nowrap group">
                <td className="p-4 text-gray-400 bg-white group-hover:bg-gray-50 transition-colors">{p.numericId}</td>
                <td className="p-4 font-mono font-bold text-[#2D5A3F] bg-white group-hover:bg-gray-50 transition-colors">{p.code}</td>
                <td className="p-4 font-medium text-gray-900 bg-white group-hover:bg-gray-50 transition-colors">{p.title}</td>
                <td className="p-4 text-gray-400 italic bg-white group-hover:bg-gray-50 transition-colors">{p.slug}</td>
                <td className="p-4 max-w-xs truncate bg-white group-hover:bg-gray-50 transition-colors">{p.description}</td>
                <td className="p-4 bg-white group-hover:bg-gray-50 transition-colors">{p.provider}</td>
                <td className="p-4 bg-white group-hover:bg-gray-50 transition-colors">{p.category}</td>
                <td className="p-4 bg-white group-hover:bg-gray-50 transition-colors">{p.productType}</td>
                <td className="p-4 bg-white group-hover:bg-gray-50 transition-colors">{p.tags}</td>
                <td className="p-4 bg-white group-hover:bg-gray-50 transition-colors">{p.publishedOnline ? "SÍ" : "NO"}</td>
                <td className="p-4 bg-white group-hover:bg-gray-50 transition-colors">
                  <span className="px-2 py-1 rounded-md bg-gray-100 font-semibold text-[11px]">{p.status}</span>
                </td>
                <td className="p-4 bg-white group-hover:bg-gray-50 transition-colors">{p.sku}</td>
                <td className="p-4 bg-white group-hover:bg-gray-50 transition-colors">{p.barcode}</td>
                <td className="p-4 bg-white group-hover:bg-gray-50 transition-colors">{p.optionName1}</td>
                <td className="p-4 bg-white group-hover:bg-gray-50 transition-colors">{p.optionValue1}</td>
                <td className="p-4 bg-white group-hover:bg-gray-50 transition-colors">{p.linkedOption1}</td>
                <td className="p-4 font-bold text-gray-800 bg-white group-hover:bg-gray-50 transition-colors">${p.price}</td>
                <td className="p-4 text-blue-600 bg-white group-hover:bg-gray-50 transition-colors">${p.internationalPrice}</td>
                <td className="p-4 text-gray-400 line-through bg-white group-hover:bg-gray-50 transition-colors">${p.compareAtPrice}</td>
                <td className="p-4 text-gray-400 line-through bg-white group-hover:bg-gray-50 transition-colors">${p.compareAtPriceIntl}</td>
                <td className="p-4 text-red-500 bg-white group-hover:bg-gray-50 transition-colors">${p.costPerItem}</td>
                <td className="p-4 bg-white group-hover:bg-gray-50 transition-colors">{p.chargeTax ? "SÍ" : "NO"}</td>
                <td className="p-4 bg-white group-hover:bg-gray-50 transition-colors">{p.inventoryTracker}</td>
                <td className="p-4 font-bold bg-white group-hover:bg-gray-50 transition-colors">{p.inventoryQty}</td>
                <td className="p-4 bg-white group-hover:bg-gray-50 transition-colors">{p.continueSelling ? "SÍ" : "NO"}</td>
                <td className="p-4 bg-white group-hover:bg-gray-50 transition-colors">{p.weightValue}</td>
                <td className="p-4 bg-white group-hover:bg-gray-50 transition-colors">{p.weightUnit}</td>
                <td className="p-4 bg-white group-hover:bg-gray-50 transition-colors">{p.requiresShipping ? "SÍ" : "NO"}</td>
                <td className="p-4 bg-white group-hover:bg-gray-50 transition-colors">{p.logisticService}</td>
                <td className="p-4 bg-white group-hover:bg-gray-50 transition-colors">{p.includedPrimary ? "SÍ" : "NO"}</td>
                <td className="p-4 bg-white group-hover:bg-gray-50 transition-colors">{p.includedInternational ? "SÍ" : "NO"}</td>
                <td className="p-4 text-blue-500 truncate max-w-[150px] bg-white group-hover:bg-gray-50 transition-colors">{p.productImageUrl}</td>
                <td className="p-4 bg-white group-hover:bg-gray-50 transition-colors">{p.imagePosition}</td>
                <td className="p-4 bg-white group-hover:bg-gray-50 transition-colors">{p.imageAlt}</td>
                <td className="p-4 truncate max-w-[150px] bg-white group-hover:bg-gray-50 transition-colors">{p.variantImageUrl}</td>
                <td className="p-4 bg-white group-hover:bg-gray-50 transition-colors">{p.giftCard ? "SÍ" : "NO"}</td>
                <td className="p-4 font-medium bg-white group-hover:bg-gray-50 transition-colors">{p.seoTitle}</td>
                <td className="p-4 max-w-xs truncate bg-white group-hover:bg-gray-50 transition-colors">{p.seoDescription}</td>
                <td className="p-4 bg-white group-hover:bg-gray-50 transition-colors">{p.googleShoppingCategory}</td>
                <td className="p-4 max-w-xs truncate bg-white group-hover:bg-gray-50 transition-colors">{p.metacampos}</td>
                <td className="p-4 text-gray-400 bg-white group-hover:bg-gray-50 transition-colors">
                  {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "-"}
                </td>

                {/* CUERPO DE ACCIONES: Sticky a la derecha */}
                <td className="p-4 sticky right-0 bg-white group-hover:bg-gray-50 z-10 shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.05)] transition-colors text-right border-l border-gray-50">
                  <div className="flex justify-end gap-2">
                    <button 
                      onClick={() => onEdit(p)} 
                      className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <HiOutlinePencilSquare size={18} />
                    </button>
                    <button 
                      onClick={() => p.id && onDelete(p.id)} 
                      className="p-2 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <HiOutlineTrash size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};