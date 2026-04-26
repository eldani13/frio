"use client";

import React from "react";
import { HiOutlineArrowLeft, HiOutlineChevronDown, HiOutlinePlus } from "react-icons/hi2";
import { MdShoppingCart } from "react-icons/md";
import {
  ORDEN_COMPRA_ESTADOS,
  ordenCompraEstadoBadgeClass,
} from "@/app/types/ordenCompra";
import type { VentaEnCurso } from "@/app/types/ventaCuenta";
import { compareOrdenCompraByCodigoDesc } from "@/lib/ordenCompraSort";
import type { Catalogo } from "@/app/types/catalogo";
import type { Comprador } from "@/app/types/comprador";
import { VentaManualFormModal } from "@/app/components/ui/ventas/VentaManualFormModal";
import { OrdenVentaService } from "@/app/services/ordenVentaService";
import { AsignarBodegaService } from "@/app/services/asignarbodegaService";
import type { Slot, WarehouseMeta } from "@/app/interfaces/bodega";
import { fetchWarehouseStateOnce } from "@/lib/bodegaCloudState";

function productosResumen(v: VentaEnCurso): string {
  const items = v.lineItems ?? [];
  if (!items.length) return "—";
  return items.map((li) => `${li.titleSnapshot} × ${li.cantidad}`).join(" · ");
}

function opcionesEstadoSelect(estadoActual: string): string[] {
  const cur = estadoActual.trim();
  if (cur && !ORDEN_COMPRA_ESTADOS.some((x) => x === cur)) {
    return [cur, ...ORDEN_COMPRA_ESTADOS];
  }
  return [...ORDEN_COMPRA_ESTADOS];
}

const PAGE_SIZE = 10;

function compareVentasByNumeroDesc(a: VentaEnCurso, b: VentaEnCurso): number {
  return compareOrdenCompraByCodigoDesc(
    { numericId: a.numericId },
    { numericId: b.numericId },
  );
}

function mergeWarehousesForClient(
  byCode: WarehouseMeta[],
  fallback: WarehouseMeta[],
  clientId: string,
  accountCode: string,
): WarehouseMeta[] {
  const map = new Map<string, WarehouseMeta>();
  const add = (w: WarehouseMeta) => {
    if (!w?.id || w.disabled) return;
    map.set(w.id, w);
  };
  byCode.forEach(add);
  const codeTrim = accountCode.trim();
  fallback.forEach((w) => {
    const cc = (w.codeCuenta ?? "").trim();
    if (!cc) return;
    if (codeTrim && cc === codeTrim) add(w);
    if (cc === clientId) add(w);
  });
  return Array.from(map.values()).sort((a, b) =>
    (a.name ?? a.id).localeCompare(b.name ?? b.id, "es", { sensitivity: "base" }),
  );
}

function isInterna(w: WarehouseMeta) {
  const s = (w.status ?? "").toLowerCase().trim();
  return s === "interna";
}

/** Misma presentación que OC-#### en órdenes de compra: consecutivo automático, solo lectura. */
function numeroVentaMostrado(v: VentaEnCurso): string {
  const n = String(v.numero ?? "").trim();
  if (n) return n;
  const id = Number(v.numericId);
  if (Number.isFinite(id) && id > 0) return `V-${String(id).padStart(4, "0")}`;
  return "—";
}

