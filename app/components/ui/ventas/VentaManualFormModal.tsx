"use client";

import React, { useEffect, useMemo, useState } from "react";
import { HiOutlinePlus, HiOutlineTrash } from "react-icons/hi2";
import {
  FORMULARIO_CREACION_BODY,
  FORMULARIO_CREACION_GRID,
  FORMULARIO_CREACION_INPUT,
  FORMULARIO_CREACION_LABEL,
  FORMULARIO_CREACION_SELECT,
  FormularioPlantilla,
  FormularioPlantillaAcciones,
} from "@/app/components/ui/FormularioPlantilla";
import type { Slot } from "@/app/interfaces/bodega";
import type { Catalogo } from "@/app/types/catalogo";
import type { Comprador } from "@/app/types/comprador";
import { ORDEN_COMPRA_ESTADOS } from "@/app/types/ordenCompra";
import type { VentaEnCursoLineItem } from "@/app/types/ventaCuenta";
import { esCatalogoSecundario, unidadVisualizacionDe } from "@/lib/catalogoProcesamiento";
import {
  stockPrimarioDesdeSlotsPreferirKgCuandoExisten,
  stockTeoricoUnidadesSecundarioDesdeSlots,
  stockUnidadesSecundarioDesdeSlotsProcesamiento,
} from "@/lib/stockPrimarioBodega";
import { swalConfirm } from "@/lib/swal";

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
    if (stockUnidadesSecundarioDesdeSlotsProcesamiento(slots, cid, p) > 0) return true;
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
    if (stockUnidadesSecundarioDesdeSlotsProcesamiento(slots, cid, p) > 0) return true;
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

const STOCK_CMP_EPS = 1e-6;

/** Cantidad máxima vendible para esa línea (misma base que el selector: mapa y/o inventario). */
function disponibleStockParaVentaManual(
  p: Catalogo,
  clientIdFirestore: string,
  slots: Slot[],
  catalogosConId: Catalogo[],
  soloStockMapaBodegasInternas: boolean,
): number {
  const cid = clientIdFirestore.trim();
  if (esCatalogoSecundario(p)) {
    if (!cid) return 0;
    const pid = String(p.includedPrimarioCatalogoId ?? "").trim();
    const prim = catalogosConId.find(
      (x) => String(x.id ?? "").trim() === pid && !esCatalogoSecundario(x),
    );
    const proc = stockUnidadesSecundarioDesdeSlotsProcesamiento(slots, cid, p);
    if (soloStockMapaBodegasInternas && proc > 0) return proc;
    const n = stockTeoricoUnidadesSecundarioDesdeSlots(slots, cid, p, prim);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }
  const invRaw = Number(p.inventoryQty);
  const invOk = Number.isFinite(invRaw) && invRaw > 0 ? invRaw : 0;
  if (!cid) {
    return soloStockMapaBodegasInternas ? 0 : invOk;
  }
  const { total } = stockPrimarioDesdeSlotsPreferirKgCuandoExisten(slots, cid, p);
  const mapOk = Number.isFinite(total) && total > 0 ? total : 0;
  if (soloStockMapaBodegasInternas) return mapOk;
  return mapOk > 0 ? mapOk : invOk;
}

function cantidadYaReservadaEnLineas(lines: DraftLine[], catalogoProductId: string): number {
  return lines.reduce((acc, ln) => (ln.catalogoProductId === catalogoProductId ? acc + ln.cantidad : acc), 0);
}

function formatoCantidadStock(n: number): string {
  if (!Number.isFinite(n)) return "0";
  return Number.isInteger(n) ? String(n) : n.toLocaleString("es", { maximumFractionDigits: 3 });
}

