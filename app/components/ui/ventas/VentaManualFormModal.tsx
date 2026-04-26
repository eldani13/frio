"use client";

import React, { useEffect, useMemo, useState } from "react";
import { HiOutlinePlus, HiOutlineTrash, HiOutlineXMark } from "react-icons/hi2";
import type { Slot } from "@/app/interfaces/bodega";
import type { Catalogo } from "@/app/types/catalogo";
import type { Comprador } from "@/app/types/comprador";
import { ORDEN_COMPRA_ESTADOS } from "@/app/types/ordenCompra";
import type { VentaEnCursoLineItem } from "@/app/types/ventaCuenta";
import { esCatalogoSecundario } from "@/lib/catalogoProcesamiento";
import {
  stockPrimarioDesdeSlotsPreferirKgCuandoExisten,
  stockTeoricoUnidadesSecundarioDesdeSlots,
} from "@/lib/stockPrimarioBodega";

type DraftLine = VentaEnCursoLineItem;

export interface VentaManualDraft {
  compradorId: string;
  compradorNombre: string;
  fecha: string;
  estado: string;
  lineItems: VentaEnCursoLineItem[];
  /** Bodega interna donde aplica la venta (stock del mapa). */
  origenWarehouseId?: string;
  origenWarehouseNombre?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  productos: Catalogo[];
  compradores: Comprador[];
  onCreate: (draft: VentaManualDraft) => void | Promise<void>;
  /**
   * Con `clientIdFirestore` + `slots`, entran primarios y secundarios con stock en mapa **o** `inventoryQty` en catálogo.
   * Sin `clientIdFirestore`, solo `inventoryQty` del catálogo.
   */
  clientIdFirestore?: string;
  slots?: Slot[];
  /** Si es true, solo entran ítems con stock en `slots` (p. ej. mapas de bodegas internas); no usa `inventoryQty` del catálogo. */
  soloStockMapaBodegasInternas?: boolean;
  /** Lectura en curso del mapa (deshabilita el selector hasta tener datos). */
  cargandoStockMapa?: boolean;
  /** Bodegas internas elegibles; con {@link slotsPorBodegaInterna} filtra productos por la bodega seleccionada. */
  bodegasInternasVenta?: { id: string; name: string }[];
  slotsPorBodegaInterna?: Record<string, Slot[]>;
}

function etiquetaComprador(c: Comprador): string {
  const n = String(c.name ?? "").trim() || "Sin nombre";
  const code = String(c.code ?? "").trim();
  return code ? `${n} · ${code}` : n;
}

function catalogoTieneStockInventario(p: Catalogo): boolean {
  const q = Number(p.inventoryQty);
  return Number.isFinite(q) && q > 0;
}

/** Stock en mapa de bodega o cantidad de inventario del catálogo (sirve para primario solo con `inventoryQty`). */
function catalogoTieneStockParaVentaManual(
  p: Catalogo,
  clientIdFirestore: string,
  slots: Slot[],
  catalogosConId: Catalogo[],
): boolean {
  if (catalogoTieneStockInventario(p)) return true;
  const cid = clientIdFirestore.trim();
  if (!cid) return false;
  if (esCatalogoSecundario(p)) {
    const pid = String(p.includedPrimarioCatalogoId ?? "").trim();
    const prim = catalogosConId.find(
      (x) => String(x.id ?? "").trim() === pid && !esCatalogoSecundario(x),
    );
    const n = stockTeoricoUnidadesSecundarioDesdeSlots(slots, cid, p, prim);
    return Number.isFinite(n) && n > 0;
  }
  const { total } = stockPrimarioDesdeSlotsPreferirKgCuandoExisten(slots, cid, p);
  return Number.isFinite(total) && total > 0;
}

function catalogoTieneStockSoloMapa(
  p: Catalogo,
  clientIdFirestore: string,
  slots: Slot[],
  catalogosConId: Catalogo[],
): boolean {
  const cid = clientIdFirestore.trim();
  if (!cid) return false;
  if (esCatalogoSecundario(p)) {
    const pid = String(p.includedPrimarioCatalogoId ?? "").trim();
    const prim = catalogosConId.find(
      (x) => String(x.id ?? "").trim() === pid && !esCatalogoSecundario(x),
    );
    const n = stockTeoricoUnidadesSecundarioDesdeSlots(slots, cid, p, prim);
    return Number.isFinite(n) && n > 0;
  }
  const { total } = stockPrimarioDesdeSlotsPreferirKgCuandoExisten(slots, cid, p);
  return Number.isFinite(total) && total > 0;
}

