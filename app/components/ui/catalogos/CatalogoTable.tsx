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
  const SortableHeader = ({ label, sortKey }: { label: string; sortKey?: keyof Catalogo }) => (
    <th
      className={`sticky top-0 z-20 border-b border-slate-200 bg-slate-50 p-4 ${sortKey ? "cursor-pointer transition-colors hover:bg-slate-100" : ""}`}
      onClick={() => sortKey && onSort(sortKey)}
    >
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">
        {label}
        {sortKey && <HiArrowsUpDown className="text-slate-400" size={12} />}
      </div>
    </th>
  );

  return (
    /* Contenedor principal con altura máxima para el sticky header */
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="custom-scrollbar max-h-[70vh] overflow-x-auto overflow-y-auto">
        <table className="table-auto min-w-[4500px] border-separate border-spacing-0 text-left">
          <thead className="bg-slate-50">
            <tr>
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
              <th className="sticky top-0 right-0 z-30 border-b border-slate-200 bg-slate-50 p-4 text-right text-[10px] font-bold uppercase tracking-wide text-slate-500 shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.05)]">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="text-[13px]">
            {productos.map((p) => (
              <tr
                key={p.id}
                className="group whitespace-nowrap border-b border-slate-100 transition-colors hover:bg-violet-50/80"
              >
                <td className="p-4 text-gray-400 bg-white group-hover:bg-violet-50/80 transition-colors">{p.numericId}</td>
                <td className="bg-white p-4 font-mono font-semibold text-slate-900 transition-colors group-hover:bg-violet-50/80">
                  {p.code}
                </td>
                <td className="p-4 font-medium text-gray-900 bg-white group-hover:bg-violet-50/80 transition-colors">{p.title}</td>
                <td className="p-4 text-gray-400 italic bg-white group-hover:bg-violet-50/80 transition-colors">{p.slug}</td>
                <td className="p-4 max-w-xs truncate bg-white group-hover:bg-violet-50/80 transition-colors">{p.description}</td>
                <td className="p-4 bg-white group-hover:bg-violet-50/80 transition-colors">{p.provider}</td>
                <td className="p-4 bg-white group-hover:bg-violet-50/80 transition-colors">{p.category}</td>
                <td className="p-4 bg-white group-hover:bg-violet-50/80 transition-colors">{p.productType}</td>
                <td className="p-4 bg-white group-hover:bg-violet-50/80 transition-colors">{p.tags}</td>
                <td className="p-4 bg-white group-hover:bg-violet-50/80 transition-colors">{p.publishedOnline ? "SÍ" : "NO"}</td>
                <td className="p-4 bg-white group-hover:bg-violet-50/80 transition-colors">
                  <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-800">{p.status}</span>
                </td>
                <td className="p-4 bg-white group-hover:bg-violet-50/80 transition-colors">{p.sku}</td>
                <td className="p-4 bg-white group-hover:bg-violet-50/80 transition-colors">{p.barcode}</td>
                <td className="p-4 bg-white group-hover:bg-violet-50/80 transition-colors">{p.optionName1}</td>
                <td className="p-4 bg-white group-hover:bg-violet-50/80 transition-colors">{p.optionValue1}</td>
                <td className="p-4 bg-white group-hover:bg-violet-50/80 transition-colors">{p.linkedOption1}</td>
                <td className="p-4 font-bold text-gray-800 bg-white group-hover:bg-violet-50/80 transition-colors">${p.price}</td>
                <td className="p-4 text-blue-600 bg-white group-hover:bg-violet-50/80 transition-colors">${p.internationalPrice}</td>
                <td className="p-4 text-gray-400 line-through bg-white group-hover:bg-violet-50/80 transition-colors">${p.compareAtPrice}</td>
                <td className="p-4 text-gray-400 line-through bg-white group-hover:bg-violet-50/80 transition-colors">${p.compareAtPriceIntl}</td>
                <td className="p-4 text-red-500 bg-white group-hover:bg-violet-50/80 transition-colors">${p.costPerItem}</td>
                <td className="p-4 bg-white group-hover:bg-violet-50/80 transition-colors">{p.chargeTax ? "SÍ" : "NO"}</td>
                <td className="p-4 bg-white group-hover:bg-violet-50/80 transition-colors">{p.inventoryTracker}</td>
                <td className="p-4 font-bold bg-white group-hover:bg-violet-50/80 transition-colors">{p.inventoryQty}</td>
                <td className="p-4 bg-white group-hover:bg-violet-50/80 transition-colors">{p.continueSelling ? "SÍ" : "NO"}</td>
                <td className="p-4 bg-white group-hover:bg-violet-50/80 transition-colors">{p.weightValue}</td>
                <td className="p-4 bg-white group-hover:bg-violet-50/80 transition-colors">{p.weightUnit}</td>
                <td className="p-4 bg-white group-hover:bg-violet-50/80 transition-colors">{p.requiresShipping ? "SÍ" : "NO"}</td>
                <td className="p-4 bg-white group-hover:bg-violet-50/80 transition-colors">{p.logisticService}</td>
                <td className="p-4 bg-white group-hover:bg-violet-50/80 transition-colors">{p.includedPrimary ? "SÍ" : "NO"}</td>
                <td className="p-4 bg-white group-hover:bg-violet-50/80 transition-colors">{p.includedInternational ? "SÍ" : "NO"}</td>
                <td className="p-4 text-blue-500 truncate max-w-[150px] bg-white group-hover:bg-violet-50/80 transition-colors">{p.productImageUrl}</td>
                <td className="p-4 bg-white group-hover:bg-violet-50/80 transition-colors">{p.imagePosition}</td>
                <td className="p-4 bg-white group-hover:bg-violet-50/80 transition-colors">{p.imageAlt}</td>
                <td className="p-4 truncate max-w-[150px] bg-white group-hover:bg-violet-50/80 transition-colors">{p.variantImageUrl}</td>
                <td className="p-4 bg-white group-hover:bg-violet-50/80 transition-colors">{p.giftCard ? "SÍ" : "NO"}</td>
                <td className="p-4 font-medium bg-white group-hover:bg-violet-50/80 transition-colors">{p.seoTitle}</td>
                <td className="p-4 max-w-xs truncate bg-white group-hover:bg-violet-50/80 transition-colors">{p.seoDescription}</td>
                <td className="p-4 bg-white group-hover:bg-violet-50/80 transition-colors">{p.googleShoppingCategory}</td>
                <td className="p-4 max-w-xs truncate bg-white group-hover:bg-violet-50/80 transition-colors">{p.metacampos}</td>
                <td className="p-4 text-gray-400 bg-white group-hover:bg-violet-50/80 transition-colors">
                  {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "-"}
                </td>

                {/* CUERPO DE ACCIONES: Sticky a la derecha */}
                <td className="sticky right-0 z-10 border-l border-slate-100 bg-white p-4 text-right shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.05)] transition-colors group-hover:bg-violet-50/80">
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