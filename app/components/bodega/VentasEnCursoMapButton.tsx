"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FiArrowLeft, FiBox, FiInfo, FiPackage, FiSend } from "react-icons/fi";
import { MdPendingActions } from "react-icons/md";
import type { Box, Client, Role } from "@/app/interfaces/bodega";
import {
  BODEGA_ZONE_STATUS_ICON_ACTIVE_CLASS,
  BODEGA_ZONE_STATUS_ICON_INACTIVE_CLASS,
  BODEGA_ZONE_STATUS_NUM_ACTIVE_CLASS,
  BODEGA_ZONE_STATUS_NUM_INACTIVE_CLASS,
  BODEGA_ZONE_STATUS_PILL_ACTIVE_CLASS,
  BODEGA_ZONE_STATUS_PILL_INACTIVE_CLASS,
  clientLabelFromList,
  OCCUPIED_MAPA_TONE_PRIMARIO,
} from "@/app/lib/bodegaDisplay";
import {
  BODEGA_SLOT_BODY_CLASS,
  BODEGA_SLOT_ROUNDED,
  BODEGA_SLOT_SHELL_CLASS,
  BODEGA_SLOT_SHELL_PADDING,
  BODEGA_SLOTS_GRID_ALMACEN_CLASS,
} from "@/app/lib/bodegaSlotUniform";
import {
  cantidadPrimarioProcesamientoTexto,
  estimadoUnidadesSecundarioTexto,
  primarioCatalogoPorId,
  textoPrecioSecundarioCatalogo,
} from "@/app/lib/procesamientoDisplay";
import { unidadesSecundarioEnterasParaMapa } from "@/app/lib/sobranteKg";
import { TarjetaOrdenProcesamientoSlotInner } from "@/app/components/BodegaDashboard/ProcesamientoOrdenesActivasBodega";
import { swalConfirm, swalWarning } from "@/lib/swal";
import { BodegaDetalleModalFila } from "@/app/components/bodega/CajaDetalleModal";
import {
  JefeModalEmptyHint,
  JefeModalField,
  JefeOrderModalShell,
  jefeBtnGhost,
  jefeModalAccentClass,
  jefeNestedShellBorder,
} from "@/app/components/bodega/JefeOrderModalShell";
import { ModalPlantilla } from "@/app/components/ui/ModalPlantilla";
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