export function VentaManualFormModal({
  isOpen,
  onClose,
  productos,
  compradores,
  onCreate,
  clientIdFirestore = "",
  slots = [],
  soloStockMapaBodegasInternas = false,
  cargandoStockMapa = false,
  bodegasInternasVenta,
  slotsPorBodegaInterna,
}: Props) {
  const [fecha, setFecha] = useState("");
  const [estado, setEstado] = useState<string>("Iniciado");
  const [compradorId, setCompradorId] = useState("");
  const [bodegaVentaId, setBodegaVentaId] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [pickProductId, setPickProductId] = useState("");
  const [pickCantidad, setPickCantidad] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const compradoresConId = useMemo(
    () => compradores.filter((c): c is Comprador & { id: string } => Boolean(c.id?.trim())),
    [compradores],
  );

  const compradoresOrdenados = useMemo(
    () =>
      [...compradoresConId].sort((a, b) =>
        (a.name || "").localeCompare(b.name || "", "es", { sensitivity: "base" }),
      ),
    [compradoresConId],
  );

  const usaStockPorBodega =
    Boolean(soloStockMapaBodegasInternas) &&
    Boolean(bodegasInternasVenta?.length) &&
    Object.keys(slotsPorBodegaInterna ?? {}).length > 0;

  const slotsParaFiltro = useMemo(() => {
    if (!usaStockPorBodega || !slotsPorBodegaInterna) return slots;
    const wid = bodegaVentaId.trim();
    if (!wid) return [];
    return slotsPorBodegaInterna[wid] ?? [];
  }, [usaStockPorBodega, slotsPorBodegaInterna, bodegaVentaId, slots]);

  const productosParaSelector = useMemo(() => {
    const cid = clientIdFirestore.trim();
    const conId = productos.filter((p): p is Catalogo & { id: string } => Boolean(p.id?.trim()));
    const elegibles = conId.filter((p) => {
      if (!cid) {
        if (soloStockMapaBodegasInternas) return false;
        return catalogoTieneStockInventario(p);
      }
      if (soloStockMapaBodegasInternas) return catalogoTieneStockSoloMapa(p, cid, slotsParaFiltro, conId);
      return catalogoTieneStockParaVentaManual(p, cid, slotsParaFiltro, conId);
    });
    const prim = elegibles.filter((p) => !esCatalogoSecundario(p));
    const sec = elegibles.filter((p) => esCatalogoSecundario(p));
    return [...prim, ...sec].sort((a, b) => (a.title || "").localeCompare(b.title || "", "es", { sensitivity: "base" }));
  }, [productos, clientIdFirestore, slotsParaFiltro, soloStockMapaBodegasInternas]);

  useEffect(() => {
    if (!isOpen) return;
    setFecha(new Date().toISOString().slice(0, 10));
    setEstado("Iniciado");
    setCompradorId("");
    setBodegaVentaId("");
    setLines([]);
    setPickProductId("");
    setPickCantidad("");
    setError(null);
    setSaving(false);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !soloStockMapaBodegasInternas || !bodegasInternasVenta?.length) return;
    setBodegaVentaId((cur) => {
      if (cur && bodegasInternasVenta.some((b) => b.id === cur)) return cur;
      return bodegasInternasVenta[0]?.id ?? "";
    });
  }, [isOpen, soloStockMapaBodegasInternas, bodegasInternasVenta]);

  useEffect(() => {
    if (!isOpen || compradoresOrdenados.length === 0) return;
    setCompradorId((cur) => {
      if (cur && compradoresOrdenados.some((c) => c.id === cur)) return cur;
      return compradoresOrdenados[0]?.id ?? "";
    });
  }, [isOpen, compradoresOrdenados]);

  useEffect(() => {
    if (!isOpen) return;
    setPickProductId((cur) =>
      cur && productosParaSelector.some((p) => p.id === cur) ? cur : "",
    );
  }, [isOpen, productosParaSelector]);

  if (!isOpen) return null;

  const addLine = () => {
    setError(null);
    const p = productosParaSelector.find((x) => x.id === pickProductId);
    if (!p?.id) {
      setError("Seleccioná un producto del catálogo.");
      return;
    }
    const q = Number(String(pickCantidad).replace(",", ".").trim());
    if (!Number.isFinite(q) || q <= 0 || !Number.isInteger(q)) {
      setError("Ingresá una cantidad entera mayor a 0.");
      return;
    }
    const line: DraftLine = {
      catalogoProductId: p.id,
      cantidad: q,
      titleSnapshot: p.title || "Sin título",
    };
    setLines((prev) => [...prev, line]);
    setPickProductId("");
    setPickCantidad("");
  };

  const removeLine = (index: number) => {
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const comp = compradoresConId.find((c) => c.id === compradorId);
    if (!comp?.id) {
      setError("Seleccioná un comprador de la lista (cargá compradores desde el administrador de cuenta).");
      return;
    }
    if (lines.length === 0) {
      setError("Agregá al menos una línea con producto y cantidad.");
      return;
    }
    if (usaStockPorBodega && !bodegaVentaId.trim()) {
      setError("Seleccioná la bodega interna donde se realiza la venta.");
      return;
    }
    const nombre = (comp.name || "").trim() || "Sin nombre";
    const bodegaSel = bodegasInternasVenta?.find((b) => b.id === bodegaVentaId.trim());
    setSaving(true);
    try {
      await Promise.resolve(
        onCreate({
          compradorId: comp.id,
          compradorNombre: nombre,
          fecha,
          estado,
          lineItems: lines,
          ...(usaStockPorBodega && bodegaVentaId.trim()
            ? {
                origenWarehouseId: bodegaVentaId.trim(),
                origenWarehouseNombre: (bodegaSel?.name ?? bodegaVentaId).trim(),
              }
            : {}),
        }),
      );
      onClose();
    } catch (err) {
      console.error(err);
      setError("No se pudo guardar la venta. Reintentá.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/20 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="venta-manual-modal-title"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[12px] border border-gray-100 bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="venta-manual-modal-title" className="text-lg font-semibold text-gray-900">
            Nueva venta manual
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Cerrar"
          >
            <HiOutlineXMark size={24} />
          </button>
        </div>

        <p className="mb-4 text-xs text-[#6B7280]">
          Elegí un <strong>comprador</strong> de los que dio de alta el administrador de la cuenta (sección{" "}
          <strong>Compradores</strong> en Asignación y creación), luego <strong>productos del catálogo</strong> en{" "}
          <strong>unidades</strong>, <strong>fecha</strong> y <strong>estado</strong>.{" "}
          {soloStockMapaBodegasInternas ? (
            <>
              Elegí la <strong>bodega interna</strong> donde se realiza la venta; el listado muestra solo productos con
              stock en el <strong>mapa de esa bodega</strong> (mismo criterio que el inventario interno en reportes),
              primarios y secundarios que coincidan con posiciones del mapa.
            </>
          ) : (
            <>
              En el listado entran ítems con <strong>stock en mapa o inventario del catálogo</strong> (primarios y
              secundarios); podés vender un primario aunque todavía no tenga secundario creado.
            </>
          )}
        </p>

        {error ? (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : null}

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div>
            <label
              htmlFor="venta-comprador"
              className="mb-1 block text-[11px] font-bold uppercase text-gray-500"
            >
              Comprador
            </label>
            <select
              id="venta-comprador"
              value={compradorId}
              onChange={(e) => setCompradorId(e.target.value)}
              required
              disabled={compradoresOrdenados.length === 0}
              className="w-full rounded-[8px] border border-gray-200 px-4 py-2 text-sm focus:border-[#A8D5BA] focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
            >
              {compradoresOrdenados.length === 0 ? (
                <option value="">No hay compradores para esta cuenta</option>
              ) : (
                compradoresOrdenados.map((c) => (
                  <option key={c.id} value={c.id}>
                    {etiquetaComprador(c)}
                  </option>
                ))
              )}
            </select>
          </div>

          {bodegasInternasVenta && bodegasInternasVenta.length > 0 ? (
            <div>
              <label
                htmlFor="venta-bodega-origen"
                className="mb-1 block text-[11px] font-bold uppercase text-gray-500"
              >
                Bodega (venta)
              </label>
              <select
                id="venta-bodega-origen"
                value={bodegaVentaId}
                onChange={(e) => {
                  const v = e.target.value;
                  setBodegaVentaId(v);
                  setLines([]);
                  setPickProductId("");
                  setPickCantidad("");
                }}
                required
                disabled={cargandoStockMapa}
                className="w-full rounded-[8px] border border-gray-200 bg-white px-4 py-2 text-sm focus:border-[#A8D5BA] focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
              >
                {bodegasInternasVenta.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-gray-500">
                El stock disponible y las líneas se calculan según el mapa de la bodega elegida.
              </p>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="venta-fecha"
                className="mb-1 block text-[11px] font-bold uppercase text-gray-500"
              >
                Fecha
              </label>
              <input
                id="venta-fecha"
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                required
                className="w-full rounded-[8px] border border-gray-200 px-4 py-2 text-sm focus:border-[#A8D5BA] focus:outline-none"
              />
            </div>
            <div>
              <label
                htmlFor="venta-estado"
                className="mb-1 block text-[11px] font-bold uppercase text-gray-500"
              >
                Estado
              </label>
              <select
                id="venta-estado"
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                className="w-full rounded-[8px] border border-gray-200 px-4 py-2 text-sm focus:border-[#A8D5BA] focus:outline-none"
              >
                {ORDEN_COMPRA_ESTADOS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="rounded-lg border border-dashed border-emerald-200/80 bg-emerald-50/40 p-3">
            <p className="mb-2 text-[11px] font-bold uppercase text-gray-500">Productos del catálogo</p>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
              <div className="min-w-0 flex-1 sm:min-w-[200px]">
                <label className="sr-only" htmlFor="venta-catalogo">
                  Producto
                </label>
                <select
                  id="venta-catalogo"
                  value={pickProductId}
                  onChange={(e) => setPickProductId(e.target.value)}
                  disabled={cargandoStockMapa || productosParaSelector.length === 0}
                  className="w-full rounded-[8px] border border-gray-200 bg-white px-3 py-2 text-sm focus:border-[#A8D5BA] focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
                >
                  <option value="">
                    {cargandoStockMapa
                      ? "Cargando inventario de bodegas internas…"
                      : productosParaSelector.length === 0
                        ? soloStockMapaBodegasInternas
                          ? usaStockPorBodega
                            ? "No hay productos con stock en esta bodega"
                            : "No hay productos con stock en bodegas internas"
                          : "No hay productos con stock en mapa ni en inventario"
                        : "Elegí producto del catálogo…"}
                  </option>
                  {productosParaSelector.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                      {c.sku ? ` · SKU ${c.sku}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-full sm:w-28">
                <label
                  className="mb-0.5 block text-[10px] font-bold uppercase text-gray-500 sm:sr-only"
                  htmlFor="venta-cantidad"
                >
                  Cantidad
                </label>
                <input
                  id="venta-cantidad"
                  type="text"
                  inputMode="numeric"
                  value={pickCantidad}
                  onChange={(e) => setPickCantidad(e.target.value)}
                  placeholder="Ej. 12"
                  className="w-full rounded-[8px] border border-gray-200 bg-white px-3 py-2 text-sm focus:border-[#A8D5BA] focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={addLine}
                disabled={cargandoStockMapa}
                className="inline-flex items-center justify-center gap-1 rounded-[8px] bg-[#0f172a] px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                <HiOutlinePlus className="h-4 w-4" />
                Agregar
              </button>
            </div>

            {productosParaSelector.length === 0 && !cargandoStockMapa ? (
              <p className="mt-2 text-center text-xs text-amber-800/90">
                {soloStockMapaBodegasInternas
                  ? usaStockPorBodega
                    ? "No hay primarios ni secundarios con stock en el mapa de la bodega seleccionada."
                    : "No hay primarios ni secundarios que coincidan con posiciones con stock en las bodegas internas."
                  : "No hay primarios ni secundarios con stock en el mapa de esta cuenta ni cantidad en inventario del catálogo."}
              </p>
            ) : null}
            {lines.length === 0 ? (
              <p className="mt-3 text-center text-xs text-gray-500">Todavía no hay líneas en esta venta.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {lines.map((ln, i) => (
                  <li
                    key={`${ln.catalogoProductId}-${i}`}
                    className="flex items-center justify-between gap-2 rounded-md border border-gray-100 bg-white px-3 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-gray-900">{ln.titleSnapshot}</p>
                      <p className="text-xs text-gray-500">{ln.cantidad} u.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeLine(i)}
                      className="shrink-0 rounded-lg p-2 text-[#fca5a5] hover:bg-red-50"
                      title="Quitar"
                    >
                      <HiOutlineTrash className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-[8px] px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-[8px] bg-[#A8D5BA] px-5 py-2 text-sm font-semibold text-[#2D5A3F] transition hover:bg-[#97c4a9] active:scale-[0.98] disabled:opacity-50"
            >
              {saving ? "Guardando…" : "Guardar venta"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