/** Una línea corta bajo el selector (misma base que la validación de venta). */
function textoDisponibleProductoPick(
  p: Catalogo,
  clientIdFirestore: string,
  slots: Slot[],
  catalogosConId: Catalogo[],
  soloStockMapaBodegasInternas: boolean,
): string {
  const cid = clientIdFirestore.trim();
  if (esCatalogoSecundario(p) && !cid) return "Disponible: —";
  const disp = disponibleStockParaVentaManual(p, clientIdFirestore, slots, catalogosConId, soloStockMapaBodegasInternas);
  if (esCatalogoSecundario(p)) {
    return `Disponible: ${formatoCantidadStock(disp)} uds.`;
  }
  let suf = "uds.";
  if (cid) {
    const { unidadUsada } = stockPrimarioDesdeSlotsPreferirKgCuandoExisten(slots, cid, p);
    suf = unidadUsada === "peso" ? "kg" : "uds.";
  } else {
    suf = unidadVisualizacionDe(p) === "peso" ? "kg" : "uds.";
  }
  return `Disponible: ${formatoCantidadStock(disp)} ${suf}`;
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

  const productosConId = useMemo(
    () => productos.filter((p): p is Catalogo & { id: string } => Boolean(p.id?.trim())),
    [productos],
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
    const elegibles = productosConId.filter((p) => {
      if (!cid) {
        if (soloStockMapaBodegasInternas) return false;
        return catalogoTieneStockInventario(p);
      }
      if (soloStockMapaBodegasInternas) return catalogoTieneStockSoloMapa(p, cid, slotsParaFiltro, productosConId);
      return catalogoTieneStockParaVentaManual(p, cid, slotsParaFiltro, productosConId);
    });
    const prim = elegibles.filter((p) => !esCatalogoSecundario(p));
    const sec = elegibles.filter((p) => esCatalogoSecundario(p));
    return [...prim, ...sec].sort((a, b) => (a.title || "").localeCompare(b.title || "", "es", { sensitivity: "base" }));
  }, [productosConId, clientIdFirestore, slotsParaFiltro, soloStockMapaBodegasInternas]);

  const stockPreviewLineas = useMemo(() => {
    if (!pickProductId.trim()) return null;
    if (cargandoStockMapa) return "Cargando…";
    const p =
      productosParaSelector.find((x) => x.id === pickProductId) ??
      productosConId.find((x) => x.id === pickProductId);
    if (!p) return null;
    let t = textoDisponibleProductoPick(
      p,
      clientIdFirestore,
      slotsParaFiltro,
      productosConId,
      soloStockMapaBodegasInternas,
    );
    const ya = cantidadYaReservadaEnLineas(lines, pickProductId);
    if (ya > 0) {
      const disp = disponibleStockParaVentaManual(
        p,
        clientIdFirestore,
        slotsParaFiltro,
        productosConId,
        soloStockMapaBodegasInternas,
      );
      const rest = Math.max(0, disp - ya);
      t = `${t} · restante: ${formatoCantidadStock(rest)}`;
    }
    return t;
  }, [
    pickProductId,
    cargandoStockMapa,
    productosParaSelector,
    productosConId,
    clientIdFirestore,
    slotsParaFiltro,
    soloStockMapaBodegasInternas,
    lines,
  ]);

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
    const ya = cantidadYaReservadaEnLineas(lines, p.id);
    const disp = disponibleStockParaVentaManual(
      p,
      clientIdFirestore,
      slotsParaFiltro,
      productosConId,
      soloStockMapaBodegasInternas,
    );
    if (ya + q > disp + STOCK_CMP_EPS) {
      const tit = (p.title || "Producto").trim();
      setError(
        ya > 0
          ? `Stock insuficiente para «${tit}»: disponible ${formatoCantidadStock(disp)}; con esta línea el total sería ${ya + q}.`
          : `Stock insuficiente para «${tit}»: disponible ${formatoCantidadStock(disp)} y pedís ${q}.`,
      );
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
    const totalesPorProducto = new Map<string, number>();
    for (const ln of lines) {
      const pid = String(ln.catalogoProductId ?? "").trim();
      if (!pid) {
        setError("Hay una línea con un producto inválido. Quitála y volvé a agregarla.");
        return;
      }
      totalesPorProducto.set(pid, (totalesPorProducto.get(pid) ?? 0) + ln.cantidad);
    }
    for (const [pid, suma] of totalesPorProducto) {
      const p = productosConId.find((x) => x.id === pid);
      if (!p) {
        setError("Hay una línea con un producto inválido. Quitála y volvé a agregarla.");
        return;
      }
      const disp = disponibleStockParaVentaManual(
        p,
        clientIdFirestore,
        slotsParaFiltro,
        productosConId,
        soloStockMapaBodegasInternas,
      );
      if (suma > disp + STOCK_CMP_EPS) {
        const tit = (p.title || "Producto").trim();
        setError(
          `Stock insuficiente para «${tit}»: el pedido suma ${suma} y el disponible es ${formatoCantidadStock(disp)}.`,
        );
        return;
      }
    }
    const nombre = (comp.name || "").trim() || "Sin nombre";
    const bodegaSel = bodegasInternasVenta?.find((b) => b.id === bodegaVentaId.trim());
    const ok = await swalConfirm(
      "¿Guardar la venta manual?",
      `Se creará la venta para «${nombre}» con ${lines.length} línea(s) de producto.`,
    );
    if (!ok) return;
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
    <FormularioPlantilla
      isOpen={isOpen}
      onClose={onClose}
      titulo="Nueva venta manual"
      subtitulo="Venta · comprador"
      titleId="venta-manual-modal-title"
      maxWidthClass="max-w-lg"
      zIndexClass="z-[60]"
      footer={
        <FormularioPlantillaAcciones
          formId="venta-manual-form"
          onCancel={onClose}
          submitLabel="Guardar venta"
          loading={saving}
        />
      }
    >
      <form id="venta-manual-form" onSubmit={(e) => void handleSubmit(e)} className={`${FORMULARIO_CREACION_BODY} space-y-4`}>
        <p className="text-base text-gray-500">Comprador + ítems.</p>

        {error ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-base text-red-700">{error}</p>
        ) : null}

          <div>
            <label htmlFor="venta-comprador" className={FORMULARIO_CREACION_LABEL}>
              Comprador
            </label>
            <select
              id="venta-comprador"
              value={compradorId}
              onChange={(e) => setCompradorId(e.target.value)}
              required
              disabled={compradoresOrdenados.length === 0}
              className={`${FORMULARIO_CREACION_SELECT} disabled:bg-slate-50 disabled:text-slate-500`}
            >
              {compradoresOrdenados.length === 0 ? (
                <option value="">Sin compradores.</option>
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
              <label htmlFor="venta-bodega-origen" className={FORMULARIO_CREACION_LABEL}>
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
                className={`${FORMULARIO_CREACION_SELECT} disabled:bg-slate-50 disabled:text-slate-500`}
              >
                {bodegasInternasVenta.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-base text-gray-500">Stock = mapa bodega.</p>
            </div>
          ) : null}

          <div className={`${FORMULARIO_CREACION_GRID} md:grid-cols-2`}>
            <div>
              <label htmlFor="venta-fecha" className={FORMULARIO_CREACION_LABEL}>
                Fecha
              </label>
              <input
                id="venta-fecha"
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                required
                className={FORMULARIO_CREACION_INPUT}
              />
            </div>
            <div>
              <label htmlFor="venta-estado" className={FORMULARIO_CREACION_LABEL}>
                Estado
              </label>
              <select
                id="venta-estado"
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                className={FORMULARIO_CREACION_SELECT}
              >
                {ORDEN_COMPRA_ESTADOS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="rounded-lg border border-dashed border-[#A8D5BA]/60 bg-[#f8faf8] p-3">
            <p className={`${FORMULARIO_CREACION_LABEL} mb-2`}>Líneas cat.</p>
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
                  className={`${FORMULARIO_CREACION_SELECT} disabled:bg-slate-50 disabled:text-slate-500`}
                >
                  <option value="">
                    {cargandoStockMapa
                      ? "Cargando…"
                      : productosParaSelector.length === 0
                        ? soloStockMapaBodegasInternas
                          ? usaStockPorBodega
                            ? "Sin stock bodega."
                            : "Sin stock internas."
                          : "Sin stock / inv."
                        : "Elegí producto…"}
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
                <label className={`${FORMULARIO_CREACION_LABEL} mb-0.5 sm:sr-only`} htmlFor="venta-cantidad">
                  Cantidad
                </label>
                <input
                  id="venta-cantidad"
                  type="text"
                  inputMode="numeric"
                  value={pickCantidad}
                  onChange={(e) => setPickCantidad(e.target.value)}
                  placeholder="Ej. 12"
                  className={FORMULARIO_CREACION_INPUT}
                />
              </div>
              <button
                type="button"
                onClick={addLine}
                disabled={cargandoStockMapa}
                className="inline-flex items-center justify-center gap-1 rounded-[12px] bg-[#0f172a] px-4 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-50"
              >
                <HiOutlinePlus className="h-4 w-4" />
                Agregar
              </button>
            </div>

            {stockPreviewLineas ? (
              <p className="mt-2 text-xs font-medium text-slate-600" aria-live="polite">
                {stockPreviewLineas}
              </p>
            ) : null}

            {productosParaSelector.length === 0 && !cargandoStockMapa ? (
              <p className="mt-2 text-center text-xs text-amber-800/90">
                {soloStockMapaBodegasInternas
                  ? usaStockPorBodega
                    ? "Sin stock en mapa."
                    : "Sin stock bodegas."
                  : "Sin stock ni inv."}
              </p>
            ) : null}
            {lines.length === 0 ? (
              <p className="mt-3 text-center text-xs text-gray-500">Sin líneas.</p>
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

      </form>
    </FormularioPlantilla>
  );
}
