"use client";

import { useEffect, useMemo, useState } from "react";
import { HiOutlineXMark } from "react-icons/hi2";
import type { Catalogo } from "@/app/types/catalogo";
import type { Slot, WarehouseMeta } from "@/app/interfaces/bodega";
import { subscribeWarehouseState } from "@/lib/bodegaCloudState";
import { stockPrimarioDesdeSlotsPreferirKgCuandoExisten } from "@/lib/stockPrimarioBodega";
import {
  esCatalogoSecundario,
  maxUnidadesSecundarioDesdeStock,
} from "@/lib/catalogoProcesamiento";

const UNIDAD_VIS_OPTIONS = [
  { value: "cantidad" as const, label: "Cantidad" },
  { value: "peso" as const, label: "Peso" },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  productosCatalogo: Catalogo[];
  onSubmit: (data: Partial<Catalogo>) => Promise<void>;
  /** `clientes/{id}`: debe coincidir con `slot.client` en el mapa. */
  clientIdFirestore?: string;
  /** Bodegas internas con `codeCuenta` y `id` para leer el mapa (misma lógica que órdenes de procesamiento). */
  bodegasInternas?: WarehouseMeta[];
}

function esProductoPrimarioLista(p: Catalogo): boolean {
  return String(p.productType ?? "").trim().toLowerCase() !== "secundario";
}

function formatStockParaCampo(n: number, unidadPrim: "cantidad" | "peso"): string {
  if (!Number.isFinite(n) || n < 0) return "";
  if (unidadPrim === "cantidad") return String(Math.round(n));
  if (Number.isInteger(n)) return String(n);
  return n.toLocaleString("es-CO", { maximumFractionDigits: 4 });
}

