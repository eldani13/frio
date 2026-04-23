"use client";

import React, { Fragment, useEffect, useMemo, useState } from "react";
import { HiOutlineXMark } from "react-icons/hi2";
import type { Catalogo } from "@/app/types/catalogo";
import {
  esCatalogoSecundario,
  gramosPorUnidadDesdeReglaConversion,
  REGLA_PRIMARIO_BASE_GRAMOS,
} from "@/lib/catalogoProcesamiento";
import { UNIDAD_VIS_CATALOGO_OPCIONES } from "@/lib/unidadVisualizacionCatalogo";
import { precioCatalogoNumerico } from "@/lib/catalogoPrecio";

interface CatalogoFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: Partial<Catalogo>) => Promise<void>;
  producto?: Catalogo | null;
  /** Para el desplegable «Incluido primario» (productos que no son secundarios). */
  productosCatalogo?: Catalogo[];
}

type FormFieldConfig = {
  key: keyof Catalogo;
  label: string;
  required?: boolean;
  multiline?: boolean;
  isBoolean?: boolean;
  inputType?: "number" | "text";
};

function normalizeUnidadVisualizacion(p: Partial<Catalogo>): string {
  const u = String(p.unidadVisualizacion ?? "").trim().toLowerCase();
  if (UNIDAD_VIS_CATALOGO_OPCIONES.some((o) => o.value === u)) return u;
  const w = String(p.weightUnit ?? "").trim().toLowerCase();
  if (w === "cantidad") return "cantidad";
  if (w === "peso") return "peso";
  if (w.includes("kg") || w === "g" || w.includes("peso")) return "peso";
  return "cantidad";
}

function esPrimarioEnLista(p: Catalogo, excludeId?: string): boolean {
  if (!p.id?.trim() || p.id === excludeId) return false;
  return String(p.productType ?? "").trim().toLowerCase() !== "secundario";
}

