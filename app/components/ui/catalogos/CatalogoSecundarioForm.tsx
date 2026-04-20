"use client";

import { useEffect, useMemo, useState } from "react";
import { HiOutlineXMark } from "react-icons/hi2";
import type { Catalogo } from "@/app/types/catalogo";
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
        provider: "—",
        category: "Secundario",
        status: "draft",
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-[20px] border border-gray-100 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 p-5">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Crear producto secundario</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 transition-colors hover:bg-gray-100">
            <HiOutlineXMark size={22} className="text-gray-500" />
          </button>
        </div>

        <form id="catalogo-secundario-form" onSubmit={(e) => void handleSubmit(e)} className="flex-1 space-y-4 overflow-y-auto p-5">
          <div>
            <label className="mb-1 ml-1 block text-[10px] font-bold uppercase tracking-widest text-gray-400">
              Título <span className="text-red-400">*</span>
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm shadow-sm focus:border-[#A8D5BA] focus:outline-none focus:ring-1 focus:ring-[#A8D5BA]"
              required
            />
          </div>
          <div>
            <label className="mb-1 ml-1 block text-[10px] font-bold uppercase tracking-widest text-gray-400">
              Descripción <span className="text-red-400">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm shadow-sm focus:border-[#A8D5BA] focus:outline-none focus:ring-1 focus:ring-[#A8D5BA]"
              required
            />
          </div>
          <div>
            <label className="mb-1 ml-1 block text-[10px] font-bold uppercase tracking-widest text-gray-400">
              Tipo <span className="text-red-400">*</span>
            </label>
            <input
              value={productType}
              onChange={(e) => setProductType(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm shadow-sm focus:border-[#A8D5BA] focus:outline-none focus:ring-1 focus:ring-[#A8D5BA]"
              placeholder="Ej. Secundario, Derivado…"
              required
            />
          </div>
          <div>
            <label className="mb-1 ml-1 block text-[10px] font-bold uppercase tracking-widest text-gray-400">
              Unidad de visualización <span className="text-red-400">*</span>
            </label>
            <select
              value={unidadVisualizacion}
              onChange={(e) => setUnidadVisualizacion(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-[#A8D5BA] focus:outline-none focus:ring-1 focus:ring-[#A8D5BA]"
              required
            >
              {UNIDAD_VIS_CATALOGO_OPCIONES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Conversión</p>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-gray-600">
                  Base primario
                </label>
                <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold tabular-nums text-gray-900">
                  {REGLA_PRIMARIO_BASE_GRAMOS} g
                </div>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-gray-600">
                  g por unidad <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={gramosPorUnidadSecundario}
                  onChange={(e) => setGramosPorUnidadSecundario(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
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
                u./kg primario
              </p>
            ) : null}
            <div className="mt-3">
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-gray-600">
                Merma (%)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={mermaPct}
                onChange={(e) => setMermaPct(e.target.value)}
                className="w-full max-w-[12rem] rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                placeholder="0"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 ml-1 block text-[10px] font-bold uppercase tracking-widest text-gray-400">
              Incluido primario <span className="text-red-400">*</span>
            </label>
            <select
              value={includedPrimarioCatalogoId}
              onChange={(e) => setIncludedPrimarioCatalogoId(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-[#A8D5BA] focus:outline-none focus:ring-1 focus:ring-[#A8D5BA]"
              required
            >
              <option value="">— Elegí un producto del catálogo —</option>
              {opcionesPrimario.map((p) => (
                <option key={p.id} value={p.id}>
                  {(p.title || "Sin título").trim()} · {p.code}
                </option>
              ))}
            </select>
            {opcionesPrimario.length === 0 ? (
              <p className="mt-1 text-xs text-amber-700">No hay primarios en el catálogo.</p>
            ) : null}
          </div>

          {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        </form>

        <div className="flex gap-3 border-t border-gray-100 p-5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-2xl border border-gray-200 py-3 text-sm font-bold text-gray-600 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            form="catalogo-secundario-form"
            type="submit"
            disabled={loading}
            className="flex-[2] rounded-2xl bg-[#c4b5fd] py-3 text-sm font-bold text-violet-950 shadow-sm hover:bg-[#b8a9fc] disabled:opacity-50"
          >
            {loading ? "Guardando…" : "Crear producto secundario"}
          </button>
        </div>
      </div>
    </div>
  );
}