export function CatalogoSecundarioForm({
  isOpen,
  onClose,
  productosCatalogo,
  onSubmit,
  clientIdFirestore = "",
  bodegasInternas = [],
}: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [productType, setProductType] = useState("Secundario");
  const [unidadVisualizacion, setUnidadVisualizacion] = useState<"cantidad" | "peso">("cantidad");
  const [includedPrimarioCatalogoId, setIncludedPrimarioCatalogoId] = useState("");
  const [conversionCantidadPrimario, setConversionCantidadPrimario] = useState("");
  const [conversionUnidadesSecundario, setConversionUnidadesSecundario] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [bodegaWarehouseId, setBodegaWarehouseId] = useState("");
  const [slotsBodega, setSlotsBodega] = useState<Slot[]>([]);
  const [mapaBodegaLoading, setMapaBodegaLoading] = useState(false);

  const opcionesPrimario = useMemo(
    () =>
      productosCatalogo.filter(
        (p) => Boolean(p.id?.trim()) && esProductoPrimarioLista(p),
      ),
    [productosCatalogo],
  );

  const bodegasConCodigo = useMemo(
    () =>
      bodegasInternas.filter(
        (w) => String(w.codeCuenta ?? "").trim() && String(w.id ?? "").trim(),
      ),
    [bodegasInternas],
  );

  const warehouseFirestoreId = bodegaWarehouseId.trim();

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
    setBodegaWarehouseId("");
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (bodegasConCodigo.length === 0) {
      setBodegaWarehouseId("");
      return;
    }
    setBodegaWarehouseId((cur) => {
      if (cur && bodegasConCodigo.some((w) => w.id === cur)) return cur;
      return bodegasConCodigo[0]?.id ?? "";
    });
  }, [isOpen, bodegasConCodigo]);

  useEffect(() => {
    if (!isOpen) {
      setSlotsBodega([]);
      setMapaBodegaLoading(false);
      return;
    }
    if (!warehouseFirestoreId) {
      setSlotsBodega([]);
      setMapaBodegaLoading(false);
      return;
    }
    setMapaBodegaLoading(true);
    const unsub = subscribeWarehouseState(warehouseFirestoreId, (state) => {
      setSlotsBodega(Array.isArray(state.slots) ? state.slots : []);
      setMapaBodegaLoading(false);
    });
    return () => {
      unsub();
    };
  }, [isOpen, warehouseFirestoreId]);

  const primarioSeleccionado = useMemo(() => {
    const id = includedPrimarioCatalogoId.trim();
    if (!id) return null;
    return opcionesPrimario.find((p) => p.id === id) ?? null;
  }, [includedPrimarioCatalogoId, opcionesPrimario]);

  const reglaReferenciaHermano = useMemo(() => {
    const pid = includedPrimarioCatalogoId.trim();
    if (!pid) return null;
    const hermano = productosCatalogo.find(
      (p) =>
        Boolean(p.id?.trim()) &&
        esCatalogoSecundario(p) &&
        String(p.includedPrimarioCatalogoId ?? "").trim() === pid &&
        Number(p.conversionCantidadPrimario) > 0 &&
        Number(p.conversionUnidadesSecundario) > 0,
    );
    return hermano ?? null;
  }, [productosCatalogo, includedPrimarioCatalogoId]);

  const stockDesdeMapa = useMemo(() => {
    const cid = clientIdFirestore.trim();
    if (!primarioSeleccionado?.id || !cid) {
      return { total: 0, cajasCoincidentes: 0, unidadUsada: "cantidad" as const };
    }
    return stockPrimarioDesdeSlotsPreferirKgCuandoExisten(slotsBodega, cid, primarioSeleccionado);
  }, [slotsBodega, clientIdFirestore, primarioSeleccionado]);

  const stockPrim = stockDesdeMapa.total;
  /** Puede ser «peso» aunque el catálogo diga «cantidad», si las cajas traen kg en el mapa. */
  const unidadInventarioPrimario = stockDesdeMapa.unidadUsada;

  useEffect(() => {
    if (!isOpen) return;
    if (!primarioSeleccionado?.id) {
      setConversionCantidadPrimario("");
      setConversionUnidadesSecundario("");
      return;
    }
    const stockStr = formatStockParaCampo(stockPrim, unidadInventarioPrimario);
    setConversionCantidadPrimario(stockStr);

    const refA = Number(reglaReferenciaHermano?.conversionCantidadPrimario);
    const refB = Number(reglaReferenciaHermano?.conversionUnidadesSecundario);
    let maxB: number | null = null;
    if (Number.isFinite(stockPrim) && stockPrim > 0 && Number.isFinite(refA) && refA > 0 && Number.isFinite(refB) && refB > 0) {
      maxB = maxUnidadesSecundarioDesdeStock(stockPrim, refA, refB);
    } else if (unidadInventarioPrimario === "cantidad" && Number.isFinite(stockPrim) && stockPrim > 0) {
      maxB = maxUnidadesSecundarioDesdeStock(stockPrim, 1, 1);
    }
    setConversionUnidadesSecundario(maxB !== null ? String(maxB) : "");
  }, [
    isOpen,
    primarioSeleccionado?.id,
    stockPrim,
    unidadInventarioPrimario,
    reglaReferenciaHermano?.conversionCantidadPrimario,
    reglaReferenciaHermano?.conversionUnidadesSecundario,
  ]);

  const bloqueoCantidadPrimarioDesdeInventario = stockPrim > 0;
  /** Unidades secundario autocalculadas (no editables) cuando hay stock y hay referencia o primario en cantidad. */
  const bloqueoUnidadesSecundarioAutocalculadas =
    stockPrim > 0 && (Boolean(reglaReferenciaHermano) || unidadInventarioPrimario === "cantidad");

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

  if (!isOpen) return null;

  const etiquetaBodega = (w: WarehouseMeta) => {
    const name = String(w.name ?? "").trim();
    const code = String(w.codeCuenta ?? "").trim();
    if (name && code) return `${name} · ${code}`;
    if (name) return name;
    if (code) return code;
    return w.id;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-[20px] border border-gray-100 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 p-5">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Crear producto secundario</h2>
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

          {bodegasConCodigo.length > 0 ? (
            <div>
              <label className="mb-1 ml-1 block text-[10px] font-bold uppercase tracking-widest text-gray-400">
                Bodega interna (mapa de inventario) <span className="text-red-400">*</span>
              </label>
              <select
                value={bodegaWarehouseId}
                onChange={(e) => setBodegaWarehouseId(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-[#A8D5BA] focus:outline-none focus:ring-1 focus:ring-[#A8D5BA]"
              >
                {bodegasConCodigo.map((w) => (
                  <option key={w.id} value={w.id}>
                    {etiquetaBodega(w)}
                  </option>
                ))}
              </select>
              {mapaBodegaLoading ? (
                <p className="mt-1 text-[11px] text-gray-500">Cargando mapa de bodega…</p>
              ) : null}
            </div>
          ) : (
            <p className="rounded-lg border border-amber-100 bg-amber-50/90 px-3 py-2 text-[11px] text-amber-900">
              No hay bodega interna con <span className="font-mono font-semibold">codeCuenta</span> asignado a esta
              cuenta. La regla no podrá tomar inventario del mapa hasta que exista una bodega vinculada.
            </p>
          )}

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

          {primarioSeleccionado ? (
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-[11px] text-slate-700">
              <span className="font-semibold text-slate-800">Inventario en mapa (primario):</span>{" "}
              {mapaBodegaLoading ? (
                "…"
              ) : !clientIdFirestore.trim() ? (
                "Falta el cliente en sesión para cruzar con las cajas del mapa."
              ) : (
                <>
                  {formatStockParaCampo(stockPrim, unidadInventarioPrimario) || "0"}{" "}
                  {unidadInventarioPrimario === "peso" ? "kg (suma en bodega)" : "uds. (cantidad en bodega)"}
                  {stockDesdeMapa.cajasCoincidentes > 0 ? (
                    <span className="text-slate-500">
                      {" "}
                      · {stockDesdeMapa.cajasCoincidentes} posición(es) coincidente(s)
                    </span>
                  ) : null}
                </>
              )}
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 ml-1 block text-[10px] font-bold uppercase tracking-widest text-gray-400">
                Regla: cantidad en primario <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                inputMode="decimal"
                readOnly={bloqueoCantidadPrimarioDesdeInventario}
                value={conversionCantidadPrimario}
                onChange={(e) => setConversionCantidadPrimario(e.target.value)}
                placeholder={unidadInventarioPrimario === "peso" ? "Ej. 10 kg" : "Ej. 10"}
                className={`w-full rounded-xl border border-gray-200 px-4 py-3 text-sm shadow-sm focus:border-[#A8D5BA] focus:outline-none focus:ring-1 focus:ring-[#A8D5BA] ${
                  bloqueoCantidadPrimarioDesdeInventario ? "cursor-not-allowed bg-gray-50 text-gray-800" : ""
                }`}
                required
              />
              <p className="mt-1 text-[11px] text-gray-500">
                {bloqueoCantidadPrimarioDesdeInventario
                  ? "Tomado del inventario del mapa (misma unidad de visualización del primario)."
                  : "En la misma unidad de visualización del primario elegido. Sin stock en mapa podés cargar la regla a mano."}
              </p>
            </div>
            <div>
              <label className="mb-1 ml-1 block text-[10px] font-bold uppercase tracking-widest text-gray-400">
                Regla: unidades de este secundario <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                inputMode="decimal"
                readOnly={bloqueoUnidadesSecundarioAutocalculadas}
                value={conversionUnidadesSecundario}
                onChange={(e) => setConversionUnidadesSecundario(e.target.value)}
                placeholder="Ej. 2"
                className={`w-full rounded-xl border border-gray-200 px-4 py-3 text-sm shadow-sm focus:border-[#A8D5BA] focus:outline-none focus:ring-1 focus:ring-[#A8D5BA] ${
                  bloqueoUnidadesSecundarioAutocalculadas ? "cursor-not-allowed bg-gray-50 text-gray-800" : ""
                }`}
                required
              />
              <p className="mt-1 text-[11px] text-gray-500">
                {reglaReferenciaHermano
                  ? "Máximo según regla de tres usando otro secundario del mismo primario como referencia."
                  : unidadInventarioPrimario === "cantidad"
                    ? "Sin otro secundario de referencia: se asume 1 unidad de primario → 1 unidad de secundario."
                    : "Con insumo en kg: si ya existe otro secundario del mismo primario con regla, se calcula el máximo; si no, completá las unidades a mano."}
              </p>
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
            {loading ? "Guardando…" : "Crear producto secundario"}
          </button>
        </div>
      </div>
    </div>
  );
}