export default function VentasEnCursoMapButton({
  clients,
  warehouseCodeCuenta,
  sessionRole,
  operariosBodega = [],
  tareasProcesamientoOperario = [],
  onPushTareaProcesamientoOperario,
  productosCatalogo,
  outboundBoxes = [],
}: {
  clients: Client[];
  warehouseCodeCuenta: string;
  sessionRole?: Role;
  operariosBodega?: Array<{ id: string; name: string; roleLabel?: string }>;
  tareasProcesamientoOperario?: Array<Record<string, unknown>>;
  onPushTareaProcesamientoOperario?: (tarea: Record<string, unknown>) => void;
  productosCatalogo?: Catalogo[];
  /** Si ya hay cajas de la venta en zona de salida, no mostrar asignación «almacenamiento → salida». */
  outboundBoxes?: Box[];
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

  /** Cajas con trazabilidad OV ya ubicadas en salida: el traslado mapa→salida ya ocurrió. */
  const ventaCajasYaEnSalida = useMemo(() => {
    if (!detalle?.id) return false;
    const vid = String(detalle.id ?? "").trim();
    const cid = String(detalle.idCliente ?? "").trim();
    if (!vid || !cid) return false;
    return outboundBoxes.some((b) => {
      if (String(b.ordenVentaId ?? "").trim() !== vid) return false;
      if (String(b.ordenVentaClienteId ?? "").trim() !== cid) return false;
      return Boolean(String(b.autoId ?? "").trim() || String(b.name ?? "").trim());
    });
  }, [detalle, outboundBoxes]);

  const handleAsignarSalida = async () => {
    if (!detalle?.id || !onPushTareaProcesamientoOperario) return;
    const op = operariosBodega.find((o) => o.id === operarioAsignarId);
    if (!op?.id) {
      void swalWarning("Falta operario", "Elegí un operario de bodega.");
      return;
    }
    if (!(detalle.lineItems ?? []).length) {
      void swalWarning("Sin líneas", "La venta no tiene líneas para preparar.");
      return;
    }
    const ok = await swalConfirm(
      "¿Asignar preparación de venta?",
      `Se enviará la tarea a la cola del operario «${op.name}» para preparar esta venta en salida.`,
    );
    if (!ok) return;
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
        <span className={`text-base ${BODEGA_ZONE_STATUS_NUM_INACTIVE_CLASS}`}>0</span>
      </button>
    );
  }

  const hayTareasPendientesAlmacen = totalTareasPendientesAlmacen > 0;

  const ventaDetalleTitulo = detalle
    ? String(detalle.numero ?? "").trim() || detalle.id
    : "";
  const ventaDetalleSubtitulo = "Venta en curso: revisá líneas y asignaciones.";

  const listaModalTitulo = "Almacenamiento";
  const listaModalSubtitulo =
    "Tareas pendientes de almacenamiento, ventas en curso y órdenes a procesamiento.";
  const listaModalEncabezadoSup = "Tareas pendientes";
  const listaModalHeaderIcon = <MdPendingActions className="h-7 w-7 text-slate-800" aria-hidden />;

  const emeraldAccent = jefeModalAccentClass.emerald;

  const solicitudDetalleTitulo =
    detalleSolicitud != null
      ? String(detalleSolicitud.numero ?? "").trim() || detalleSolicitud.id
      : "";
  const solicitudDetalleSubtitulo =
    detalleSolicitud != null
      ? normalizeProcesamientoEstado(detalleSolicitud.estado) === "Iniciado"
        ? "Retiro en bodega: del mapa hacia procesamiento."
        : "Orden de procesamiento asociada a esta bodega."
      : "";

  const modalFooterListado = (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
      <button type="button" onClick={cerrarModal} className={jefeBtnGhost}>
        Cerrar
      </button>
    </div>
  );

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
          className={`text-base ${
            hayTareasPendientesAlmacen ? BODEGA_ZONE_STATUS_NUM_ACTIVE_CLASS : BODEGA_ZONE_STATUS_NUM_INACTIVE_CLASS
          }`}
        >
          {totalTareasPendientesAlmacen}
        </span>
      </button>

      {open && detalle ? (
        <JefeOrderModalShell
          id="venta-en-curso-detalle"
          title={ventaDetalleTitulo}
          description={ventaDetalleSubtitulo}
          accent="emerald"
          icon={<FiSend className="h-6 w-6" aria-hidden />}
          onClose={cerrarModal}
          contentMaxWidthClass="max-w-3xl"
          bodyMaxHeightClass="max-h-[min(88vh,820px)]"
          zIndexClass="z-[60]"
          headerStart={
            <button
              type="button"
              onClick={() => setDetalle(null)}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50"
              aria-label="Volver al listado"
            >
              <FiArrowLeft className="h-5 w-5" />
            </button>
          }
          footer={
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
              <button type="button" onClick={() => setDetalle(null)} className={jefeBtnGhost}>
                Volver al listado
              </button>
              <button type="button" onClick={cerrarModal} className={jefeBtnGhost}>
                Cerrar
              </button>
            </div>
          }
        >
          {error ? (
            <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          ) : null}

          <JefeModalField
            label="Estado"
            icon={<FiInfo className="h-4 w-4" aria-hidden />}
            hint="Cuenta, fechas y destino de la venta en esta bodega."
          >
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-emerald-100/90 bg-emerald-50/50 px-4 py-3 text-sm">
              <span
                className={`rounded-full px-2.5 py-0.5 text-base font-bold uppercase ${ordenCompraEstadoBadgeClass(detalle.estado)}`}
              >
                {detalle.estado}
              </span>
              <span className="text-slate-600">
                Cuenta:{" "}
                <strong className="text-slate-900">{clientLabelFromList(detalle.idCliente, clients)}</strong>
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
          </JefeModalField>

          <JefeModalField
            label="Productos"
            icon={<FiPackage className="h-4 w-4" aria-hidden />}
            hint="Líneas pedidas en esta venta."
          >
            {!detalle.lineItems?.length ? (
              <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                Esta venta no tiene líneas de producto cargadas.
              </p>
            ) : (
              <ul className="space-y-2">
                {detalle.lineItems.map((li, idx) => (
                  <li
                    key={`${li.catalogoProductId ?? "x"}-${idx}`}
                    className={`rounded-2xl border bg-linear-to-br from-white to-emerald-50/35 p-4 shadow-sm ${jefeNestedShellBorder.emerald}`}
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
          </JefeModalField>

          {esEstadoEnCurso(detalle.estado) && !ventaCajasYaEnSalida ? (
            <JefeModalField label="Salida a operario" icon={<FiSend className="h-4 w-4" aria-hidden />}>
              <div className={`rounded-2xl border bg-slate-50/90 px-4 py-3 ${jefeNestedShellBorder.emerald}`}>
                <p className="text-sm font-bold uppercase tracking-wide text-slate-700">
                  Tarea pendiente · salida a operario
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  Asigná quién debe llevar del <strong>almacenamiento</strong> a <strong>salida</strong> las cantidades
                  pedidas en esta venta.
                </p>
                {operariosBodega.length === 0 ? (
                  <p className="mt-2 text-xs text-amber-800">No hay operarios de bodega dados de alta en esta cuenta.</p>
                ) : tareaSalidaYaExiste ? (
                  <p className="mt-2 text-xs font-semibold text-emerald-900">
                    Esta venta ya tiene una tarea de salida en la cola del operario.
                  </p>
                ) : (
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
                    <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs text-slate-600">
                      <span className="font-semibold text-slate-700">Operario</span>
                      <select
                        value={operarioAsignarId}
                        onChange={(e) => setOperarioAsignarId(e.target.value)}
                        className={`rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 shadow-sm outline-none transition focus:ring-2 ${emeraldAccent.selectFocus}`}
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
                      onClick={() => void handleAsignarSalida()}
                      className={`shrink-0 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-md transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 disabled:cursor-not-allowed disabled:opacity-50 ${emeraldAccent.primary} ${emeraldAccent.primaryHover}`}
                    >
                      {asignarSaving ? "Asignando…" : "Asignar"}
                    </button>
                  </div>
                )}
              </div>
            </JefeModalField>
          ) : null}
        </JefeOrderModalShell>
      ) : null}

      {open && detalleSolicitud ? (
        <JefeOrderModalShell
          id="ventas-map-solicitud-proc-detalle"
          title={solicitudDetalleTitulo}
          description={solicitudDetalleSubtitulo}
          accent="emerald"
          icon={<FiSend className="h-6 w-6" aria-hidden />}
          onClose={cerrarModal}
          contentMaxWidthClass="max-w-3xl"
          bodyMaxHeightClass="max-h-[min(88vh,820px)]"
          zIndexClass="z-[60]"
          tituloClassName="font-mono"
          headerStart={
            <button
              type="button"
              onClick={() => setDetalleSolicitud(null)}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50"
              aria-label="Volver al listado"
            >
              <FiArrowLeft className="h-5 w-5" />
            </button>
          }
          footer={
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
              <button type="button" onClick={() => setDetalleSolicitud(null)} className={jefeBtnGhost}>
                Volver al listado
              </button>
              <button type="button" onClick={cerrarModal} className={jefeBtnGhost}>
                Cerrar
              </button>
            </div>
          }
        >
          {solicitudError ? (
            <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{solicitudError}</p>
          ) : null}

          <JefeModalField
            label="Estado"
            icon={<FiInfo className="h-4 w-4" aria-hidden />}
            hint="Estado de la orden y flujo en esta bodega."
          >
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-emerald-100/90 bg-emerald-50/50 px-4 py-3 text-sm">
              <span
                className={`rounded-full px-2.5 py-0.5 text-base font-bold uppercase ${procesamientoEstadoBadgeClass(detalleSolicitud.estado)}`}
              >
                {detalleSolicitud.estado}
              </span>
              <span className="text-slate-600">Almacenamiento → procesamiento.</span>
              {detalleSolicitud.fecha ? (
                <span className="text-slate-600">
                  Fecha: <strong className="text-slate-900">{detalleSolicitud.fecha}</strong>
                </span>
              ) : null}
            </div>
          </JefeModalField>

          <JefeModalField
            label={normalizeProcesamientoEstado(detalleSolicitud.estado) === "Iniciado" ? "Productos" : "Orden"}
            icon={
              normalizeProcesamientoEstado(detalleSolicitud.estado) === "Iniciado" ? (
                <FiPackage className="h-4 w-4" aria-hidden />
              ) : (
                <FiBox className="h-4 w-4" aria-hidden />
              )
            }
            hint={
              normalizeProcesamientoEstado(detalleSolicitud.estado) === "Iniciado"
                ? "Producto y cantidad a retirar del mapa hacia procesamiento."
                : "Datos registrados de la solicitud."
            }
          >
            <div
              className={`rounded-2xl border bg-linear-to-br from-white to-emerald-50/35 p-4 shadow-sm ${jefeNestedShellBorder.emerald}`}
            >
              <dl className="space-y-4 text-base">
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
                        return <BodegaDetalleModalFila label="Unidades en mapa" value={`${udsMapa} u.`} />;
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
                      value={textoPrecioSecundarioCatalogo(productosCatalogo, detalleSolicitud.productoSecundarioId)}
                    />
                    {detalleSolicitud.estimadoUnidadesSecundario !== undefined &&
                    detalleSolicitud.estimadoUnidadesSecundario !== null &&
                    Number.isFinite(Number(detalleSolicitud.estimadoUnidadesSecundario)) ? (
                      <>
                        <BodegaDetalleModalFila
                          label="Unidades secundario (estimado)"
                          value={estimadoUnidadesSecundarioTexto(Number(detalleSolicitud.estimadoUnidadesSecundario))}
                        />
                        {(() => {
                          const udsMapa = unidadesSecundarioEnterasParaMapa(
                            Number(detalleSolicitud.estimadoUnidadesSecundario),
                          );
                          if (udsMapa <= 0) return null;
                          return (
                            <BodegaDetalleModalFila label="Unidades en mapa (enteras)" value={`${udsMapa} u.`} />
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
          </JefeModalField>

          {normalizeProcesamientoEstado(detalleSolicitud.estado) === "Iniciado" ? (
            puedeAsignarSolicitud ? (
              <JefeModalField
                label="Retiro en bodega"
                icon={<FiSend className="h-4 w-4" aria-hidden />}
                hint="El operario retirará el primario del mapa hacia la zona de procesamiento."
              >
                <div className={`rounded-2xl border bg-slate-50/90 px-4 py-3 ${jefeNestedShellBorder.emerald}`}>
                  <p className="text-sm font-bold uppercase tracking-wide text-slate-700">
                    Tarea pendiente · retiro en bodega
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    Elegí operario y confirmá para mandar la tarea a su cola.
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
                          <p className="mt-2 rounded-md border border-amber-100 bg-amber-50 px-2.5 py-1.5 text-sm text-amber-900">
                            Sin operarios configurados.
                          </p>
                        ) : null}
                        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
                          {variosOperarios ? (
                            <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs text-slate-600">
                              <span className="font-semibold text-slate-700">Operario</span>
                              <select
                                id="ventas-map-proc-asignar-a"
                                aria-label="Operario"
                                className={`w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 shadow-sm outline-none transition focus:ring-2 ${emeraldAccent.selectFocus}`}
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
                            </label>
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
                              className={`shrink-0 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-md transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 disabled:cursor-not-allowed disabled:opacity-50 sm:min-w-[9.5rem] ${variosOperarios ? "" : "w-full"} ${emeraldAccent.primary} ${emeraldAccent.primaryHover}`}
                            >
                              {asignado ? "En cola / asignado" : "Asignar"}
                            </button>
                          ) : null}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </JefeModalField>
            ) : (
              <JefeModalEmptyHint>
                <>
                  Solo <strong className="font-semibold">jefe</strong> o{" "}
                  <strong className="font-semibold">administrador</strong> pueden asignar el operario que retira el
                  primario hacia procesamiento.
                </>
              </JefeModalEmptyHint>
            )
          ) : null}
        </JefeOrderModalShell>
      ) : null}

      <ModalPlantilla
        open={open && !detalle && !detalleSolicitud}
        onClose={cerrarModal}
        titulo={listaModalTitulo}
        tituloId="ventas-en-curso-map-title"
        headerIcon={listaModalHeaderIcon}
        encabezadoSup={listaModalEncabezadoSup}
        subtitulo={listaModalSubtitulo}
        maxWidthClass="max-w-3xl"
        cardMaxHeightClass="max-h-[90vh]"
        zIndexClass="z-[60]"
        footer={modalFooterListado}
      >
              {error ? (
                <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
              ) : null}

              {loading ? (
                <p className="text-sm text-slate-600">Cargando ventas…</p>
              ) : clientIds.length === 0 ? (
                <p className="text-sm text-slate-600">No hay clientes con este código de cuenta.</p>
              ) : (
                <div className="space-y-10">
                  <section className="min-w-0" aria-labelledby="ventas-ec-almacen-ventas">
                    <h3
                      id="ventas-ec-almacen-ventas"
                      className="app-title mb-2"
                    >
                      Ventas en curso
                    </h3>
                    {filas.length === 0 ? (
                      <div className="-mx-5 border-y border-slate-100 py-10 text-center text-base leading-relaxed text-slate-600 sm:-mx-6">
                        No hay <strong className="font-semibold text-slate-800">ventas</strong> en estado{" "}
                        <strong className="font-semibold text-slate-800">En curso</strong>.
                      </div>
                    ) : (
                      <ul className={BODEGA_SLOTS_GRID_ALMACEN_CLASS} role="list">
                        {filas.map((row, cardIdx) => {
                          const comprador = String(row.compradorNombre ?? "").trim() || "—";
                          const num = String(row.numero ?? "").trim() || row.id.slice(0, 8);
                          const tone = OCCUPIED_MAPA_TONE_PRIMARIO;
                          const estadoPill =
                            row.estado.length > 10 ? "En curso" : row.estado;
                          const subId = [num, row.fecha?.trim()].filter(Boolean).join(" · ");
                          return (
                            <li key={`${row.idCliente}::${row.id}`} className="min-w-0">
                              <button
                                type="button"
                                onClick={() => setDetalle(row)}
                                className={`${BODEGA_SLOT_SHELL_CLASS} relative flex w-full flex-col ${BODEGA_SLOT_ROUNDED} ${BODEGA_SLOT_SHELL_PADDING} transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 focus-visible:ring-offset-1 ${tone.shell}`}
                                aria-label={`Ver venta ${num}`}
                              >
                                <span
                                  className={`absolute left-2 top-2 z-10 text-xs leading-none ${tone.positionLabel}`}
                                >
                                  {cardIdx + 1}
                                </span>
                                <div className={BODEGA_SLOT_BODY_CLASS}>
                                  <div className={tone.inner}>
                                    <div className="flex min-h-0 min-w-0 flex-1 gap-2 overflow-hidden">
                                      <FiBox
                                        className={`mt-0.5 h-4 w-4 shrink-0 sm:h-[18px] sm:w-[18px] ${tone.icon}`}
                                        aria-hidden
                                      />
                                      <div className="min-w-0 flex-1">
                                        <div
                                          className={`truncate font-semibold leading-tight text-base ${tone.name}`}
                                          title={comprador}
                                        >
                                          {comprador}
                                        </div>
                                        <div
                                          className={`mt-0.5 truncate font-mono leading-tight text-base ${tone.id}`}
                                          title={subId}
                                        >
                                          {subId}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="mt-2 flex shrink-0 justify-center">
                                      <span
                                        className={`inline-block max-w-full truncate rounded-full px-2 py-0.5 text-base font-medium ${tone.pill}`}
                                      >
                                        {estadoPill}
                                      </span>
                                    </div>
                                  </div>
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
                      className="app-title mb-1"
                    >
                      Almacenamiento → procesamiento
                    </h3>
                    <p className="mb-3 text-base leading-relaxed text-slate-500">
                      Órdenes en <strong className="text-slate-700">Iniciado</strong>: retiro de primario hacia zona de
                      procesamiento.
                    </p>
                    {filasSoloIniciado.length === 0 ? (
                      <div className="-mx-5 border-y border-slate-100 py-10 text-center text-base leading-relaxed text-slate-600 sm:-mx-6">
                        Ninguna orden en <strong className="font-semibold text-slate-800">Iniciado</strong>.
                      </div>
                    ) : (
                      <ul
                        className={BODEGA_SLOTS_GRID_ALMACEN_CLASS}
                        role="list"
                        aria-label="Órdenes de almacenamiento hacia procesamiento"
                      >
                        {filasSoloIniciado.map((row, cardIdx) => (
                          <li key={`${row.clientId}::${row.id}`} className="min-w-0">
                            <TarjetaOrdenProcesamientoSlotInner
                              row={row}
                              cornerLabel={cardIdx + 1}
                              onSelect={(r) => {
                                setSolicitudError(null);
                                setDetalleSolicitud(r);
                              }}
                            />
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                </div>
              )}
      </ModalPlantilla>
    </>
  );
}
