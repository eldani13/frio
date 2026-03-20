"use client";
import { HiOutlinePencilSquare, HiOutlineTrash } from "react-icons/hi2";
import { Catalogo } from "@/app/types/catalogo";

interface Props {
  productos: Catalogo[];
  onEdit: (producto: Catalogo) => void;
  onDelete: (id: string) => void;
}

export const CatalogoTable = ({ productos, onEdit, onDelete }: Props) => {
  return (
    <div className="bg-white rounded-[16px] border border-gray-100 shadow-sm overflow-hidden">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse table-auto min-w-[4500px]">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              <th className="p-4">ID Num</th>
              <th className="p-4">Código</th>
              <th className="p-4">Título</th>
              <th className="p-4">Slug</th>
              <th className="p-4">Descripción</th>
              <th className="p-4">Proveedor</th>
              <th className="p-4">Categoría</th>
              <th className="p-4">Tipo</th>
              <th className="p-4">Etiquetas</th>
              <th className="p-4">Publicado Online</th>
              <th className="p-4">Estado</th>
              <th className="p-4">SKU</th>
              <th className="p-4">Código de Barras</th>
              <th className="p-4">Nombre Opción 1</th>
              <th className="p-4">Valor Opción 1</th>
              <th className="p-4">Vinculado Opción 1</th>
              <th className="p-4">Precio</th>
              <th className="p-4">Precio Intl</th>
              <th className="p-4">Precio Comparación</th>
              <th className="p-4">Precio Comp. Intl</th>
              <th className="p-4">Costo por Artículo</th>
              <th className="p-4">Cobrar Impuesto</th>
              <th className="p-4">Rastreador Inv.</th>
              <th className="p-4">Stock</th>
              <th className="p-4">Continuar sin Stock</th>
              <th className="p-4">Peso</th>
              <th className="p-4">Unidad Peso</th>
              <th className="p-4">Requiere Envío</th>
              <th className="p-4">Servicio Logística</th>
              <th className="p-4">Incluido Primario</th>
              <th className="p-4">Incluido Intl</th>
              <th className="p-4">URL Imagen</th>
              <th className="p-4">Posición Imagen</th>
              <th className="p-4">Texto Alt Imagen</th>
              <th className="p-4">URL Imagen Variante</th>
              <th className="p-4">Tarjeta Regalo</th>
              <th className="p-4">Título SEO</th>
              <th className="p-4">Descripción SEO</th>
              <th className="p-4">Categoría Google</th>
              <th className="p-4">Metacampos</th>
              <th className="p-4">Fecha Creación</th>
              {/* Acciones al final y fijas a la derecha */}
              <th className="p-4 sticky right-0 bg-gray-50 z-10 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)] text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 text-[13px]">
            {productos.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50 transition-colors whitespace-nowrap">
                <td className="p-4 text-gray-400">{p.numericId}</td>
                <td className="p-4 font-mono font-bold text-[#2D5A3F]">{p.code}</td>
                <td className="p-4 font-medium text-gray-900">{p.title}</td>
                <td className="p-4 text-gray-400 italic">{p.slug}</td>
                <td className="p-4 max-w-xs truncate">{p.description}</td>
                <td className="p-4">{p.provider}</td>
                <td className="p-4">{p.category}</td>
                <td className="p-4">{p.productType}</td>
                <td className="p-4">{p.tags}</td>
                <td className="p-4">{p.publishedOnline ? "SÍ" : "NO"}</td>
                <td className="p-4">
                  <span className="px-2 py-1 rounded-md bg-gray-100 font-semibold text-[11px]">{p.status}</span>
                </td>
                <td className="p-4">{p.sku}</td>
                <td className="p-4">{p.barcode}</td>
                <td className="p-4">{p.optionName1}</td>
                <td className="p-4">{p.optionValue1}</td>
                <td className="p-4">{p.linkedOption1}</td>
                <td className="p-4 font-bold text-gray-800">${p.price}</td>
                <td className="p-4 text-blue-600">${p.internationalPrice}</td>
                <td className="p-4 text-gray-400 line-through">${p.compareAtPrice}</td>
                <td className="p-4 text-gray-400 line-through">${p.compareAtPriceIntl}</td>
                <td className="p-4 text-red-500">${p.costPerItem}</td>
                <td className="p-4">{p.chargeTax ? "SÍ" : "NO"}</td>
                <td className="p-4">{p.inventoryTracker}</td>
                <td className="p-4 font-bold">{p.inventoryQty}</td>
                <td className="p-4">{p.continueSelling ? "SÍ" : "NO"}</td>
                <td className="p-4">{p.weightValue}</td>
                <td className="p-4">{p.weightUnit}</td>
                <td className="p-4">{p.requiresShipping ? "SÍ" : "NO"}</td>
                <td className="p-4">{p.logisticService}</td>
                <td className="p-4">{p.includedPrimary ? "SÍ" : "NO"}</td>
                <td className="p-4">{p.includedInternational ? "SÍ" : "NO"}</td>
                <td className="p-4 text-blue-500 truncate max-w-[150px]">{p.productImageUrl}</td>
                <td className="p-4">{p.imagePosition}</td>
                <td className="p-4">{p.imageAlt}</td>
                <td className="p-4 truncate max-w-[150px]">{p.variantImageUrl}</td>
                <td className="p-4">{p.giftCard ? "SÍ" : "NO"}</td>
                <td className="p-4 font-medium">{p.seoTitle}</td>
                <td className="p-4 max-w-xs truncate">{p.seoDescription}</td>
                <td className="p-4">{p.googleShoppingCategory}</td>
                <td className="p-4 max-w-xs truncate">{p.metacampos}</td>
                <td className="p-4 text-gray-400">
                  {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "-"}
                </td>

                {/* Acciones al final fijas */}
                <td className="p-4 sticky right-0 bg-white group-hover:bg-gray-50 z-10 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)] text-right">
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