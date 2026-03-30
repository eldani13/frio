"use client";
import { useState, useEffect } from "react";
import { HiOutlineXMark } from "react-icons/hi2";
import { Catalogo } from "@/app/types/catalogo";

interface CatalogoFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: Partial<Catalogo>) => Promise<void>;
  producto?: Catalogo | null;
}

// Configuración con TODOS los campos de la interfaz Catalogo
const FORM_FIELDS = [
  { key: "title", label: "Título", required: true },
  { key: "slug", label: "Identificador URL" },
  { key: "description", label: "Descripción", multiline: true, required: true },
  { key: "provider", label: "Proveedor", required: true },
  { key: "category", label: "Categoría producto", required: true },
  { key: "productType", label: "Tipo", required: true },
  { key: "tags", label: "Etiquetas" },
  { key: "publishedOnline", label: "Publicado en tienda online", isBoolean: true },
  { key: "status", label: "Estado", required: true },
  { key: "sku", label: "SKU" },
  { key: "barcode", label: "Código de barras" },
  { key: "optionName1", label: "Nombre opción 1" },
  { key: "optionValue1", label: "Valor opción 1" },
  { key: "linkedOption1", label: "Vinculado a opción 1" },
  { key: "price", label: "Precio", inputType: "number" },
  { key: "internationalPrice", label: "Precio internacional", inputType: "number" },
  { key: "compareAtPrice", label: "Precio comparación", inputType: "number" },
  { key: "compareAtPriceIntl", label: "Precio comparación internacional", inputType: "number" },
  { key: "costPerItem", label: "Costo por artículo", inputType: "number" },
  { key: "chargeTax", label: "Cobrar impuesto", isBoolean: true },
  { key: "inventoryTracker", label: "Rastreador inventario" },
  { key: "inventoryQty", label: "Cantidad inventario", inputType: "number" },
  { key: "continueSelling", label: "Continuar vendiendo sin stock", isBoolean: true },
  { key: "weightValue", label: "Valor peso (g)", inputType: "number" },
  { key: "weightUnit", label: "Unidad peso visualización" },
  { key: "requiresShipping", label: "Requiere envío", isBoolean: true },
  { key: "logisticService", label: "Servicio logística" },
  { key: "includedPrimary", label: "Incluido primario", isBoolean: true },
  { key: "includedInternational", label: "Incluido internacional", isBoolean: true },
  { key: "productImageUrl", label: "URL imagen producto" },
  { key: "imagePosition", label: "Posición imagen", inputType: "number" },
  { key: "imageAlt", label: "Texto alt imagen" },
  { key: "variantImageUrl", label: "URL imagen variante" },
  { key: "giftCard", label: "Tarjeta regalo", isBoolean: true },
  { key: "seoTitle", label: "Título SEO" },
  { key: "seoDescription", label: "Descripción SEO", multiline: true },
  { key: "googleShoppingCategory", label: "Google Shopping categoría producto" },
  { key: "metacampos", label: "Metacampos", multiline: true },
];

export const CatalogoForm = ({ isOpen, onClose, onSuccess, producto }: CatalogoFormProps) => {
  const [formData, setFormData] = useState<Partial<Catalogo>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (producto) {
      setFormData(producto);
    } else {
      setFormData({
        publishedOnline: false,
        requiresShipping: true,
        chargeTax: false,
        continueSelling: false,
        giftCard: false,
        status: "draft"
      });
    }
  }, [producto, isOpen]);

  if (!isOpen) return null;

  const handleChange = (key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSuccess(formData);
      onClose();
    } catch (error) {
      console.error("Error al guardar:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[24px] shadow-2xl border border-gray-100 flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header Fijo */}
        <div className="flex justify-between items-center p-6 border-b border-gray-50 bg-white z-10">
          <div>
            <h2 className="text-[20px] font-bold text-gray-900">
              {producto ? "Editar Producto" : "Nuevo Producto"}
            </h2>
            <p className="text-[12px] text-gray-500 font-medium uppercase tracking-tight">Formulario Completo de Catálogo</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <HiOutlineXMark size={24} className="text-gray-500" />
          </button>
        </div>

        {/* Form Body con Scroll Vertical */}
        <form id="catalogo-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-5">
            {FORM_FIELDS.map((field) => {
              const value = formData[field.key as keyof Catalogo];

              return (
                <div key={field.key} className={field.multiline ? "md:col-span-2 lg:col-span-3" : ""}>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                    {field.label} {field.required && <span className="text-red-400">*</span>}
                  </label>
                  
                  {field.isBoolean ? (
                      <div className="flex items-center h-[48px] bg-white border border-gray-200 rounded-[12px] px-4 shadow-sm">
                        <input
                          type="checkbox"
                          // Aquí usamos 'checked', que SÍ acepta booleanos
                          checked={Boolean(value)} 
                          onChange={(e) => handleChange(field.key, e.target.checked)}
                          className="w-5 h-5 rounded border-gray-300 text-[#A8D5BA] focus:ring-[#A8D5BA] cursor-pointer"
                        />
                        <span className="ml-3 text-[13px] text-gray-600 font-medium">Habilitar / Sí</span>
                      </div>
                    ) : (
                      <input
                        type={field.inputType || "text"}
                        // FORZAMOS a que el valor sea string o number, eliminando el boolean del medio
                        value={(field.inputType === "number" ? (value ?? "") : String(value ?? "")) as string | number}
                        onChange={(e) => 
                          handleChange(
                            field.key, 
                            field.inputType === 'number' 
                              ? (e.target.value === "" ? "" : Number(e.target.value)) 
                              : e.target.value
                          )
                        }
                        className="w-full px-4 py-3 border border-gray-200 rounded-[12px] focus:outline-none focus:border-[#A8D5BA] focus:ring-1 focus:ring-[#A8D5BA] transition-all text-[14px] bg-white shadow-sm"
                        required={field.required}
                        placeholder={`Ingrese ${field.label.toLowerCase()}`}
                      />
                    )}
                                    
                </div>
              );
            })}
          </div>
        </form>

        {/* Footer Fijo */}
        <div className="p-6 border-t border-gray-100 flex gap-3 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-gray-200 rounded-[16px] text-[14px] font-bold text-gray-500 hover:bg-gray-50 transition-all"
          >
            Cancelar
          </button>
          <button
            form="catalogo-form"
            type="submit"
            disabled={loading}
            className="flex-[2] px-4 py-3 bg-[#A8D5BA] text-[#2D5A3F] rounded-[16px] text-[14px] font-bold hover:bg-[#97c4a9] active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg shadow-[#A8D5BA]/20"
          >
            {loading ? "Guardando Información..." : producto ? "Actualizar Producto" : "Registrar Producto"}
          </button>
        </div>
      </div>
    </div>
  );
};