// Sin weightUnit ni includedPrimary (se manejan aparte).
const FORM_FIELDS: FormFieldConfig[] = [
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
  { key: "chargeTax", label: "Cobrar impuesto", isBoolean: true },
  { key: "inventoryTracker", label: "Rastreador inventario" },
  { key: "inventoryQty", label: "Cantidad inventario", inputType: "number" },
  { key: "continueSelling", label: "Continuar vendiendo sin stock", isBoolean: true },
  { key: "weightValue", label: "Valor peso (g)", inputType: "number" },
  { key: "requiresShipping", label: "Requiere envío", isBoolean: true },
  { key: "logisticService", label: "Servicio logística" },
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

export const CatalogoForm = ({
  isOpen,
  onClose,
  onSuccess,
  producto,
  productosCatalogo = [],
}: CatalogoFormProps) => {
  const [formData, setFormData] = useState<Partial<Catalogo>>({});
  const [loading, setLoading] = useState(false);
  /** Edición regla secundario: gramos netos por unidad (base fija 1000 g de primario). */
  const [gramosPorUnidadSecundario, setGramosPorUnidadSecundario] = useState("");

  useEffect(() => {
    if (producto) {
      const precioEdicion = precioCatalogoNumerico(producto);
      setFormData({
        ...producto,
        ...(precioEdicion !== undefined ? { price: precioEdicion } : {}),
        unidadVisualizacion: normalizeUnidadVisualizacion(producto),
        includedPrimarioCatalogoId: producto.includedPrimarioCatalogoId ?? "",
        conversionCantidadPrimario:
          producto.conversionCantidadPrimario ?? producto.reglaConversionCantidadPrimario,
        conversionUnidadesSecundario:
          producto.conversionUnidadesSecundario ?? producto.reglaConversionUnidadesSecundario,
        mermaPct: producto.mermaPct,
      });
      const tipoSec = esCatalogoSecundario(producto);
      const primId = String(producto.includedPrimarioCatalogoId ?? "").trim();
      if (tipoSec && primId) {
        const a = Number(producto.conversionCantidadPrimario ?? producto.reglaConversionCantidadPrimario);
        const b = Number(producto.conversionUnidadesSecundario ?? producto.reglaConversionUnidadesSecundario);
        const g = gramosPorUnidadDesdeReglaConversion(a, b);
        setGramosPorUnidadSecundario(g !== null && g > 0 ? String(g) : "");
      } else {
        setGramosPorUnidadSecundario("");
      }
    } else {
      setFormData({
        publishedOnline: false,
        requiresShipping: true,
        chargeTax: false,
        continueSelling: false,
        giftCard: false,
        status: "draft",
        unidadVisualizacion: "cantidad",
        includedPrimarioCatalogoId: "",
        mermaPct: undefined,
      });
      setGramosPorUnidadSecundario("");
    }
  }, [producto, isOpen]);

  /** Alta manual: si deja de ser secundario o sin primario, limpiar gramos (no pisar lo que el usuario escribe). */
  useEffect(() => {
    if (!isOpen || producto) return;
    const tipoSec = esCatalogoSecundario(formData as Catalogo);
    const primId = String(formData.includedPrimarioCatalogoId ?? "").trim();
    if (!tipoSec || !primId) {
      setGramosPorUnidadSecundario("");
    }
  }, [isOpen, producto, formData.productType, formData.includedPrimarioCatalogoId]);

  const opcionesPrimario = useMemo(
    () => productosCatalogo.filter((p) => esPrimarioEnLista(p, producto?.id)),
    [productosCatalogo, producto?.id],
  );

  const primarioVinculadoId = String(formData.includedPrimarioCatalogoId ?? "").trim();

  if (!isOpen) return null;

  const handleChange = (key: keyof Catalogo, value: unknown) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const uv = String(formData.unidadVisualizacion ?? "cantidad").trim().toLowerCase();
    if (!uv) return;
    const tipoSec = esCatalogoSecundario(formData as Catalogo);
    const primId = String(formData.includedPrimarioCatalogoId ?? "").trim();
    if (tipoSec && primId) {
      const g = Number(String(gramosPorUnidadSecundario).replace(",", ".").trim());
      if (!Number.isFinite(g) || g <= 0) {
        alert(
          `Para productos secundarios con primario, indicá los gramos por unidad del secundario (peso neto; base ${REGLA_PRIMARIO_BASE_GRAMOS} g de primario).`,
        );
        return;
      }
    }
    setLoading(true);
    try {
      const tipoSecundario = esCatalogoSecundario(formData as Catalogo);
      const gRegla =
        tipoSecundario && primId
          ? Number(String(gramosPorUnidadSecundario).replace(",", ".").trim())
          : NaN;
      const c1n =
        tipoSecundario && primId && Number.isFinite(gRegla) && gRegla > 0 ? 1 : Number(formData.conversionCantidadPrimario);
      const c2n =
        tipoSecundario && primId && Number.isFinite(gRegla) && gRegla > 0
          ? REGLA_PRIMARIO_BASE_GRAMOS / gRegla
          : Number(formData.conversionUnidadesSecundario);
      const merma =
        tipoSecundario && primId && Number.isFinite(Number(formData.mermaPct))
          ? Math.min(100, Math.max(0, Number(formData.mermaPct)))
          : undefined;
      const payload: Partial<Catalogo> = {
        ...formData,
        unidadVisualizacion: uv,
        weightUnit: uv === "peso" ? "peso" : "cantidad",
        includedPrimarioCatalogoId: primId || undefined,
        includedPrimary: Boolean(primId),
        ...(tipoSecundario && primId && Number.isFinite(c1n) && c1n > 0 && Number.isFinite(c2n) && c2n > 0
          ? {
              reglaConversionCantidadPrimario: c1n,
              reglaConversionUnidadesSecundario: c2n,
              conversionCantidadPrimario: c1n,
              conversionUnidadesSecundario: c2n,
            }
          : {}),
        ...(merma !== undefined ? { mermaPct: merma } : {}),
      };
      await onSuccess(payload);
      onClose();
    } catch (error) {
      console.error("Error al guardar:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-[24px] border border-gray-100 bg-white shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="z-10 flex items-center justify-between border-b border-gray-50 bg-white p-6">
          <div>
            <h2 className="text-[20px] font-bold text-gray-900">
              {producto ? "Editar producto" : "Nuevo producto"}
            </h2>
            <p className="text-[12px] font-medium uppercase tracking-tight text-gray-500">
              Formulario completo de catálogo
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 transition-colors hover:bg-gray-100">
            <HiOutlineXMark size={24} className="text-gray-500" />
          </button>
        </div>

        <form id="catalogo-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto bg-gray-50/30 p-6">
          <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2 lg:grid-cols-3">
            {FORM_FIELDS.map((field) => (
              <Fragment key={String(field.key)}>
                <div className={field.multiline ? "md:col-span-2 lg:col-span-3" : ""}>
                  <label className="mb-1.5 ml-1 block text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    {field.label} {field.required ? <span className="text-red-400">*</span> : null}
                  </label>

                  {field.isBoolean ? (
                    <div className="flex h-[48px] items-center rounded-[12px] border border-gray-200 bg-white px-4 shadow-sm">
                      <input
                        type="checkbox"
                        checked={Boolean(formData[field.key])}
                        onChange={(e) => handleChange(field.key, e.target.checked)}
                        className="h-5 w-5 cursor-pointer rounded border-gray-300 text-[#A8D5BA] focus:ring-[#A8D5BA]"
                      />
                      <span className="ml-3 text-[13px] font-medium text-gray-600">Habilitar / Sí</span>
                    </div>
                  ) : field.multiline ? (
                    <textarea
                      value={String(formData[field.key] ?? "")}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      rows={3}
                      className="w-full rounded-[12px] border border-gray-200 bg-white px-4 py-3 text-[14px] shadow-sm transition-all focus:border-[#A8D5BA] focus:outline-none focus:ring-1 focus:ring-[#A8D5BA]"
                      required={field.required}
                    />
                  ) : (
                    <input
                      type={field.inputType === "number" ? "number" : "text"}
                      value={
                        (field.inputType === "number"
                          ? (formData[field.key] ?? "")
                          : String(formData[field.key] ?? "")) as string | number
                      }
                      onChange={(e) =>
                        handleChange(
                          field.key,
                          field.inputType === "number"
                            ? e.target.value === ""
                              ? ""
                              : Number(e.target.value)
                            : e.target.value,
                        )
                      }
                      className="w-full rounded-[12px] border border-gray-200 bg-white px-4 py-3 text-[14px] shadow-sm transition-all focus:border-[#A8D5BA] focus:outline-none focus:ring-1 focus:ring-[#A8D5BA]"
                      required={field.required}
                      placeholder={`Ingresá ${field.label.toLowerCase()}`}
                    />
                  )}
                </div>

                {field.key === "weightValue" ? (
                  <>
                    <div>
                      <label className="mb-1.5 ml-1 block text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        Unidad de visualización <span className="text-red-400">*</span>
                      </label>
                      <select
                        value={formData.unidadVisualizacion ?? "cantidad"}
                        onChange={(e) => handleChange("unidadVisualizacion", e.target.value)}
                        required
                        className="w-full rounded-[12px] border border-gray-200 bg-white px-4 py-3 text-[14px] shadow-sm focus:border-[#A8D5BA] focus:outline-none focus:ring-1 focus:ring-[#A8D5BA]"
                      >
                        {UNIDAD_VIS_CATALOGO_OPCIONES.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-[11px] text-gray-500">
                        Etiqueta de cantidad en pantallas. Solo «Peso (kg)» usa kilogramos en almacenamiento; el resto
                        cuenta como unidades discretas.
                      </p>
                    </div>
                    <div>
                      <label className="mb-1.5 ml-1 block text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        Incluido primario
                      </label>
                      <select
                        value={String(formData.includedPrimarioCatalogoId ?? "")}
                        onChange={(e) => handleChange("includedPrimarioCatalogoId", e.target.value)}
                        className="w-full rounded-[12px] border border-gray-200 bg-white px-4 py-3 text-[14px] shadow-sm focus:border-[#A8D5BA] focus:outline-none focus:ring-1 focus:ring-[#A8D5BA]"
                      >
                        <option value="">— Sin vínculo —</option>
                        {opcionesPrimario.map((p) => (
                          <option key={p.id} value={p.id}>
                            {(p.title || "Sin título").trim()} · {p.code}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-[11px] text-gray-500">
                        Opcional: elegí otro producto del catálogo (excluye secundarios). Para altas rápidas de
                        derivados usá <strong>Crear secundario</strong>.
                      </p>
                    </div>
                    {esCatalogoSecundario(formData as Catalogo) && primarioVinculadoId ? (
                      <div className="grid grid-cols-1 gap-4 md:col-span-2 md:grid-cols-2 lg:col-span-3 lg:grid-cols-2">
                        <div className="rounded-[12px] border border-violet-100 bg-violet-50/40 p-4 md:col-span-2 lg:col-span-2">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-violet-900">
                            Regla de conversión (base {REGLA_PRIMARIO_BASE_GRAMOS} g de primario)
                          </p>
                          <p className="mt-1 text-[11px] text-violet-950/90">
                            El insumo de referencia es siempre <strong>{REGLA_PRIMARIO_BASE_GRAMOS} g</strong> (1 kg).
                            Indicá los <strong>gramos netos por unidad</strong> de este secundario. Unidades por kg de
                            primario: <strong>{REGLA_PRIMARIO_BASE_GRAMOS} ÷ gramos por unidad</strong>.
                          </p>
                          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div>
                              <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-gray-500">
                                Insumo primario (fijo)
                              </label>
                              <div className="rounded-[12px] border border-violet-200 bg-violet-100/60 px-4 py-3 text-[14px] font-semibold tabular-nums text-violet-950">
                                {REGLA_PRIMARIO_BASE_GRAMOS} g
                              </div>
                            </div>
                            <div>
                              <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-gray-500">
                                Gramos por unidad de este secundario <span className="text-red-400">*</span>
                              </label>
                              <input
                                type="text"
                                inputMode="decimal"
                                value={gramosPorUnidadSecundario}
                                onChange={(e) => setGramosPorUnidadSecundario(e.target.value)}
                                className="w-full rounded-[12px] border border-gray-200 bg-white px-4 py-3 text-[14px] shadow-sm"
                                placeholder="Ej. 200"
                              />
                            </div>
                          </div>
                          <div className="mt-3">
                            <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-gray-500">
                              Merma típica (%)
                            </label>
                            <input
                              type="number"
                              min={0}
                              max={100}
                              step="any"
                              value={formData.mermaPct ?? ""}
                              onChange={(e) =>
                                handleChange(
                                  "mermaPct",
                                  e.target.value === "" ? "" : Number(e.target.value),
                                )
                              }
                              className="w-full max-w-[12rem] rounded-[12px] border border-gray-200 bg-white px-4 py-3 text-[14px] shadow-sm"
                              placeholder="0"
                            />
                            <p className="mt-1 text-[11px] text-violet-950/80">
                              Se aplica al crear solicitudes de procesamiento con este secundario (0–100). Opcional.
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : null}
              </Fragment>
            ))}
          </div>
        </form>

        <div className="flex gap-3 border-t border-gray-100 bg-white p-6">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-[16px] border border-gray-200 px-4 py-3 text-[14px] font-bold text-gray-500 transition-all hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            form="catalogo-form"
            type="submit"
            disabled={loading}
            className="flex-[2] rounded-[16px] bg-[#A8D5BA] px-4 py-3 text-[14px] font-bold text-[#2D5A3F] shadow-lg shadow-[#A8D5BA]/20 transition-all hover:bg-[#97c4a9] active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? "Guardando información…" : producto ? "Actualizar producto" : "Registrar producto"}
          </button>
        </div>
      </div>
    </div>
  );
};
