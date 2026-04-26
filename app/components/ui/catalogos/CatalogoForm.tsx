"use client";

import React, { Fragment, useEffect, useMemo, useState } from "react";
import type { Catalogo } from "@/app/types/catalogo";
import {
  FORMULARIO_CREACION_BODY,
  FORMULARIO_CREACION_BOOLEAN_ROW,
  FORMULARIO_CREACION_GRID,
  FORMULARIO_CREACION_INPUT,
  FORMULARIO_CREACION_LABEL,
  FORMULARIO_CREACION_SELECT,
  FormularioPlantilla,
  FormularioPlantillaAcciones,
} from "@/app/components/ui/FormularioPlantilla";
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
    <FormularioPlantilla
      isOpen={isOpen}
      onClose={onClose}
      titulo={producto ? "Editar producto" : "Nuevo producto"}
      subtitulo="Alta catálogo"
      titleId="catalogo-form-title"
      maxWidthClass="max-w-4xl"
      footer={
        <FormularioPlantillaAcciones
          formId="catalogo-form"
          onCancel={onClose}
          submitLabel={producto ? "Actualizar producto" : "Registrar producto"}
          loading={loading}
          loadingLabel="Guardando información…"
        />
      }
    >
        <form id="catalogo-form" onSubmit={handleSubmit} className={FORMULARIO_CREACION_BODY}>
          <div className={FORMULARIO_CREACION_GRID}>
            {FORM_FIELDS.map((field) => (
              <Fragment key={String(field.key)}>
                <div className={field.multiline ? "md:col-span-2 lg:col-span-3" : ""}>
                  <label className={FORMULARIO_CREACION_LABEL}>
                    {field.label} {field.required ? <span className="text-red-400">*</span> : null}
                  </label>

                  {field.isBoolean ? (
                    <div className={FORMULARIO_CREACION_BOOLEAN_ROW}>
                      <input
                        type="checkbox"
                        checked={Boolean(formData[field.key])}
                        onChange={(e) => handleChange(field.key, e.target.checked)}
                        className="h-5 w-5 cursor-pointer rounded border-gray-300 text-[#A8D5BA] focus:ring-[#A8D5BA]"
                      />
                      <span className="ml-3 text-base font-medium text-gray-600">Sí / online</span>
                    </div>
                  ) : field.multiline ? (
                    <textarea
                      value={String(formData[field.key] ?? "")}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      rows={3}
                      className={FORMULARIO_CREACION_INPUT}
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
                      className={FORMULARIO_CREACION_INPUT}
                      required={field.required}
                      placeholder={`Ingresá ${field.label.toLowerCase()}`}
                    />
                  )}
                </div>

                {field.key === "weightValue" ? (
                  <>
                    <div>
                      <label className={FORMULARIO_CREACION_LABEL}>
                        Unidad de visualización <span className="text-red-400">*</span>
                      </label>
                      <select
                        value={formData.unidadVisualizacion ?? "cantidad"}
                        onChange={(e) => handleChange("unidadVisualizacion", e.target.value)}
                        required
                        className={FORMULARIO_CREACION_SELECT}
                      >
                        {UNIDAD_VIS_CATALOGO_OPCIONES.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-base text-gray-500">Etiqueta en pantalla.</p>
                    </div>
                    <div>
                      <label className={FORMULARIO_CREACION_LABEL}>Incluido primario</label>
                      <select
                        value={String(formData.includedPrimarioCatalogoId ?? "")}
                        onChange={(e) => handleChange("includedPrimarioCatalogoId", e.target.value)}
                        className={FORMULARIO_CREACION_SELECT}
                      >
                        <option value="">— Sin vínculo —</option>
                        {opcionesPrimario.map((p) => (
                          <option key={p.id} value={p.id}>
                            {(p.title || "Sin título").trim()} · {p.code}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-base text-gray-500">Derivado opcional.</p>
                    </div>
                    {esCatalogoSecundario(formData as Catalogo) && primarioVinculadoId ? (
                      <div className="grid grid-cols-1 gap-4 md:col-span-2 md:grid-cols-2 lg:col-span-3 lg:grid-cols-2">
                        <div className="rounded-[12px] border border-violet-100 bg-violet-50/40 p-4 md:col-span-2 lg:col-span-2">
                          <p className="text-base font-bold uppercase tracking-widest text-violet-900">
                            Regla g → ud.
                          </p>
                          <p className="mt-1 text-base text-violet-950/90">Gramos netos / ud.</p>
                          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div>
                              <label className={`${FORMULARIO_CREACION_LABEL} mb-1 ml-0`}>
                                Insumo primario (fijo)
                              </label>
                              <div className="rounded-[12px] border border-violet-200 bg-violet-100/60 px-4 py-3 text-base font-semibold tabular-nums text-violet-950">
                                {REGLA_PRIMARIO_BASE_GRAMOS} g
                              </div>
                            </div>
                            <div>
                              <label className={`${FORMULARIO_CREACION_LABEL} mb-1 ml-0`}>
                                Gramos por unidad de este secundario <span className="text-red-400">*</span>
                              </label>
                              <input
                                type="text"
                                inputMode="decimal"
                                value={gramosPorUnidadSecundario}
                                onChange={(e) => setGramosPorUnidadSecundario(e.target.value)}
                                className={FORMULARIO_CREACION_INPUT}
                                placeholder="Ej. 200"
                              />
                            </div>
                          </div>
                          <div className="mt-3">
                            <label className={`${FORMULARIO_CREACION_LABEL} mb-1 ml-0`}>Merma típica (%)</label>
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
                              className={`${FORMULARIO_CREACION_INPUT} max-w-[12rem]`}
                              placeholder="0"
                            />
                            <p className="mt-1 text-base text-violet-950/80">Merma en procesos.</p>
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
    </FormularioPlantilla>
  );
};

