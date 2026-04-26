"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FiArrowLeft, FiBox, FiCpu, FiPackage, FiX } from "react-icons/fi";
import { MdPendingActions } from "react-icons/md";
import type { Client, Role } from "@/app/interfaces/bodega";
import {
  BODEGA_ZONE_STATUS_ICON_ACTIVE_CLASS,
  BODEGA_ZONE_STATUS_ICON_INACTIVE_CLASS,
  BODEGA_ZONE_STATUS_NUM_ACTIVE_CLASS,
  BODEGA_ZONE_STATUS_NUM_INACTIVE_CLASS,
  BODEGA_ZONE_STATUS_PILL_ACTIVE_CLASS,
  BODEGA_ZONE_STATUS_PILL_INACTIVE_CLASS,
  clientLabelFromList,
} from "@/app/lib/bodegaDisplay";
import {
  cantidadPrimarioProcesamientoTexto,
  estimadoUnidadesSecundarioTexto,
  primarioCatalogoPorId,
  textoPrecioSecundarioCatalogo,
} from "@/app/lib/procesamientoDisplay";
import { unidadesSecundarioEnterasParaMapa } from "@/app/lib/sobranteKg";
import { TarjetaOrdenProcesamientoSlotInner } from "@/app/components/BodegaDashboard/ProcesamientoOrdenesActivasBodega";
import { BodegaDetalleModalFila } from "@/app/components/bodega/CajaDetalleModal";
import { CatalogoService } from "@/app/services/catalogoService";
import { OrdenVentaService } from "@/app/services/ordenVentaService";
import { SolicitudProcesamientoService } from "@/app/services/solicitudProcesamientoService";
import type { Catalogo } from "@/app/types/catalogo";
import type { SolicitudProcesamiento } from "@/app/types/solicitudProcesamiento";
import {
  normalizeProcesamientoEstado,
  procesamientoEstadoBadgeClass,
} from "@/app/types/solicitudProcesamiento";
import type { VentaEnCurso, VentaEnCursoLineItem } from "@/app/types/ventaCuenta";
import { ordenCompraEstadoBadgeClass } from "@/app/types/ordenCompra";

function esEstadoEnCurso(estado: string): boolean {
  const e = estado.trim().toLowerCase();
  return e === "en curso";
}

type Fila = VentaEnCurso & { idCliente: string };

function puedeGestionarAsignaciones(role?: Role): boolean {
  return role === "jefe" || role === "administrador";
}

function esActivaEnBodegaProc(row: SolicitudProcesamiento): boolean {
  const e = normalizeProcesamientoEstado(row.estado);
  return e === "Iniciado" || e === "En curso";
}

function textoCantidadLinea(li: VentaEnCursoLineItem): string {
  const c = Number(li.cantidad);
  if (Number.isFinite(c) && c > 0) return `${Math.round(c)} u.`;
  return "—";
}

const BTN_ASIGNAR_OPERARIO_CLASS =
  "w-full rounded-lg bg-sky-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50 disabled:opacity-50";

