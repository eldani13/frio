"use client";

import { useEffect, useMemo, useState } from "react";
import { HiOutlineXMark } from "react-icons/hi2";
import type { Catalogo } from "@/app/types/catalogo";

const UNIDAD_VIS_OPTIONS = [
  { value: "cantidad" as const, label: "Cantidad" },
  { value: "peso" as const, label: "Peso" },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  productosCatalogo: Catalogo[];
  onSubmit: (data: Partial<Catalogo>) => Promise<void>;
}

function esProductoPrimarioLista(p: Catalogo): boolean {
  return String(p.productType ?? "").trim().toLowerCase() !== "secundario";
}

export function CatalogoSecundarioForm({ isOpen, onClose, productosCatalogo, onSubmit }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [productType, setProductType] = useState("Secundario");
  const [unidadVisualizacion, setUnidadVisualizacion] = useState<"cantidad" | "peso">("cantidad");
  const [includedPrimarioCatalogoId, setIncludedPrimarioCatalogoId] = useState("");
  const [conversionCantidadPrimario, setConversionCantidadPrimario] = useState("");
  const [conversionUnidadesSecundario, setConversionUnidadesSecundario] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setTitle("");
    setDescription("");
    setProductType("Secundario");
    setUnidadVisualizacion("cantidad");
    setIncludedPrimarioCatalogoId("");
    setConversionCantidadPrimario("");
    setConversionUnidadesSecundario("");
    setError(null);
  }, [isOpen]);

  const opcionesPrimario = useMemo(
    () =>
      productosCatalogo.filter(
        (p) => Boolean(p.id?.trim()) && esProductoPrimarioLista(p),
      ),
    [productosCatalogo],
  );

  if (!isOpen) return null;

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
    const regA = Number(String(conversionCantidadPrimario).replace(",", "."));
    const regB = Number(String(conversionUnidadesSecundario).replace(",", "."));
    if (!Number.isFinite(regA) || regA <= 0) {
      setError("La cantidad del primario en la regla de conversión debe ser un número mayor que 0.");
      return;
    }
    if (!Number.isFinite(regB) || regB <= 0) {
      setError("Las unidades del secundario en la regla deben ser un número mayor que 0.");
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
        conversionCantidadPrimario: regA,
        conversionUnidadesSecundario: regB,
        weightUnit: unidadVisualizacion,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-[20px] border border-gray-100 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 p-5">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Crear secundario</h2>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Producto derivado vinculado a un primario del catálogo
            </p>
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
              onChange={(e) => setUnidadVisualizacion(e.target.value as "cantidad" | "peso")}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-[#A8D5BA] focus:outline-none focus:ring-1 focus:ring-[#A8D5BA]"
              required
            >
              {UNIDAD_VIS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
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
              <p className="mt-1 text-xs text-amber-700">
                No hay productos primarios en el catálogo. Creá primero un producto que no sea de tipo «Secundario».
              </p>
            ) : null}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 ml-1 block text-[10px] font-bold uppercase tracking-widest text-gray-400">
                Regla: cantidad en primario <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                value={conversionCantidadPrimario}
                onChange={(e) => setConversionCantidadPrimario(e.target.value)}
                placeholder="Ej. 10"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm shadow-sm focus:border-[#A8D5BA] focus:outline-none focus:ring-1 focus:ring-[#A8D5BA]"
                required
              />
              <p className="mt-1 text-[11px] text-gray-500">En la misma unidad de visualización del primario elegido.</p>
            </div>
            <div>
              <label className="mb-1 ml-1 block text-[10px] font-bold uppercase tracking-widest text-gray-400">
                Regla: unidades de este secundario <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                value={conversionUnidadesSecundario}
                onChange={(e) => setConversionUnidadesSecundario(e.target.value)}
                placeholder="Ej. 2"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm shadow-sm focus:border-[#A8D5BA] focus:outline-none focus:ring-1 focus:ring-[#A8D5BA]"
                required
              />
              <p className="mt-1 text-[11px] text-gray-500">Ej.: 10 kg del primario → 2 unidades de este secundario.</p>
            </div>
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
            {loading ? "Guardando…" : "Crear secundario"}
          </button>
        </div>
      </div>
    </div>
  );
}
