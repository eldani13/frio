"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { MdShoppingCart } from "react-icons/md";
import { FiArrowLeft, FiBox, FiPackage, FiX } from "react-icons/fi";
import type { Client } from "@/app/interfaces/bodega";
import { clientLabelFromList } from "@/app/lib/bodegaDisplay";
import { CatalogoService } from "@/app/services/catalogoService";
import { OrdenVentaService } from "@/app/services/ordenVentaService";
import type { VentaEnCurso, VentaEnCursoLineItem } from "@/app/types/ventaCuenta";
import { ordenCompraEstadoBadgeClass } from "@/app/types/ordenCompra";

function esEstadoEnCurso(estado: string): boolean {
  const e = estado.trim().toLowerCase();
  return e === "en curso";
}

type Fila = VentaEnCurso & { idCliente: string };

function textoCantidadLinea(li: VentaEnCursoLineItem): string {
  const c = Number(li.cantidad);
  if (Number.isFinite(c) && c > 0) return `${Math.round(c)} u.`;
  return "—";
}

export default function VentasEnCursoMapButton({
  clients,
  warehouseCodeCuenta,
  operariosBodega = [],
  tareasProcesamientoOperario = [],
  onPushTareaProcesamientoOperario,
}: {
  clients: Client[];
  warehouseCodeCuenta: string;
  operariosBodega?: Array<{ id: string; name: string; roleLabel?: string }>;
  tareasProcesamientoOperario?: Array<Record<string, unknown>>;
  onPushTareaProcesamientoOperario?: (tarea: Record<string, unknown>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [detalle, setDetalle] = useState<Fila | null>(null);
  const [loading, setLoading] = useState(false);
  const [filas, setFilas] = useState<Fila[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [operarioAsignarId, setOperarioAsignarId] = useState("");
  const [asignarSaving, setAsignarSaving] = useState(false);

  const clientIds = useMemo(() => {
    const code = String(warehouseCodeCuenta ?? "").trim();
    if (!code) return [];
    return clients
      .filter((c) => !c.disabled && String(c.code ?? "").trim() === code)
      .map((c) => c.id.trim())
      .filter(Boolean);
  }, [clients, warehouseCodeCuenta]);

  const cargar = useCallback(async () => {
    if (clientIds.length === 0) {
      setFilas([]);
      return;
    }
    const code = warehouseCodeCuenta.trim();
    setLoading(true);
    setError(null);
    try {
      const merged: Fila[] = [];
      for (const idCliente of clientIds) {
        const list = await OrdenVentaService.getAllByCodeCuenta(idCliente, code);
        for (const o of list) {
          const id = String(o.id ?? "").trim();
          if (!id) continue;
          if (esEstadoEnCurso(o.estado)) {
            merged.push({ ...o, id, idCliente });
          }
        }
      }
      merged.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
      setFilas(merged);
    } catch {
      setError("No se pudieron cargar las órdenes de venta.");
      setFilas([]);
    } finally {
      setLoading(false);
    }
  }, [clientIds, warehouseCodeCuenta]);

  useEffect(() => {
    if (open) void cargar();
  }, [open, cargar]);

  useEffect(() => {
    if (!open) setDetalle(null);
  }, [open]);

  useEffect(() => {
    if (!operariosBodega.length) {
      setOperarioAsignarId("");
      return;
    }
    setOperarioAsignarId((prev) => {
      if (prev && operariosBodega.some((o) => o.id === prev)) return prev;
      return operariosBodega[0]?.id ?? "";
    });
  }, [operariosBodega]);

  const tareaSalidaYaExiste = useMemo(() => {
    if (!detalle?.id) return false;
    const vid = detalle.id.trim();
    const cid = detalle.idCliente.trim();
    return tareasProcesamientoOperario.some(
      (t) =>
        String(t.tipo ?? "").trim() === "venta_salida" &&
        String(t.clientId ?? "").trim() === cid &&
        String(t.ventaId ?? t.ordenVentaId ?? "").trim() === vid,
    );
  }, [detalle, tareasProcesamientoOperario]);

  const handleAsignarSalida = async () => {
    if (!detalle?.id || !onPushTareaProcesamientoOperario) return;
    const op = operariosBodega.find((o) => o.id === operarioAsignarId);
    if (!op?.id) {
      window.alert("Elegí un operario de bodega.");
      return;
    }
    if (!(detalle.lineItems ?? []).length) {
      window.alert("La venta no tiene líneas para preparar.");
      return;
    }
    setAsignarSaving(true);
    try {
      const idCliente = detalle.idCliente.trim();
      const lineItems = await Promise.all(
        (detalle.lineItems ?? []).map(async (li) => {
          const pid = String(li.catalogoProductId ?? "").trim();
          let unidadVisualizacion: string | undefined;
          if (pid && idCliente) {
            const prod = await CatalogoService.getById(idCliente, pid);
            const u = String(prod?.unidadVisualizacion ?? "").trim();
            if (u) unidadVisualizacion = u;
          }
          return {
            titleSnapshot: String(li.titleSnapshot ?? "").trim(),
            cantidad: Number(li.cantidad) || 0,
            ...(pid ? { catalogoProductId: pid } : {}),
            ...(unidadVisualizacion ? { unidadVisualizacion } : {}),
          };
        }),
      );
      onPushTareaProcesamientoOperario({
        tipo: "venta_salida",
        clientId: detalle.idCliente,
        ventaId: detalle.id,
        ordenVentaId: detalle.id,
        numero: String(detalle.numero ?? "").trim(),
        compradorNombre: String(detalle.compradorNombre ?? "").trim(),
        clientName: clientLabelFromList(detalle.idCliente, clients),
        fecha: String(detalle.fecha ?? "").trim(),
        lineItems,
        operarioUid: op.id,
        operarioNombre: op.name,
        faseCola: "asignado",
      });
    } finally {
      setAsignarSaving(false);
    }
  };

  const cerrarModal = () => {
    setDetalle(null);
    setOpen(false);
  };

  if (!String(warehouseCodeCuenta ?? "").trim()) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 shadow-sm transition hover:bg-emerald-100 hover:ring-2 hover:ring-emerald-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
        title="Órdenes de venta en curso"
        aria-label="Ver órdenes de venta en curso"
      >
        <MdShoppingCart className="h-5 w-5" aria-hidden />
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/45 p-3 backdrop-blur-[2px] sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ventas-en-curso-map-title"
          onClick={cerrarModal}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative shrink-0 border-b border-slate-100 bg-linear-to-r from-emerald-50 via-white to-white px-4 py-4 sm:px-6 sm:py-5">
              <div className="flex items-start gap-3 sm:gap-4">
                {detalle ? (
                  <button
                    type="button"
                    onClick={() => setDetalle(null)}
                    className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50"
                    aria-label="Volver al listado"
                  >
                    <FiArrowLeft className="h-5 w-5" />
                  </button>
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800 shadow-inner">
                    <MdShoppingCart className="h-6 w-6" />
                  </div>
                )}
                <div className="min-w-0 flex-1 pr-10">
                  <h2
                    id="ventas-en-curso-map-title"
                    className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl"
                  >
                    {detalle ? (
                      <span className="font-mono">{String(detalle.numero ?? "").trim() || detalle.id}</span>
                    ) : (
                      "Órdenes de venta — En curso"
                    )}
                  </h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                    {detalle ? (
                      <>
                        Productos de esta venta. Comprador:{" "}
                        <strong className="text-slate-800">{detalle.compradorNombre}</strong>.
                      </>
                    ) : (
                      <>
                        Cuentas con código{" "}
                        <span className="font-mono font-semibold">{warehouseCodeCuenta}</span> en estado{" "}
                        <strong>En curso</strong>. Tocá una cajita para ver el detalle.
                      </>
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={cerrarModal}
                  className="absolute right-3 top-3 rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 sm:right-4 sm:top-4"
                  aria-label="Cerrar"
                >
                  <FiX className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
              {error ? (
                <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
              ) : null}

              {detalle ? (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase ${ordenCompraEstadoBadgeClass(detalle.estado)}`}
                    >
                      {detalle.estado}
                    </span>
                    <span className="text-slate-600">
                      Cuenta:{" "}
                      <strong className="text-slate-900">
                        {clientLabelFromList(detalle.idCliente, clients)}
                      </strong>
                    </span>
                    {detalle.fecha ? (
                      <span className="text-slate-600">
                        Fecha: <strong className="text-slate-900">{detalle.fecha}</strong>
                      </span>
                    ) : null}
                    {detalle.destinoWarehouseNombre ? (
                      <span className="w-full text-slate-600 sm:w-auto">
                        Destino: <strong className="text-slate-900">{detalle.destinoWarehouseNombre}</strong>
                      </span>
                    ) : null}
                  </div>

                  <div>
                    <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                      <FiPackage className="h-4 w-4 text-emerald-600" aria-hidden />
                      Productos ({Array.isArray(detalle.lineItems) ? detalle.lineItems.length : 0})
                    </h3>
                    {!detalle.lineItems?.length ? (
                      <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                        Esta venta no tiene líneas de producto cargadas.
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {detalle.lineItems.map((li, idx) => (
                          <li
                            key={`${li.catalogoProductId ?? "x"}-${idx}`}
                            className="rounded-2xl border border-emerald-100 bg-linear-to-br from-white to-emerald-50/50 p-4 shadow-sm"
                          >
                            <p className="font-semibold leading-snug text-slate-900">
                              {li.titleSnapshot?.trim() || "Producto"}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                              <span>
                                <span className="font-medium text-slate-500">Cantidad:</span>{" "}
                                <strong className="text-slate-800">{textoCantidadLinea(li)}</strong>
                              </span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ) : loading ? (
                <p className="text-sm text-slate-600">Cargando…</p>
              ) : clientIds.length === 0 ? (
                <p className="text-sm text-slate-600">No hay clientes con este código de cuenta.</p>
              ) : filas.length === 0 ? (
                <p className="text-sm text-slate-600">
                  No hay órdenes de venta en estado <strong>En curso</strong>.
                </p>
              ) : (
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
                  {filas.map((row) => {
                    const nLineas = Array.isArray(row.lineItems) ? row.lineItems.length : 0;
                    const comprador = String(row.compradorNombre ?? "").trim() || "—";
                    const cuenta = clientLabelFromList(row.idCliente, clients);
                    const num = String(row.numero ?? "").trim() || row.id.slice(0, 8);
                    return (
                      <li key={`${row.idCliente}::${row.id}`} className="min-w-0">
                        <button
                          type="button"
                          onClick={() => setDetalle(row)}
                          className="flex w-full min-w-0 flex-col overflow-hidden rounded-3xl border border-emerald-200/90 bg-white p-3 text-left shadow-md ring-emerald-200/40 transition hover:border-emerald-300 hover:shadow-lg hover:ring-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                        >
                          <div className="flex min-h-[2rem] shrink-0 items-start justify-between gap-2 border-b border-emerald-100/80 pb-2">
                            <span className="min-w-0 truncate font-mono text-[10px] font-bold uppercase tracking-wide text-slate-800 sm:text-[11px]">
                              {num}
                            </span>
                            <span
                              className={`shrink-0 rounded-full px-2 py-0.5 text-[8px] font-bold uppercase leading-tight ${ordenCompraEstadoBadgeClass(row.estado)}`}
                            >
                              {row.estado.length > 10 ? "En curso" : row.estado}
                            </span>
                          </div>
                          <div className="flex flex-1 flex-col items-center px-1 pt-3 text-center">
                            <FiBox className="h-5 w-5 text-emerald-600" aria-hidden />
                            <p
                              className="mt-2 line-clamp-2 min-h-[2.25rem] w-full text-[11px] font-semibold leading-snug text-slate-900 sm:text-xs"
                              title={comprador}
                            >
                              {comprador}
                            </p>
                            <p className="mt-1 line-clamp-1 w-full text-[10px] text-slate-500" title={cuenta}>
                              {cuenta}
                            </p>
                          </div>
                          <div className="mt-3 flex shrink-0 flex-col gap-1 border-t border-emerald-100/80 pt-2">
                            <div className="rounded-full bg-emerald-100 px-2 py-1.5 text-center text-[10px] font-semibold text-emerald-950">
                              {nLineas} {nLineas === 1 ? "línea" : "líneas"}
                            </div>
                            {row.fecha ? (
                              <div className="text-center text-[9px] font-medium text-slate-500">{row.fecha}</div>
                            ) : null}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="flex shrink-0 flex-col gap-3 border-t border-slate-100 bg-slate-50/90 px-4 py-4 sm:px-6">
              {detalle && esEstadoEnCurso(detalle.estado) ? (
                <div className="rounded-2xl border border-emerald-200/80 bg-white px-4 py-3 shadow-sm">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    Tarea de salida para operario
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    Asigná quién debe llevar del <strong>mapa de bodega</strong> a <strong>salida</strong> las
                    cantidades pedidas en esta venta.
                  </p>
                  {operariosBodega.length === 0 ? (
                    <p className="mt-2 text-xs text-amber-800">
                      No hay operarios de bodega dados de alta en esta cuenta.
                    </p>
                  ) : tareaSalidaYaExiste ? (
                    <p className="mt-2 text-xs font-semibold text-emerald-800">
                      Esta venta ya tiene una tarea de salida en la cola del operario.
                    </p>
                  ) : (
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                      <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs text-slate-600">
                        <span className="font-semibold text-slate-700">Operario</span>
                        <select
                          value={operarioAsignarId}
                          onChange={(e) => setOperarioAsignarId(e.target.value)}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900"
                        >
                          {operariosBodega.map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button
                        type="button"
                        disabled={
                          asignarSaving ||
                          !operarioAsignarId ||
                          !(detalle.lineItems ?? []).length ||
                          !onPushTareaProcesamientoOperario
                        }
                        onClick={handleAsignarSalida}
                        className="shrink-0 rounded-xl bg-linear-to-r from-emerald-600 to-teal-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:from-emerald-700 hover:to-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {asignarSaving ? "Asignando…" : "Asignar"}
                      </button>
                    </div>
                  )}
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2">
                {detalle ? (
                  <button
                    type="button"
                    onClick={() => setDetalle(null)}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                  >
                    Volver al listado
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={cerrarModal}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