export function VentasEnCursoOperadorPanel({
  onBack,
  idCliente,
  codeCuenta,
  productos,
  compradores,
  dataLoading,
  warehousesFallback = [],
}: {
  onBack: () => void;
  idCliente: string;
  codeCuenta: string;
  productos: Catalogo[];
  compradores: Comprador[];
  dataLoading: boolean;
  warehousesFallback?: WarehouseMeta[];
}) {
  const [ventas, setVentas] = React.useState<VentaEnCurso[]>([]);
  const [ventasLoading, setVentasLoading] = React.useState(false);
  const [detalle, setDetalle] = React.useState<VentaEnCurso | null>(null);
  const [page, setPage] = React.useState(1);
  const [ventaModalOpen, setVentaModalOpen] = React.useState(false);
  const [bodegasInternas, setBodegasInternas] = React.useState<WarehouseMeta[]>([]);
  const [pendienteTransporte, setPendienteTransporte] = React.useState<VentaEnCurso | null>(null);
  const [whTransporteId, setWhTransporteId] = React.useState("");
  const [transporteSaving, setTransporteSaving] = React.useState(false);
  const [iniciarVentaSaving, setIniciarVentaSaving] = React.useState(false);
  const [slotsPorBodegaInterna, setSlotsPorBodegaInterna] = React.useState<Record<string, Slot[]>>({});
  const [bodegasInternasVentaList, setBodegasInternasVentaList] = React.useState<{ id: string; name: string }[]>([]);
  const [slotsInternasLoading, setSlotsInternasLoading] = React.useState(false);

  const loadSlotsMapaInternas = React.useCallback(async () => {
    const cid = idCliente.trim();
    const cc = codeCuenta.trim();
    if (!cid || !cc) {
      setSlotsPorBodegaInterna({});
      setBodegasInternasVentaList([]);
      return;
    }
    setSlotsInternasLoading(true);
    try {
      const byCode = await AsignarBodegaService.getWarehousesByCode(cc);
      const mergedList = mergeWarehousesForClient(byCode, warehousesFallback, cid, cc).filter(isInterna);
      setBodegasInternasVentaList(
        mergedList.map((w) => ({
          id: w.id,
          name: (w.name ?? w.id).trim() || w.id,
        })),
      );
      if (mergedList.length === 0) {
        setSlotsPorBodegaInterna({});
        return;
      }
      setSlotsPorBodegaInterna({});
      const states = await Promise.all(mergedList.map((w) => fetchWarehouseStateOnce(w.id)));
      const byWh: Record<string, Slot[]> = {};
      mergedList.forEach((w, i) => {
        byWh[w.id] = states[i]?.slots ?? [];
      });
      setSlotsPorBodegaInterna(byWh);
    } catch {
      setSlotsPorBodegaInterna({});
      setBodegasInternasVentaList([]);
    } finally {
      setSlotsInternasLoading(false);
    }
  }, [idCliente, codeCuenta, warehousesFallback]);

  React.useEffect(() => {
    void loadSlotsMapaInternas();
  }, [loadSlotsMapaInternas]);

  React.useEffect(() => {
    if (!ventaModalOpen) return;
    void loadSlotsMapaInternas();
  }, [ventaModalOpen, loadSlotsMapaInternas]);

  React.useEffect(() => {
    const cid = idCliente.trim();
    if (!cid) {
      setVentas([]);
      setVentasLoading(false);
      return;
    }
    setVentasLoading(true);
    const unsub = OrdenVentaService.subscribe(
      cid,
      (list) => {
        setVentas(list);
        setVentasLoading(false);
      },
      () => {
        setVentasLoading(false);
      },
    );
    return () => unsub();
  }, [idCliente]);

  React.useEffect(() => {
    setDetalle((d) => {
      if (!d) return d;
      const f = ventas.find((v) => v.id === d.id);
      return f ?? d;
    });
  }, [ventas]);

  React.useEffect(() => {
    if (!pendienteTransporte) {
      setWhTransporteId("");
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const byCode = await AsignarBodegaService.getWarehousesByCode(codeCuenta.trim());
        const merged = mergeWarehousesForClient(
          byCode,
          warehousesFallback,
          idCliente.trim(),
          codeCuenta.trim(),
        ).filter(isInterna);
        if (cancelled) return;
        setBodegasInternas(merged);
        setWhTransporteId((prev) => {
          if (prev && merged.some((w) => w.id === prev)) return prev;
          return merged[0]?.id ?? "";
        });
      } catch {
        if (!cancelled) setBodegasInternas([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pendienteTransporte, codeCuenta, idCliente, warehousesFallback]);

  const tabla = React.useMemo(() => [...ventas].sort(compareVentasByNumeroDesc), [ventas]);
  const pageCount = Math.max(1, Math.ceil(tabla.length / PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, page), pageCount);

  React.useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), pageCount));
  }, [pageCount]);

  const pagina = React.useMemo(
    () => tabla.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [tabla, currentPage],
  );

  const handleEstado = async (v: VentaEnCurso, next: string) => {
    if (next === v.estado) return;
    if (next === "Transporte" && v.estado !== "Transporte") {
      setPendienteTransporte(v);
      return;
    }
    const prev = v.estado;
    setVentas((list) => list.map((row) => (row.id === v.id ? { ...row, estado: next } : row)));
    setDetalle((d) => (d?.id === v.id ? { ...d, estado: next } : d));
    try {
      await OrdenVentaService.updateEstado(idCliente.trim(), v.id, next);
    } catch {
      setVentas((list) => list.map((row) => (row.id === v.id ? { ...row, estado: prev } : row)));
      setDetalle((d) => (d?.id === v.id ? { ...d, estado: prev } : d));
      window.alert("No se pudo guardar el estado en la base de datos. Reintentá.");
    }
  };

  const confirmarTransporteBodega = async () => {
    const v = pendienteTransporte;
    if (!v?.id || !whTransporteId.trim()) return;
    const wh = bodegasInternas.find((w) => w.id === whTransporteId.trim());
    setTransporteSaving(true);
    try {
      await OrdenVentaService.marcarEnTransporteInterna(idCliente.trim(), v.id, {
        destinoWarehouseId: whTransporteId.trim(),
        destinoWarehouseNombre: (wh?.name ?? whTransporteId).trim(),
      });
      setPendienteTransporte(null);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "No se pudo marcar el envío a bodega.");
    } finally {
      setTransporteSaving(false);
    }
  };

  const handleIniciarVenta = async () => {
    if (!detalle?.id) return;
    const e = String(detalle.estado ?? "").trim();
    if (e !== "Iniciado") return;
    setIniciarVentaSaving(true);
    try {
      await handleEstado(detalle, "En curso");
    } finally {
      setIniciarVentaSaving(false);
    }
  };

  const compradoresConId = React.useMemo(
    () => compradores.filter((c) => Boolean(c.id?.trim())),
    [compradores],
  );
  const puedeCrearVenta =
    Boolean(idCliente.trim()) && productos.length > 0 && compradoresConId.length > 0;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <button
          type="button"
          onClick={() => {
            setDetalle(null);
            setVentaModalOpen(false);
            onBack();
          }}
          className="flex items-center gap-2 self-start text-sm font-semibold text-slate-600 transition-colors hover:text-slate-900"
        >
          <HiOutlineArrowLeft size={18} />
          Volver
        </button>

        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-800">
              <MdShoppingCart size={28} />
            </div>
            <div>
              <h1 className="app-title">
                Ordenes de ventas
              </h1>
              <p className="text-sm text-slate-500">
                El <strong>comprador</strong> se elige entre los registrados por el administrador (Compradores).
                Los productos de venta manual son solo los que tienen stock en el <strong>mapa de bodegas internas</strong>
                , en unidades, con estado y fecha (mismos estados que órdenes de compra).
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setDetalle(null);
              setVentaModalOpen(true);
            }}
            disabled={!puedeCrearVenta}
            aria-label="Nueva venta manual"
            title="Nueva venta manual"
            className="inline-flex items-center justify-center gap-2 rounded-[10px] bg-[#A8D5BA] px-5 py-2.5 text-sm font-semibold text-[#2D5A3F] shadow-sm transition hover:bg-[#97c4a9] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
          >
            <HiOutlinePlus strokeWidth={2.5} className="h-5 w-5" />
          </button>
        </header>

        {!idCliente.trim() ? (
          <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
            Iniciá sesión con una cuenta vinculada para usar el catálogo y la lista de compradores.
          </p>
        ) : productos.length === 0 ? (
          <p className="rounded-xl border border-amber-100 bg-amber-50/80 p-4 text-sm text-amber-900">
            Necesitás <strong>productos en el catálogo</strong> de la cuenta para crear ventas manuales.
          </p>
        ) : compradoresConId.length === 0 ? (
          <p className="rounded-xl border border-amber-100 bg-amber-50/80 p-4 text-sm text-amber-900">
            Necesitás al menos un <strong>comprador</strong> registrado. El administrador de la cuenta los da de
            alta en <strong>Asignación y creación → Compradores</strong>.
          </p>
        ) : null}

        <div className="overflow-hidden rounded-xl border border-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="whitespace-nowrap px-4 py-3 text-base font-bold uppercase tracking-wide text-slate-500">
                    Venta
                  </th>
                  <th className="min-w-[120px] px-4 py-3 text-base font-bold uppercase tracking-wide text-slate-500">
                    Comprador
                  </th>
                  <th className="px-4 py-3 text-base font-bold uppercase tracking-wide text-slate-500">
                    Productos
                  </th>
                  <th className="px-4 py-3 text-base font-bold uppercase tracking-wide text-slate-500">
                    Estado
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-base font-bold uppercase tracking-wide text-slate-500">
                    Fecha
                  </th>
                </tr>
              </thead>
              <tbody>
                {dataLoading || ventasLoading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                      {dataLoading ? "Cargando datos de cuenta…" : "Cargando órdenes de venta…"}
                    </td>
                  </tr>
                ) : tabla.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                      No hay órdenes de venta en la base de datos. Usá el botón <strong className="text-slate-700">Nueva
                      venta</strong> para crear la primera (se guarda en{" "}
                      <span className="font-mono text-xs">clientes/…/ordenesVenta</span>).
                    </td>
                  </tr>
                ) : (
                  pagina.map((v) => (
                    <tr
                      key={v.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setDetalle(v)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setDetalle(v);
                        }
                      }}
                      className="cursor-pointer border-b border-slate-100 transition-colors hover:bg-emerald-50/70 focus-visible:bg-emerald-50/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-emerald-400"
                      aria-label={`Ver detalle de venta ${numeroVentaMostrado(v)}`}
                    >
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-base font-semibold text-slate-900">
                        {numeroVentaMostrado(v)}
                      </td>
                      <td className="max-w-[160px] px-4 py-3 text-slate-800">
                        <span className="line-clamp-2 text-base" title={v.compradorNombre}>
                          {v.compradorNombre || "—"}
                        </span>
                      </td>
                      <td
                        className="max-w-md px-4 py-3 text-slate-800"
                        title={productosResumen(v)}
                      >
                        <span className="line-clamp-2 text-base font-medium">
                          {productosResumen(v)}
                        </span>
                      </td>
                      <td
                        className="px-4 py-3"
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      >
                        <div className="relative inline-flex max-w-full align-middle">
                          <select
                            aria-label={`Estado de la venta ${numeroVentaMostrado(v)}`}
                            title="Cambiar estado"
                            value={v.estado}
                            onChange={(e) => void handleEstado(v, e.target.value)}
                            className={`inline-flex max-w-[12rem] cursor-pointer truncate rounded-full border-0 py-0.5 pl-2.5 pr-7 text-left text-xs font-semibold shadow-none outline-none ring-0 focus-visible:ring-2 focus-visible:ring-emerald-400/50 [appearance:none] ${ordenCompraEstadoBadgeClass(v.estado)}`}
                          >
                            {opcionesEstadoSelect(v.estado).map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                          <span
                            className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 text-current opacity-60"
                            aria-hidden
                          >
                            <HiOutlineChevronDown className="h-3.5 w-3.5" strokeWidth={2.25} />
                          </span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">{v.fecha}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {!dataLoading && !ventasLoading && tabla.length > 0 ? (
            <div className="flex flex-col gap-3 border-t border-slate-100 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-xs text-slate-500 tabular-nums">
                {tabla.length} {tabla.length === 1 ? "registro" : "registros"} · Página {currentPage} de{" "}
                {pageCount}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold uppercase tracking-wider shadow-sm hover:border-slate-300 disabled:opacity-50"
                >
                  Anterior
                </button>
                <span className="text-xs text-slate-600 tabular-nums">
                  Página {currentPage} / {pageCount}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                  disabled={currentPage === pageCount}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold uppercase tracking-wider shadow-sm hover:border-slate-300 disabled:opacity-50"
                >
                  Siguiente
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <VentaManualFormModal
        isOpen={ventaModalOpen}
        onClose={() => setVentaModalOpen(false)}
        productos={productos}
        compradores={compradores}
        clientIdFirestore={idCliente.trim()}
        slots={[]}
        bodegasInternasVenta={bodegasInternasVentaList}
        slotsPorBodegaInterna={slotsPorBodegaInterna}
        soloStockMapaBodegasInternas
        cargandoStockMapa={slotsInternasLoading}
        onCreate={async (draft) => {
          await OrdenVentaService.create(idCliente.trim(), codeCuenta.trim(), draft);
          setPage(1);
        }}
      />

      {detalle ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-4 backdrop-blur-[2px] sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="venta-detalle-titulo"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Cerrar"
            onClick={() => setDetalle(null)}
          />
          <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-2xl sm:max-w-lg">
            {/* Cabecera tipo documento */}
            <div className="border-b border-slate-200 bg-linear-to-br from-slate-50 via-white to-emerald-50/30 px-6 pb-5 pt-6">
              <p className="text-base font-bold uppercase tracking-[0.2em] text-slate-500">Orden de venta</p>
              <h2
                id="venta-detalle-titulo"
                className="mt-1 font-mono text-2xl font-bold tracking-tight text-slate-900"
              >
                {numeroVentaMostrado(detalle)}
              </h2>
              <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-200/80 pt-4">
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${ordenCompraEstadoBadgeClass(detalle.estado)}`}
                >
                  {detalle.estado}
                </span>
                <span className="text-sm text-slate-600">
                  <span className="font-medium text-slate-400">Fecha</span>{" "}
                  <span className="font-semibold text-slate-800">{detalle.fecha}</span>
                </span>
              </div>
            </div>

            <div className="max-h-[min(55vh,420px)] space-y-0 overflow-y-auto px-6 py-5">
              {/* Comprador */}
              <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-4">
                <p className="text-base font-bold uppercase tracking-wider text-slate-500">Comprador</p>
                <p className="mt-1.5 text-base font-semibold leading-snug text-slate-900">
                  {detalle.compradorNombre || "—"}
                </p>
              </div>

              {detalle.origenWarehouseNombre ? (
                <p className="mt-4 text-xs text-slate-600">
                  Bodega de la venta:{" "}
                  <span className="font-semibold text-slate-800">{detalle.origenWarehouseNombre}</span>
                </p>
              ) : null}

              {detalle.destinoWarehouseNombre ? (
                <p className="mt-4 text-xs text-slate-600">
                  Bodega destino (transporte):{" "}
                  <span className="font-semibold text-slate-800">{detalle.destinoWarehouseNombre}</span>
                </p>
              ) : null}

              {/* Tabla de productos */}
              <div className="mt-5">
                <p className="text-base font-bold uppercase tracking-wider text-slate-500">Productos</p>
                <div className="mt-2 overflow-hidden rounded-2xl border border-slate-200">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/90">
                        <th className="px-4 py-2.5 text-base font-bold uppercase tracking-wide text-slate-500">
                          Descripción
                        </th>
                        <th className="w-20 px-4 py-2.5 text-right text-base font-bold uppercase tracking-wide text-slate-500">
                          Cant.
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(detalle.lineItems ?? []).length === 0 ? (
                        <tr>
                          <td colSpan={2} className="px-4 py-6 text-center text-sm text-slate-500">
                            Sin líneas en esta venta.
                          </td>
                        </tr>
                      ) : (
                        (detalle.lineItems ?? []).map((li, i) => (
                          <tr
                            key={`${detalle.id}-${i}`}
                            className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}
                          >
                            <td className="px-4 py-3 text-base font-medium leading-snug text-slate-800">
                              {li.titleSnapshot}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-base tabular-nums text-slate-700">
                              × {li.cantidad}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-5">
              {String(detalle.estado ?? "").trim() === "Iniciado" ? (
                <button
                  type="button"
                  disabled={iniciarVentaSaving || !(detalle.lineItems ?? []).length}
                  onClick={() => void handleIniciarVenta()}
                  className="w-full rounded-2xl border-2 border-emerald-400 bg-linear-to-b from-emerald-50 to-emerald-100/80 py-3.5 text-sm font-bold text-emerald-950 shadow-sm transition hover:border-emerald-500 hover:from-emerald-100 hover:to-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {iniciarVentaSaving ? "Guardando…" : "Iniciar venta"}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setDetalle(null)}
                className="w-full rounded-2xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {pendienteTransporte ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <h3 className="app-title">Enviar a bodega interna</h3>
            <p className="mt-2 text-sm text-slate-600">
              Venta <span className="font-mono font-semibold">{numeroVentaMostrado(pendienteTransporte)}</span>: se
              pondrá en <strong>Transporte</strong> hacia la bodega elegida (el custodio registrará las cajas en
              ingreso).
            </p>
            <label className="mt-4 block text-xs font-semibold text-slate-600">
              Bodega interna
              <select
                value={whTransporteId}
                onChange={(e) => setWhTransporteId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                {bodegasInternas.length === 0 ? (
                  <option value="">No hay bodegas internas vinculadas</option>
                ) : (
                  bodegasInternas.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name?.trim() || w.id}
                    </option>
                  ))
                )}
              </select>
            </label>
            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={() => setPendienteTransporte(null)}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!whTransporteId.trim() || transporteSaving}
                onClick={() => void confirmarTransporteBodega()}
                className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                {transporteSaving ? "Guardando…" : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