export default function VentasEnCursoMapButton({
  clients,
  warehouseCodeCuenta,
  sessionRole,
  operariosBodega = [],
  tareasProcesamientoOperario = [],
  onPushTareaProcesamientoOperario,
  productosCatalogo,
}: {
  clients: Client[];
  warehouseCodeCuenta: string;
  sessionRole?: Role;
  operariosBodega?: Array<{ id: string; name: string; roleLabel?: string }>;
  tareasProcesamientoOperario?: Array<Record<string, unknown>>;
  onPushTareaProcesamientoOperario?: (tarea: Record<string, unknown>) => void;
  productosCatalogo?: Catalogo[];
}) {
  const [open, setOpen] = useState(false);
  const [detalle, setDetalle] = useState<Fila | null>(null);
  const [detalleSolicitud, setDetalleSolicitud] = useState<SolicitudProcesamiento | null>(null);
  const [loading, setLoading] = useState(false);
  const [filas, setFilas] = useState<Fila[]>([]);
  const [rowsProcesamiento, setRowsProcesamiento] = useState<SolicitudProcesamiento[]>([]);
  /** Pendientes visibles en la barra (mismo criterio que el listado del modal). */
  const [ventasEnCursoCount, setVentasEnCursoCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [solicitudModalBusy, setSolicitudModalBusy] = useState(false);
  const [solicitudError, setSolicitudError] = useState<string | null>(null);
  const [asignadoUidSolicitud, setAsignadoUidSolicitud] = useState("");
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

  useEffect(() => {
    if (clientIds.length === 0) {
      setRowsProcesamiento([]);
      return;
    }
    const code = String(warehouseCodeCuenta ?? "").trim();
    if (!code) {
      setRowsProcesamiento([]);
      return;
    }
    setSolicitudError(null);
    return SolicitudProcesamientoService.subscribeParaBodegaInterna(
      clientIds,
      code,
      setRowsProcesamiento,
      () => setSolicitudError("No se pudieron cargar las solicitudes de procesamiento."),
    );
  }, [clientIds, warehouseCodeCuenta]);

  const filasSoloIniciado = useMemo(
    () =>
      rowsProcesamiento
        .filter(esActivaEnBodegaProc)
        .filter((r) => normalizeProcesamientoEstado(r.estado) === "Iniciado"),
    [rowsProcesamiento],
  );

  const refrescarConteoVentasEnCurso = useCallback(async () => {
    if (clientIds.length === 0) {
      setVentasEnCursoCount(0);
      return;
    }
    const code = warehouseCodeCuenta.trim();
    try {
      let n = 0;
      for (const idCliente of clientIds) {
        const list = await OrdenVentaService.getAllByCodeCuenta(idCliente, code);
        for (const o of list) {
          if (esEstadoEnCurso(String(o.estado ?? ""))) n++;
        }
      }
      setVentasEnCursoCount(n);
    } catch {
      setVentasEnCursoCount(0);
    }
  }, [clientIds, warehouseCodeCuenta]);

  useEffect(() => {
    void refrescarConteoVentasEnCurso();
  }, [refrescarConteoVentasEnCurso]);

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
      setVentasEnCursoCount(merged.length);
    } catch {
      setError("No se pudieron cargar las órdenes de venta.");
      setFilas([]);
      setVentasEnCursoCount(0);
    } finally {
      setLoading(false);
    }
  }, [clientIds, warehouseCodeCuenta]);

  useEffect(() => {
    if (open) void cargar();
  }, [open, cargar]);

  useEffect(() => {
    if (!open) {
      setDetalle(null);
      setDetalleSolicitud(null);
    }
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

  useEffect(() => {
    if (!operariosBodega.length) {
      setAsignadoUidSolicitud("");
      return;
    }
    setAsignadoUidSolicitud((prev) =>
      prev && operariosBodega.some((o) => o.id === prev) ? prev : (operariosBodega[0]?.id ?? ""),
    );
  }, [operariosBodega]);

  const puedeAsignarSolicitud = useMemo(() => puedeGestionarAsignaciones(sessionRole), [sessionRole]);

  const responsableSeleccionadoSolicitud =
    operariosBodega.find((o) => o.id === asignadoUidSolicitud) ?? operariosBodega[0] ?? null;

  const asignarOperarioSolicitud = useCallback(async () => {
    if (!detalleSolicitud || !responsableSeleccionadoSolicitud || !onPushTareaProcesamientoOperario) return;
    setSolicitudModalBusy(true);
    setSolicitudError(null);
    try {
      await SolicitudProcesamientoService.asignarOperarioBodega(detalleSolicitud.clientId, detalleSolicitud.id, {
        operarioUid: responsableSeleccionadoSolicitud.id,
        operarioNombre: responsableSeleccionadoSolicitud.name,
      });
      setRowsProcesamiento((list) =>
        list.map((r) =>
          r.clientId === detalleSolicitud.clientId && r.id === detalleSolicitud.id
            ? {
                ...r,
                operarioBodegaUid: responsableSeleccionadoSolicitud.id,
                operarioBodegaNombre: responsableSeleccionadoSolicitud.name,
              }
            : r,
        ),
      );
      setDetalleSolicitud((d) =>
        d && d.clientId === detalleSolicitud.clientId && d.id === detalleSolicitud.id
          ? {
              ...d,
              operarioBodegaUid: responsableSeleccionadoSolicitud.id,
              operarioBodegaNombre: responsableSeleccionadoSolicitud.name,
            }
          : d,
      );
      onPushTareaProcesamientoOperario({
        tipo: "procesamiento",
        clientId: detalleSolicitud.clientId,
        solicitudId: detalleSolicitud.id,
        numero: detalleSolicitud.numero,
        clientName: detalleSolicitud.clientName,
        codeCuenta: detalleSolicitud.codeCuenta,
        warehouseId: detalleSolicitud.warehouseId,
        productoPrimarioId: detalleSolicitud.productoPrimarioId,
        productoPrimarioTitulo: detalleSolicitud.productoPrimarioTitulo,
        productoSecundarioId: detalleSolicitud.productoSecundarioId,
        productoSecundarioTitulo: detalleSolicitud.productoSecundarioTitulo,
        cantidadPrimario: detalleSolicitud.cantidadPrimario,
        unidadPrimarioVisualizacion: detalleSolicitud.unidadPrimarioVisualizacion,
        estimadoUnidadesSecundario: detalleSolicitud.estimadoUnidadesSecundario,
        reglaConversionCantidadPrimario: detalleSolicitud.reglaConversionCantidadPrimario,
        reglaConversionUnidadesSecundario: detalleSolicitud.reglaConversionUnidadesSecundario,
        perdidaProcesamientoPct: detalleSolicitud.perdidaProcesamientoPct,
        operarioUid: responsableSeleccionadoSolicitud.id,
        operarioNombre: responsableSeleccionadoSolicitud.name,
        faseCola: "asignado",
      });
    } catch {
      setSolicitudError("No se pudo asignar el operario.");
    } finally {
      setSolicitudModalBusy(false);
    }
  }, [detalleSolicitud, responsableSeleccionadoSolicitud, onPushTareaProcesamientoOperario]);

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
    setDetalleSolicitud(null);
    setOpen(false);
    void refrescarConteoVentasEnCurso();
  };

  const codeOk = String(warehouseCodeCuenta ?? "").trim();
  const totalTareasPendientesAlmacen = ventasEnCursoCount + filasSoloIniciado.length;

  if (!codeOk) {
    return (
      <button
        type="button"
        disabled
        className={`${BODEGA_ZONE_STATUS_PILL_INACTIVE_CLASS} cursor-not-allowed opacity-80 hover:bg-slate-50/95`}
        title="Sin código de cuenta en la bodega"
        aria-label="Tareas pendientes — ventas en curso (no disponible sin código de cuenta)"
      >
        <MdPendingActions className={BODEGA_ZONE_STATUS_ICON_INACTIVE_CLASS} aria-hidden />
        <span className={`text-[11px] ${BODEGA_ZONE_STATUS_NUM_INACTIVE_CLASS}`}>0</span>
      </button>
    );
  }

  const hayTareasPendientesAlmacen = totalTareasPendientesAlmacen > 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          hayTareasPendientesAlmacen ? BODEGA_ZONE_STATUS_PILL_ACTIVE_CLASS : BODEGA_ZONE_STATUS_PILL_INACTIVE_CLASS
        }
        title={`Tareas pendientes en almacenamiento: ventas en curso (${ventasEnCursoCount}) y órdenes a procesamiento (${filasSoloIniciado.length})`}
        aria-label={`Ver tareas pendientes de almacenamiento, ${totalTareasPendientesAlmacen} en total`}
      >
        <MdPendingActions
          className={
            hayTareasPendientesAlmacen ? BODEGA_ZONE_STATUS_ICON_ACTIVE_CLASS : BODEGA_ZONE_STATUS_ICON_INACTIVE_CLASS
          }
          aria-hidden
        />
        <span
          className={`text-[11px] ${
            hayTareasPendientesAlmacen ? BODEGA_ZONE_STATUS_NUM_ACTIVE_CLASS : BODEGA_ZONE_STATUS_NUM_INACTIVE_CLASS
          }`}
        >
          {totalTareasPendientesAlmacen}
        </span>
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
            className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-sky-200/90 bg-white shadow-2xl shadow-sky-900/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative shrink-0 border-b border-sky-100 bg-linear-to-r from-sky-50 via-white to-cyan-50/80 px-4 py-4 sm:px-6 sm:py-5">
              <div className="flex items-start gap-3 sm:gap-4">
                {detalle || detalleSolicitud ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (detalle) setDetalle(null);
                      else setDetalleSolicitud(null);
                    }}
                    className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50"
                    aria-label="Volver al listado"
                  >
                    <FiArrowLeft className="h-5 w-5" />
                  </button>
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700 shadow-inner">
                    <MdPendingActions className="h-6 w-6 shrink-0" aria-hidden />
                  </div>
                )}
                <div className="min-w-0 flex-1 pr-10">
                  <h2
                    id="ventas-en-curso-map-title"
                    className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl"
                  >
                    {detalle ? (
                      <span className="font-mono">{String(detalle.numero ?? "").trim() || detalle.id}</span>
                    ) : detalleSolicitud ? (
                      <span className="font-mono">
                        {String(detalleSolicitud.numero ?? "").trim() || detalleSolicitud.id}
                      </span>
                    ) : (
                      <>
                        <span className="block text-[11px] font-semibold uppercase tracking-wide text-sky-800/90">
                          Tareas pendientes
                        </span>
                        <span className="mt-1 block text-lg font-bold tracking-tight sm:text-xl">
                          Tareas pendientes
                        </span>
                      </>
                    )}
                  </h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                    {detalle ? (
                      "Venta en curso: revisá líneas y asignaciones."
                    ) : detalleSolicitud &&
                      normalizeProcesamientoEstado(detalleSolicitud.estado) === "Iniciado" ? (
                      "Retiro en bodega: del mapa hacia procesamiento."
                    ) : (
                      "Tareas pendientes de almacenamiento, ventas en curso y órdenes a procesamiento."
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
                  <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-3 text-sm">
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
                    <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-sky-800/85">
                      <FiPackage className="h-4 w-4 text-sky-600" aria-hidden />
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
                            className="rounded-2xl border border-sky-100 bg-linear-to-br from-white to-sky-50/40 p-4 shadow-sm"
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
              ) : detalleSolicitud ? (
                <div className="space-y-4">
                  {solicitudError ? (
                    <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                      {solicitudError}
                    </p>
                  ) : null}
                  <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-3 text-sm">
                    <FiCpu className="h-4 w-4 shrink-0 text-sky-600" aria-hidden />
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase ${procesamientoEstadoBadgeClass(detalleSolicitud.estado)}`}
                    >
                      {detalleSolicitud.estado}
                    </span>
                    <span className="text-slate-600">Almacenamiento → procesamiento.</span>
                  </div>
                  <dl className="space-y-3 text-sm">
                    {normalizeProcesamientoEstado(detalleSolicitud.estado) === "Iniciado" ? (
                      <>
                        <BodegaDetalleModalFila
                          label="Producto"
                          value={(detalleSolicitud.productoPrimarioTitulo || "—").trim() || "—"}
                        />
                        {(() => {
                          const est = detalleSolicitud.estimadoUnidadesSecundario;
                          if (
                            est !== undefined &&
                            est !== null &&
                            Number.isFinite(Number(est)) &&
                            unidadesSecundarioEnterasParaMapa(Number(est)) > 0
                          ) {
                            const udsMapa = unidadesSecundarioEnterasParaMapa(Number(est));
                            return (
                              <BodegaDetalleModalFila label="Unidades en mapa" value={`${udsMapa} u.`} />
                            );
                          }
                          return (
                            <BodegaDetalleModalFila
                              label="Cantidad"
                              value={cantidadPrimarioProcesamientoTexto(
                                detalleSolicitud,
                                primarioCatalogoPorId(productosCatalogo, detalleSolicitud.productoPrimarioId),
                              )}
                            />
                          );
                        })()}
                        {Boolean(
                          String(detalleSolicitud.operarioBodegaNombre ?? "").trim() ||
                            String(detalleSolicitud.operarioBodegaUid ?? "").trim(),
                        ) ? (
                          <BodegaDetalleModalFila
                            label="Responsable"
                            value={
                              detalleSolicitud.operarioBodegaNombre?.trim() ||
                              detalleSolicitud.operarioBodegaUid ||
                              "—"
                            }
                          />
                        ) : null}
                      </>
                    ) : (
                      <>
                        <BodegaDetalleModalFila
                          label="Número"
                          value={<span className="font-mono font-semibold">{detalleSolicitud.numero}</span>}
                        />
                        <BodegaDetalleModalFila
                          label="Cliente"
                          value={detalleSolicitud.clientName?.trim() || detalleSolicitud.clientId || "—"}
                        />
                        <BodegaDetalleModalFila
                          label="Producto primario"
                          value={(detalleSolicitud.productoPrimarioTitulo || "—").trim() || "—"}
                        />
                        <BodegaDetalleModalFila
                          label="Cantidad primario"
                          value={cantidadPrimarioProcesamientoTexto(
                            detalleSolicitud,
                            primarioCatalogoPorId(productosCatalogo, detalleSolicitud.productoPrimarioId),
                          )}
                        />
                        <BodegaDetalleModalFila
                          label="Producto secundario"
                          value={(detalleSolicitud.productoSecundarioTitulo || "—").trim() || "—"}
                        />
                        <BodegaDetalleModalFila
                          label="Precio secundario (catálogo)"
                          value={textoPrecioSecundarioCatalogo(
                            productosCatalogo,
                            detalleSolicitud.productoSecundarioId,
                          )}
                        />
                        {detalleSolicitud.estimadoUnidadesSecundario !== undefined &&
                        detalleSolicitud.estimadoUnidadesSecundario !== null &&
                        Number.isFinite(Number(detalleSolicitud.estimadoUnidadesSecundario)) ? (
                          <>
                            <BodegaDetalleModalFila
                              label="Unidades secundario (estimado)"
                              value={estimadoUnidadesSecundarioTexto(
                                Number(detalleSolicitud.estimadoUnidadesSecundario),
                              )}
                            />
                            {(() => {
                              const udsMapa = unidadesSecundarioEnterasParaMapa(
                                Number(detalleSolicitud.estimadoUnidadesSecundario),
                              );
                              if (udsMapa <= 0) return null;
                              return (
                                <BodegaDetalleModalFila
                                  label="Unidades en mapa (enteras)"
                                  value={`${udsMapa} u.`}
                                />
                              );
                            })()}
                          </>
                        ) : null}
                        {Boolean(
                          String(detalleSolicitud.operarioBodegaNombre ?? "").trim() ||
                            String(detalleSolicitud.operarioBodegaUid ?? "").trim(),
                        ) ? (
                          <BodegaDetalleModalFila
                            label="Responsable"
                            value={
                              detalleSolicitud.operarioBodegaNombre?.trim() ||
                              detalleSolicitud.operarioBodegaUid ||
                              "—"
                            }
                          />
                        ) : null}
                      </>
                    )}
                  </dl>
                </div>
              ) : loading ? (
                <p className="text-sm text-slate-600">Cargando ventas…</p>
              ) : clientIds.length === 0 ? (
                <p className="text-sm text-slate-600">No hay clientes con este código de cuenta.</p>
              ) : (
                <div className="space-y-10">
                  <section className="min-w-0" aria-labelledby="ventas-ec-almacen-ventas">
                    <h3
                      id="ventas-ec-almacen-ventas"
                      className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500"
                    >
                      Ventas en curso
                    </h3>
                    {filas.length === 0 ? (
                      <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-3 py-6 text-sm text-slate-600">
                        No hay <strong className="text-slate-800">ventas</strong> en estado{" "}
                        <strong className="text-slate-800">En curso</strong>.
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
                                className="flex w-full min-w-0 flex-col overflow-hidden rounded-3xl border border-sky-200/90 bg-white p-3 text-left shadow-md ring-sky-200/40 transition hover:border-sky-300 hover:shadow-lg hover:ring-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                              >
                                <div className="flex min-h-[2rem] shrink-0 items-start justify-between gap-2 border-b border-sky-100/90 pb-2">
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
                                  <FiBox className="h-5 w-5 text-sky-600" aria-hidden />
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
                                <div className="mt-3 flex shrink-0 flex-col gap-1 border-t border-sky-100/90 pt-2">
                                  <div className="rounded-full bg-sky-100 px-2 py-1.5 text-center text-[10px] font-semibold text-sky-950">
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
                  </section>

                  <section
                    className="min-w-0 border-t border-slate-100 pt-8"
                    aria-labelledby="ventas-ec-almacen-proc"
                  >
                    <h3
                      id="ventas-ec-almacen-proc"
                      className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500"
                    >
                      Almacenamiento → procesamiento
                    </h3>
                    <p className="mb-3 text-[11px] leading-relaxed text-slate-500">
                      Órdenes en <strong className="text-slate-700">Iniciado</strong>: retiro de primario hacia zona de
                      procesamiento.
                    </p>
                    {filasSoloIniciado.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-3 py-6 text-center text-sm text-slate-600">
                        Ninguna orden en <strong className="text-slate-800">Iniciado</strong>.
                      </div>
                    ) : (
                      <div
                        className="grid grid-cols-1 gap-3 sm:grid-cols-2"
                        role="list"
                        aria-label="Órdenes de almacenamiento hacia procesamiento"
                      >
                        {filasSoloIniciado.map((row) => (
                          <div key={`${row.clientId}::${row.id}`} role="listitem" className="w-full min-w-0">
                            <TarjetaOrdenProcesamientoSlotInner
                              row={row}
                              onSelect={(r) => {
                                setSolicitudError(null);
                                setDetalleSolicitud(r);
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </div>
              )}
            </div>

            <div className="flex shrink-0 flex-col gap-3 border-t border-sky-100 bg-sky-50/50 px-4 py-4 sm:px-6">
              {detalleSolicitud && normalizeProcesamientoEstado(detalleSolicitud.estado) === "Iniciado" ? (
                puedeAsignarSolicitud ? (
                  <div className="rounded-2xl border border-sky-200/80 bg-white px-4 py-3 shadow-sm">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-sky-800/90">
                      Tarea pendiente · retiro en bodega
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      {normalizeProcesamientoEstado(detalleSolicitud.estado) === "Iniciado" ? (
                        "Elegí operario y confirmá para mandar la tarea a su cola."
                      ) : (
                        <>
                          Asigná el operario que debe retirar el <strong>primario</strong> del mapa hacia{" "}
                          <strong>procesamiento</strong>.
                        </>
                      )}
                    </p>
                    {(() => {
                      const yaFs = Boolean(String(detalleSolicitud.operarioBodegaUid ?? "").trim());
                      const yaCola = tareasProcesamientoOperario.some(
                        (t) =>
                          String(t.clientId ?? "") === detalleSolicitud.clientId &&
                          String(t.solicitudId ?? "") === detalleSolicitud.id,
                      );
                      const asignado = yaFs || yaCola;
                      const puedePulsar =
                        Boolean(responsableSeleccionadoSolicitud) &&
                        !asignado &&
                        !solicitudModalBusy &&
                        Boolean(onPushTareaProcesamientoOperario);
                      const variosOperarios = operariosBodega.length > 1;
                      return (
                        <>
                          {operariosBodega.length === 0 ? (
                            <p className="mt-2 rounded-md border border-amber-100 bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-900">
                              Sin operarios configurados.
                            </p>
                          ) : null}
                          {variosOperarios ? (
                            <select
                              id="ventas-map-proc-asignar-a"
                              aria-label="Operario"
                              className="mt-3 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-400/50"
                              value={asignadoUidSolicitud}
                              onChange={(e) => setAsignadoUidSolicitud(e.target.value)}
                              disabled={asignado || solicitudModalBusy}
                            >
                              {operariosBodega.map((o) => (
                                <option key={o.id} value={o.id}>
                                  {(o.name || "Sin nombre").trim()}
                                  {o.roleLabel ? ` · ${o.roleLabel}` : ""}
                                </option>
                              ))}
                            </select>
                          ) : null}
                          {operariosBodega.length > 0 ? (
                            <button
                              type="button"
                              title={
                                asignado
                                  ? "Ya pasó a la cola del operario o figura responsable en la orden"
                                  : !responsableSeleccionadoSolicitud
                                    ? "Sin responsable en el sistema"
                                    : "Pasar a la cola del operario (retiro desde almacenamiento)"
                              }
                              disabled={!puedePulsar}
                              onClick={() => void asignarOperarioSolicitud()}
                              className={`mt-3 ${BTN_ASIGNAR_OPERARIO_CLASS}`}
                            >
                              {asignado ? "En cola / asignado" : "Asignar a operario"}
                            </button>
                          ) : null}
                        </>
                      );
                    })()}
                  </div>
                ) : (
                  <p className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs leading-relaxed text-slate-600">
                    Solo <strong className="text-slate-800">jefe</strong> o{" "}
                    <strong className="text-slate-800">administrador</strong> pueden asignar el operario que retira el
                    primario hacia procesamiento.
                  </p>
                )
              ) : null}
              {detalle && esEstadoEnCurso(detalle.estado) ? (
                <div className="rounded-2xl border border-sky-200/80 bg-white px-4 py-3 shadow-sm">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-sky-800/90">
                    Tarea pendiente · salida a operario
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    Asigná quién debe llevar del <strong>almacenamiento</strong> a <strong>salida</strong> las
                    cantidades pedidas en esta venta.
                  </p>
                  {operariosBodega.length === 0 ? (
                    <p className="mt-2 text-xs text-amber-800">
                      No hay operarios de bodega dados de alta en esta cuenta.
                    </p>
                  ) : tareaSalidaYaExiste ? (
                    <p className="mt-2 text-xs font-semibold text-sky-900">
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
                        className="shrink-0 rounded-xl bg-linear-to-r from-sky-600 to-cyan-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:from-sky-700 hover:to-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {asignarSaving ? "Asignando…" : "Asignar"}
                      </button>
                    </div>
                  )}
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2">
                {detalle || detalleSolicitud ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (detalle) setDetalle(null);
                      else setDetalleSolicitud(null);
                    }}
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
