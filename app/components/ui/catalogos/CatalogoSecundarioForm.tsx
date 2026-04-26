"use client";

import { useEffect, useMemo, useState } from "react";
import type { Catalogo } from "@/app/types/catalogo";
import {
  FORMULARIO_CREACION_BODY,
  FORMULARIO_CREACION_INPUT,
  FORMULARIO_CREACION_LABEL,
  FORMULARIO_CREACION_SELECT,
  FormularioPlantilla,
  FormularioPlantillaAcciones,
  FormularioPlantillaEtiquetaCampo,
} from "@/app/components/ui/FormularioPlantilla";
import { REGLA_PRIMARIO_BASE_GRAMOS } from "@/lib/catalogoProcesamiento";
import { UNIDAD_VIS_CATALOGO_OPCIONES } from "@/lib/unidadVisualizacionCatalogo";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  productosCatalogo: Catalogo[];
  onSubmit: (data: Partial<Catalogo>) => Promise<void>;
}

function esProductoPrimarioLista(p: Catalogo): boolean {
  return String(p.productType ?? "").trim().toLowerCase() !== "secundario";
}

export function CatalogoSecundarioForm({
  isOpen,
  onClose,
  productosCatalogo,
  onSubmit,
}: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [productType, setProductType] = useState("Secundario");
  const [unidadVisualizacion, setUnidadVisualizacion] = useState<string>("cantidad");
  const [includedPrimarioCatalogoId, setIncludedPrimarioCatalogoId] = useState("");
  /** Gramos netos que representa cada unidad de visualización del secundario (p. ej. bolsa 200 g → 200). */
  const [gramosPorUnidadSecundario, setGramosPorUnidadSecundario] = useState("");
  const [mermaPct, setMermaPct] = useState("0");
  /** Precio de referencia del secundario (mismo campo `price` que en el resto del catálogo). */
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const opcionesPrimario = useMemo(
    () =>
      productosCatalogo.filter(
        (p) => Boolean(p.id?.trim()) && esProductoPrimarioLista(p),
      ),
    [productosCatalogo],
  );

  const unidadesPorKgPreview = useMemo(() => {
    const g = Number(String(gramosPorUnidadSecundario).replace(",", ".").trim());
    if (!Number.isFinite(g) || g <= 0) return null;
    const u = REGLA_PRIMARIO_BASE_GRAMOS / g;
    return Number.isFinite(u) && u > 0 ? u : null;
  }, [gramosPorUnidadSecundario]);

  useEffect(() => {
    if (!isOpen) return;
    setTitle("");
    setDescription("");
    setProductType("Secundario");
    setUnidadVisualizacion("cantidad");
    setIncludedPrimarioCatalogoId("");
    setGramosPorUnidadSecundario("");
    setMermaPct("0");
    setPrice("");
    setError(null);
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!title.trim()) {
      setError("El título es obligatorio.");
      return;
    }
    if (!description.trim()) {
      setError("La descripción es obligatoria.");
      return;
    }
    if (!productType.trim()) {
      setError("El tipo es obligatorio.");
      return;
    }
    if (!includedPrimarioCatalogoId.trim()) {
      setError("Seleccioná el producto primario incluido.");
      return;
    }
    const g = Number(String(gramosPorUnidadSecundario).replace(",", ".").trim());
    if (!Number.isFinite(g) || g <= 0) {
      setError("Indicá los gramos por unidad del secundario (mayor a 0).");
      return;
    }
    const a = 1;
    const b = REGLA_PRIMARIO_BASE_GRAMOS / g;
    if (!Number.isFinite(b) || b <= 0) {
      setError("No se pudo calcular la relación. Revisá los gramos por unidad.");
      return;
    }
    const mp = Number(String(mermaPct).replace(",", ".").trim());
    if (!Number.isFinite(mp) || mp < 0 || mp > 100) {
      setError("El % de merma debe estar entre 0 y 100.");
      return;
    }
    const precioRaw = String(price).replace(",", ".").trim();
    if (precioRaw === "") {
      setError("Indicá el precio del producto secundario.");
      return;
    }
    const precioNum = Number(precioRaw);
    if (!Number.isFinite(precioNum) || precioNum < 0) {
      setError("El precio debe ser un número mayor o igual a 0.");
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        productType: productType.trim(),
        unidadVisualizacion,
        includedPrimarioCatalogoId: includedPrimarioCatalogoId.trim(),
        weightUnit: unidadVisualizacion === "peso" ? "peso" : "cantidad",
        reglaConversionCantidadPrimario: a,
        reglaConversionUnidadesSecundario: b,
        conversionCantidadPrimario: a,
        conversionUnidadesSecundario: b,
        mermaPct: mp,
        price: precioNum,
        provider: "—",
        category: "Secundario",
        status: "BUEN ESTADO",
        publishedOnline: false,
        requiresShipping: false,
        chargeTax: false,
        continueSelling: false,
        giftCard: false,
        includedPrimary: false,
      });
      onClose();
    } catch (err) {
      console.error(err);
      setError("No se pudo crear el producto secundario.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormularioPlantilla
      isOpen={isOpen}
      onClose={onClose}
      titulo="Crear producto secundario"
      subtitulo="Alta secundario"
      titleId="catalogo-secundario-form-title"
      maxWidthClass="max-w-lg"
      footer={
        <FormularioPlantillaAcciones
          formId="catalogo-secundario-form"
          onCancel={onClose}
          submitLabel="Crear producto secundario"
          loading={loading}
        />
      }
    >
      <form
        id="catalogo-secundario-form"
        onSubmit={(e) => void handleSubmit(e)}
        className={`${FORMULARIO_CREACION_BODY} space-y-4`}
      >
          <div>
            <FormularioPlantillaEtiquetaCampo requerido>Título</FormularioPlantillaEtiquetaCampo>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={FORMULARIO_CREACION_INPUT}
              required
            />
          </div>
          <div>
            <FormularioPlantillaEtiquetaCampo requerido>Descripción</FormularioPlantillaEtiquetaCampo>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className={FORMULARIO_CREACION_INPUT}
              required
            />
          </div>
          <div>
            <FormularioPlantillaEtiquetaCampo requerido>Tipo</FormularioPlantillaEtiquetaCampo>
            <input
              value={productType}
              onChange={(e) => setProductType(e.target.value)}
              className={FORMULARIO_CREACION_INPUT}
              placeholder="Ej. Secundario, Derivado…"
              required
            />
          </div>
          <div>
            <FormularioPlantillaEtiquetaCampo requerido>Unidad de visualización</FormularioPlantillaEtiquetaCampo>
            <select
              value={unidadVisualizacion}
              onChange={(e) => setUnidadVisualizacion(e.target.value)}
              className={FORMULARIO_CREACION_SELECT}
              required
            >
              {UNIDAD_VIS_CATALOGO_OPCIONES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <FormularioPlantillaEtiquetaCampo requerido>Precio</FormularioPlantillaEtiquetaCampo>
            <input
              type="text"
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className={FORMULARIO_CREACION_INPUT}
              placeholder="0"
              required
            />
            <p className="mt-1 text-base text-gray-500">Precio catálogo.</p>
          </div>

          <div className="rounded-[12px] border border-gray-200 bg-gray-50/50 p-4">
            <p className={FORMULARIO_CREACION_LABEL}>Conversión</p>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={FORMULARIO_CREACION_LABEL}>Base primario</label>
                <div className={`${FORMULARIO_CREACION_INPUT} font-semibold tabular-nums text-gray-900`}>
                  {REGLA_PRIMARIO_BASE_GRAMOS} g
                </div>
              </div>
              <div>
                <FormularioPlantillaEtiquetaCampo requerido>g por unidad</FormularioPlantillaEtiquetaCampo>
                <input
                  type="text"
                  inputMode="decimal"
                  value={gramosPorUnidadSecundario}
                  onChange={(e) => setGramosPorUnidadSecundario(e.target.value)}
                  className={FORMULARIO_CREACION_INPUT}
                  placeholder="200"
                />
              </div>
            </div>
            {unidadesPorKgPreview !== null ? (
              <p className="mt-2 text-xs text-gray-600">
                ≈{" "}
                <span className="font-medium tabular-nums text-gray-900">
                  {unidadesPorKgPreview >= 10
                    ? Math.round(unidadesPorKgPreview)
                    : Math.round(unidadesPorKgPreview * 100) / 100}
                </span>{" "}
                u/kg prim.
              </p>
            ) : null}
            <div className="mt-3">
              <label className={FORMULARIO_CREACION_LABEL}>Merma (%)</label>
              <input
                type="text"
                inputMode="decimal"
                value={mermaPct}
                onChange={(e) => setMermaPct(e.target.value)}
                className={`max-w-[12rem] ${FORMULARIO_CREACION_INPUT}`}
                placeholder="0"
              />
            </div>
          </div>

          <div>
            <FormularioPlantillaEtiquetaCampo requerido>Incluido primario</FormularioPlantillaEtiquetaCampo>
            <select
              value={includedPrimarioCatalogoId}
              onChange={(e) => setIncludedPrimarioCatalogoId(e.target.value)}
              className={FORMULARIO_CREACION_SELECT}
              required
            >
              <option value="">— Elegí —</option>
              {opcionesPrimario.map((p) => (
                <option key={p.id} value={p.id}>
                  {(p.title || "Sin título").trim()} · {p.code}
                </option>
              ))}
            </select>
            {opcionesPrimario.length === 0 ? (
              <p className="mt-1 text-xs text-amber-700">Sin primarios.</p>
            ) : null}
          </div>

          {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-base text-red-700">{error}</p> : null}
        </form>
    </FormularioPlantilla>
  );
}
