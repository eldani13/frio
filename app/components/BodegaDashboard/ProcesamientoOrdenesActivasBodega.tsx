"use client";

import React from "react";
import { HiOutlineChevronDown, HiOutlineXMark } from "react-icons/hi2";
import { FiBox, FiCpu } from "react-icons/fi";
import { MdPendingActions } from "react-icons/md";
import type { Client, Role, Slot } from "@/app/interfaces/bodega";
import { SolicitudProcesamientoService } from "@/app/services/solicitudProcesamientoService";
import type { SolicitudProcesamiento } from "@/app/types/solicitudProcesamiento";
import { deductSlotsAfterProcesamientoTerminado } from "@/lib/procesamientoInventarioBodega";
import {
  PROCESAMIENTO_ESTADOS,
  procesamientoEstadoBadgeClass,
  normalizeProcesamientoEstado,
} from "@/app/types/solicitudProcesamiento";

function opcionesEstadoSelect(estadoActual: string): string[] {
  const cur = estadoActual.trim();
  if (cur && !PROCESAMIENTO_ESTADOS.some((x) => x === cur)) {
    return [cur, ...PROCESAMIENTO_ESTADOS];
  }
  return [...PROCESAMIENTO_ESTADOS];
}

/** Solo el responsable asignado (operario o procesador) puede elegir «En curso» desde «Iniciado». */
function opcionesEstadoParaSesion(row: SolicitudProcesamiento, sessionUid?: string): string[] {
  const base = opcionesEstadoSelect(row.estado);
  const cur = normalizeProcesamientoEstado(row.estado);
  if (cur !== "Iniciado") return base;
  const op = String(row.operarioBodegaUid ?? "").trim();
  const uid = String(sessionUid ?? "").trim();
  if (!op || uid !== op) return base.filter((o) => o !== "En curso");
  return base;
}

function formatCantidad(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return Math.round(n).toLocaleString("es-CO", { maximumFractionDigits: 0 });
}

function esActivaEnBodega(row: SolicitudProcesamiento): boolean {
  const e = normalizeProcesamientoEstado(row.estado);
  return e === "Iniciado" || e === "En curso";
}

function UnidadEtiqueta(row: SolicitudProcesamiento): string {
  if (row.unidadPrimarioVisualizacion === "peso") return "Peso";
  if (row.unidadPrimarioVisualizacion === "cantidad") return "Cantidad";
  return "—";
}

function puedeGestionarAsignaciones(role?: Role): boolean {
  return role === "jefe" || role === "administrador";
}

function TarjetaOrdenProcesamientoCarrusel({
  row,
  anchoMedido,
  onSelect,
}: {
  row: SolicitudProcesamiento;
  anchoMedido: number | null;
  onSelect: (row: SolicitudProcesamiento) => void;
}) {
  /** Misma huella visual que `SlotCard` ocupado: el carrusel reserva ancho y centra la caja (~140px). */
  const anchoCelda =
    anchoMedido !== null ? { width: anchoMedido, minWidth: anchoMedido } : { minWidth: 260 };
  return (
    <div
      className="flex shrink-0 snap-start items-start justify-center py-1"
      style={anchoCelda}
    >
      <button
        type="button"
        onClick={() => onSelect(row)}
        className="relative flex w-full max-w-[140px] flex-col items-center justify-center rounded-3xl border border-slate-300 bg-cyan-100 p-2 text-slate-900 transition hover:ring-2 hover:ring-cyan-400 sm:p-4"
        style={{ minHeight: 90, maxWidth: 140, width: "100%" }}
      >
        <span className="absolute left-1 top-1 rounded-full px-1 py-0.5 text-[9px] font-semibold text-slate-600">
          {row.numero}
        </span>
        <div className="mb-1">
          <FiBox className="h-4 w-4 text-cyan-400 sm:h-6 sm:w-6" aria-hidden />
        </div>
        <div className="w-full truncate text-center text-[clamp(0.65rem,1vw,0.85rem)] font-semibold">
          {row.productoPrimarioTitulo?.trim() || "—"}
        </div>
        <div className="mt-1 w-full truncate text-center text-[clamp(0.7rem,1.5vw,0.85rem)]">
          {row.productoSecundarioTitulo?.trim() || row.clientName?.trim() || row.clientId || "—"}
        </div>
        <div className="mt-2 inline-block max-w-full truncate rounded-full bg-cyan-200 px-1.5 py-0.5 text-[clamp(0.7rem,1.5vw,0.85rem)] font-medium sm:px-3">
          {row.estado}
        </div>
      </button>
    </div>
  );
}

/**
 * Órdenes de procesamiento para la bodega interna actual: solo **Iniciado** y **En curso**.
 * `layout="cards"`: cuadrícula de tarjetas (vista mapa / jefe). `layout="table"`: tabla compacta.
 */
export function ProcesamientoOrdenesActivasBodega({
  clients,
  warehouseCodeCuenta,
  warehouseId = "",
  slots = [],
  variant = "default",
  layout = "table",
  sessionUid,
  sessionRole,
  operariosBodega = [],
  procesadoresBodega = [],
  tareasProcesamientoOperario = [],
  onPushTareaProcesamientoOperario,
  onProcesamientoTerminadoInventario,
}: {
  clients: Client[];
  warehouseCodeCuenta: string;
  /** Id de bodega interna (`warehouses`); para descontar kg del primario al pasar a **En curso**. */
  warehouseId?: string;
  slots?: Slot[];
  variant?: "default" | "compact";
  layout?: "table" | "cards";
  sessionUid?: string;
  sessionRole?: Role;
  operariosBodega?: Array<{ id: string; name: string; roleLabel?: string }>;
  /** Reasignación en Firestore y cola local al pasar de «Iniciado» a «En curso» (primer procesador de la bodega). */
  procesadoresBodega?: Array<{ id: string; name: string }>;
  tareasProcesamientoOperario?: Array<Record<string, unknown>>;
  onPushTareaProcesamientoOperario?: (tarea: Record<string, unknown>) => void;
  onProcesamientoTerminadoInventario?: (
    nextSlots: Slot[],
    meta: {
      row: SolicitudProcesamiento;
      deductedKg: number;
      warning?: string;
      /** Si false, no se quita la tarea de la cola (solo se actualiza fase al pasar a En curso). */
      quitarTareaDeCola?: boolean;
    },
  ) => void | Promise<void>;
}) {
  const [rows, setRows] = React.useState<SolicitudProcesamiento[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [savingId, setSavingId] = React.useState<string | null>(null);
  const [detalle, setDetalle] = React.useState<SolicitudProcesamiento | null>(null);
  const [modalBusy, setModalBusy] = React.useState(false);
  const [asignadoUid, setAsignadoUid] = React.useState("");

  React.useEffect(() => {
    if (operariosBodega.length === 0) {
      setAsignadoUid("");
      return;
    }
    setAsignadoUid((prev) =>
      prev && operariosBodega.some((o) => o.id === prev) ? prev : operariosBodega[0].id,
    );
  }, [operariosBodega]);

  const responsableSeleccionado =
    operariosBodega.find((o) => o.id === asignadoUid) ?? operariosBodega[0] ?? null;

  const clientIds = React.useMemo(() => {
    const code = String(warehouseCodeCuenta ?? "").trim();
    if (!code) return [];
    return clients
      .filter((c) => !c.disabled && String(c.code ?? "").trim() === code)
      .map((c) => c.id.trim())
      .filter(Boolean);
  }, [clients, warehouseCodeCuenta]);

  const codeOk = Boolean(String(warehouseCodeCuenta ?? "").trim());

  React.useEffect(() => {
    setError(null);
    return SolicitudProcesamientoService.subscribeParaBodegaInterna(
      clientIds,
      warehouseCodeCuenta,
      setRows,
      () => setError("No se pudieron cargar las solicitudes de procesamiento."),
    );
  }, [clientIds, warehouseCodeCuenta]);

  const filasActivas = React.useMemo(() => rows.filter(esActivaEnBodega), [rows]);
  const filasSoloIniciado = React.useMemo(
    () => filasActivas.filter((r) => normalizeProcesamientoEstado(r.estado) === "Iniciado"),
    [filasActivas],
  );
  /** Carrusel principal (vista mapa): solo **En curso** — Iniciado va al modal de tareas pendientes. */
  const filasCarruselPrincipal = React.useMemo(
    () => filasActivas.filter((r) => normalizeProcesamientoEstado(r.estado) === "En curso"),
    [filasActivas],
  );
  const cantidadPendientesIniciado = filasSoloIniciado.length;
  const [modalPendientesIniciadoAbierto, setModalPendientesIniciadoAbierto] = React.useState(false);
  const puedeAsignar = puedeGestionarAsignaciones(sessionRole);

  /** Ancho de cada tarjeta en vista carrusel (máx. 3 visibles a la vez). */
  const [anchoTarjetaCarrusel, setAnchoTarjetaCarrusel] = React.useState<number | null>(null);
  const refCarruselProcesamiento = React.useRef<HTMLDivElement>(null);
  const [anchoTarjetaModalIniciado, setAnchoTarjetaModalIniciado] = React.useState<number | null>(null);
  const refCarruselModalIniciado = React.useRef<HTMLDivElement>(null);

  React.useLayoutEffect(() => {
    if (layout !== "cards") return;
    const el = refCarruselProcesamiento.current;
    if (!el) return;
    const gapPx = 12;
    const medir = () => {
      const w = el.clientWidth;
      if (w <= 0) return;
      setAnchoTarjetaCarrusel(Math.max(200, Math.floor((w - 2 * gapPx) / 3)));
    };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, [layout, warehouseCodeCuenta, filasCarruselPrincipal.length, codeOk, clientIds.length]);

  React.useLayoutEffect(() => {
    if (layout !== "cards" || !modalPendientesIniciadoAbierto) return;
    const el = refCarruselModalIniciado.current;
    if (!el) return;
    const gapPx = 12;
    const medir = () => {
      const w = el.clientWidth;
      if (w <= 0) return;
      setAnchoTarjetaModalIniciado(Math.max(200, Math.floor((w - 2 * gapPx) / 3)));
    };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, [layout, modalPendientesIniciadoAbierto, filasSoloIniciado.length, codeOk, clientIds.length]);

  React.useEffect(() => {
    if (!modalPendientesIniciadoAbierto) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModalPendientesIniciadoAbierto(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modalPendientesIniciadoAbierto]);

  React.useEffect(() => {
    setDetalle((d) => {
      if (!d) return d;
      const found = rows.find((r) => r.clientId === d.clientId && r.id === d.id);
      if (!found) return null;
      return found === d ? d : found;
    });
  }, [rows]);

  const handleEstado = async (row: SolicitudProcesamiento, next: string) => {
    const nextNorm = normalizeProcesamientoEstado(next);
    if (nextNorm === row.estado) return;
    const prevNorm = normalizeProcesamientoEstado(row.estado);
    const key = `${row.clientId}::${row.id}`;
    setError(null);
    setSavingId(key);
    const prev = row.estado;
    setRows((list) =>
      list.map((r) => (r.clientId === row.clientId && r.id === row.id ? { ...r, estado: nextNorm } : r)),
    );
    setDetalle((d) => (d && d.clientId === row.clientId && d.id === row.id ? { ...d, estado: nextNorm } : d));
    try {
      await SolicitudProcesamientoService.actualizarEstado(row.clientId, row.id, nextNorm);
      if (nextNorm === "En curso" && prevNorm === "Iniciado") {
        const proc = procesadoresBodega[0];
        if (proc) {
          await SolicitudProcesamientoService.asignarOperarioBodega(row.clientId, row.id, {
            operarioUid: proc.id,
            operarioNombre: proc.name,
          });
          setRows((list) =>
            list.map((r) =>
              r.clientId === row.clientId && r.id === row.id
                ? { ...r, operarioBodegaUid: proc.id, operarioBodegaNombre: proc.name }
                : r,
            ),
          );
          setDetalle((d) =>
            d && d.clientId === row.clientId && d.id === row.id
              ? { ...d, operarioBodegaUid: proc.id, operarioBodegaNombre: proc.name }
              : d,
          );
          onPushTareaProcesamientoOperario?.({
            tipo: "procesamiento",
            clientId: row.clientId,
            solicitudId: row.id,
            numero: row.numero,
            clientName: row.clientName,
            codeCuenta: row.codeCuenta,
            warehouseId: row.warehouseId,
            productoPrimarioId: row.productoPrimarioId,
            productoPrimarioTitulo: row.productoPrimarioTitulo,
            productoSecundarioId: row.productoSecundarioId,
            productoSecundarioTitulo: row.productoSecundarioTitulo,
            cantidadPrimario: row.cantidadPrimario,
            unidadPrimarioVisualizacion: row.unidadPrimarioVisualizacion,
            estimadoUnidadesSecundario: row.estimadoUnidadesSecundario,
            operarioUid: proc.id,
            operarioNombre: proc.name,
            faseCola: "en_curso",
          });
        }
      }
      if (
        nextNorm === "En curso" &&
        prevNorm === "Iniciado" &&
        warehouseId.trim() &&
        onProcesamientoTerminadoInventario
      ) {
        const r = deductSlotsAfterProcesamientoTerminado(slots, row, warehouseId);
        await onProcesamientoTerminadoInventario(r.slots, {
          row,
          deductedKg: r.deductedKg,
          warning: r.warning,
          quitarTareaDeCola: false,
        });
      }
      if (nextNorm === "Terminado" && prevNorm === "En curso" && onProcesamientoTerminadoInventario) {
        await onProcesamientoTerminadoInventario(slots, {
          row,
          deductedKg: 0,
          quitarTareaDeCola: true,
        });
      }
    } catch (e) {
      setRows((list) =>
        list.map((r) => (r.clientId === row.clientId && r.id === row.id ? { ...r, estado: prev } : r)),
      );
      setDetalle((d) => (d && d.clientId === row.clientId && d.id === row.id ? { ...d, estado: prev } : d));
      const code = e instanceof Error ? e.message : "";
      if (code === "solo_operario_asignado") {
        setError("Solo el responsable asignado (operario o procesador) puede pasar la orden a «En curso».");
      } else if (code === "sin_operario_asignado") {
        setError("Asigná un responsable en bodega antes de pasar a «En curso».");
      } else {
        setError("No se pudo actualizar el estado.");
      }
    } finally {
      setSavingId(null);
    }
  };

  const asignarOperario = async () => {
    if (!detalle || !responsableSeleccionado || !onPushTareaProcesamientoOperario) return;
    setModalBusy(true);
    setError(null);
    try {
      await SolicitudProcesamientoService.asignarOperarioBodega(detalle.clientId, detalle.id, {
        operarioUid: responsableSeleccionado.id,
        operarioNombre: responsableSeleccionado.name,
      });
      setRows((list) =>
        list.map((r) =>
          r.clientId === detalle.clientId && r.id === detalle.id
            ? {
                ...r,
                operarioBodegaUid: responsableSeleccionado.id,
                operarioBodegaNombre: responsableSeleccionado.name,
              }
            : r,
        ),
      );
      setDetalle((d) =>
        d && d.clientId === detalle.clientId && d.id === detalle.id
          ? {
              ...d,
              operarioBodegaUid: responsableSeleccionado.id,
              operarioBodegaNombre: responsableSeleccionado.name,
            }
          : d,
      );
      onPushTareaProcesamientoOperario({
        tipo: "procesamiento",
        clientId: detalle.clientId,
        solicitudId: detalle.id,
        numero: detalle.numero,
        clientName: detalle.clientName,
        codeCuenta: detalle.codeCuenta,
        warehouseId: detalle.warehouseId,
        productoPrimarioId: detalle.productoPrimarioId,
        productoPrimarioTitulo: detalle.productoPrimarioTitulo,
        productoSecundarioId: detalle.productoSecundarioId,
        productoSecundarioTitulo: detalle.productoSecundarioTitulo,
        cantidadPrimario: detalle.cantidadPrimario,
        unidadPrimarioVisualizacion: detalle.unidadPrimarioVisualizacion,
        estimadoUnidadesSecundario: detalle.estimadoUnidadesSecundario,
        operarioUid: responsableSeleccionado.id,
        operarioNombre: responsableSeleccionado.name,
        faseCola: "asignado",
      });
    } catch {
      setError("No se pudo asignar el operario.");
    } finally {
      setModalBusy(false);
    }
  };

  const pad = variant === "compact" && layout === "table" ? "p-0" : layout === "cards" ? "p-0" : "p-1";

  const alerts = (
    <>
      {!codeOk ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Esta bodega no tiene <strong>codeCuenta</strong> asignado: no se puede cruzar con las cuentas. Configurá la
          bodega en el panel del configurador.
        </p>
      ) : clientIds.length === 0 ? (
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
          No hay clientes activos con código <span className="font-mono font-semibold">{warehouseCodeCuenta}</span>.
        </p>
      ) : error ? (
        <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}
    </>
  );

  const estadoSelect = (row: SolicitudProcesamiento, key: string, className: string) => (
    <div className={`relative inline-flex w-full max-w-full align-middle ${className}`}>
      <select
        aria-label={`Estado ${row.numero}`}
        value={row.estado}
        disabled={savingId === key}
        onChange={(e) => void handleEstado(row, e.target.value)}
        className={`w-full cursor-pointer truncate rounded-lg border border-slate-200/80 bg-white py-1.5 pl-2 pr-7 text-left text-[11px] font-semibold shadow-sm outline-none ring-0 focus-visible:ring-2 focus-visible:ring-sky-400/50 [appearance:none] disabled:opacity-60 ${procesamientoEstadoBadgeClass(row.estado)}`}
      >
        {opcionesEstadoParaSesion(row, sessionUid).map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      <span
        className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-500 opacity-70"
        aria-hidden
      >
        <HiOutlineChevronDown className="h-3.5 w-3.5" strokeWidth={2.25} />
      </span>
    </div>
  );

  const btnAsignarOperarioClass =
    "flex w-full items-center justify-center gap-2 rounded-lg bg-linear-to-r from-blue-600 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-all duration-150 hover:from-blue-700 hover:to-cyan-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 active:scale-95";

  const detalleModal =
    detalle && layout === "cards" ? (
      <div
        className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/45 p-3 sm:items-center"
        role="dialog"
        aria-modal="true"
        aria-labelledby="proc-bodega-detalle-titulo"
      >
        <button
          type="button"
          className="absolute inset-0 cursor-default"
          aria-label="Cerrar"
          onClick={() => setDetalle(null)}
        />
        <div className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-xl sm:p-6">
          <div className="flex items-start justify-between gap-2">
            <h2 id="proc-bodega-detalle-titulo" className="font-mono text-lg font-bold text-slate-900">
              {detalle.numero}
            </h2>
            <span
              className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${procesamientoEstadoBadgeClass(detalle.estado)}`}
            >
              {detalle.estado}
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-600">
            <span className="font-semibold text-slate-800">Cuenta:</span>{" "}
            {detalle.clientName?.trim() || detalle.clientId}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Code cuenta: <span className="font-mono">{detalle.codeCuenta || "—"}</span>
            {detalle.warehouseId ? (
              <>
                {" "}
                · Bodega dest. id: <span className="font-mono">{detalle.warehouseId}</span>
              </>
            ) : null}
          </p>

          <p className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-500">Primario</p>
          <p className="mt-1 text-sm font-medium text-slate-900">{detalle.productoPrimarioTitulo}</p>
          <p className="mt-1 text-sm tabular-nums text-slate-700">
            Cantidad: {formatCantidad(detalle.cantidadPrimario)} · {UnidadEtiqueta(detalle)}
          </p>

          <p className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-500">Secundario</p>
          <p className="mt-1 text-sm font-medium text-slate-900">{detalle.productoSecundarioTitulo}</p>
          {detalle.estimadoUnidadesSecundario !== undefined &&
          detalle.estimadoUnidadesSecundario !== null &&
          Number.isFinite(detalle.estimadoUnidadesSecundario) ? (
            <p className="mt-1 text-sm text-slate-700">
              Estimado unidades:{" "}
              <span className="font-semibold tabular-nums">
                {formatCantidad(detalle.estimadoUnidadesSecundario)}
              </span>
            </p>
          ) : null}

          <p className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-500">Trazabilidad</p>
          <p className="mt-1 text-xs text-slate-600">
            Creado por: {detalle.creadoPorNombre || "—"} · Fecha solicitud: {detalle.fecha || "—"}
          </p>
          <p className="mt-2 text-xs text-slate-600">
            Responsable en bodega:{" "}
            <span className="font-medium text-slate-800">
              {detalle.operarioBodegaNombre?.trim() || detalle.operarioBodegaUid || "Sin asignar"}
            </span>
          </p>
          {puedeAsignar ? (
            <div className="mt-5 space-y-3 border-t border-slate-100 pt-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Asignar responsable</p>
              <p className="text-[11px] text-slate-500">
                Elegí operario u operador de bodega: la orden pasa a su cola para el movimiento en mapa; solo esa
                persona puede llevarla de «Iniciado» a «En curso». El procesador se asigna después desde el botón
                Procesamiento del jefe.
              </p>
              {(() => {
                const yaFs = Boolean(String(detalle.operarioBodegaUid ?? "").trim());
                const yaCola = tareasProcesamientoOperario.some(
                  (t) =>
                    String(t.clientId ?? "") === detalle.clientId && String(t.solicitudId ?? "") === detalle.id,
                );
                const asignado = yaFs || yaCola;
                const iniciado = normalizeProcesamientoEstado(detalle.estado) === "Iniciado";
                const puedePulsar =
                  Boolean(responsableSeleccionado) &&
                  iniciado &&
                  !asignado &&
                  !modalBusy &&
                  Boolean(onPushTareaProcesamientoOperario);
                return (
                  <>
                    {operariosBodega.length > 0 ? (
                      <div className="space-y-2">
                        <label className="block text-[11px] font-semibold text-slate-600" htmlFor="proc-asignar-a">
                          Asignar a
                        </label>
                        <select
                          id="proc-asignar-a"
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
                          value={asignadoUid}
                          onChange={(e) => setAsignadoUid(e.target.value)}
                          disabled={asignado || modalBusy}
                        >
                          {operariosBodega.map((o) => (
                            <option key={o.id} value={o.id}>
                              {(o.name || "Sin nombre").trim()}
                              {o.roleLabel ? ` · ${o.roleLabel}` : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <p className="rounded-lg border border-amber-100 bg-amber-50/90 px-3 py-2 text-[11px] text-amber-900">
                        No hay usuarios con rol <strong>operario</strong> u <strong>operador</strong> (bodega) activos.
                        Creá uno en Configuración.
                      </p>
                    )}
                    <button
                      type="button"
                      title={
                        asignado
                          ? "Ya asignado"
                          : !responsableSeleccionado
                            ? "Sin responsable en el sistema"
                            : !iniciado
                              ? "Solo en estado Iniciado"
                              : "Enviar a la cola del responsable"
                      }
                      disabled={!puedePulsar}
                      onMouseDown={(e) => {
                        if (puedePulsar) e.currentTarget.classList.add("scale-90");
                      }}
                      onMouseUp={(e) => e.currentTarget.classList.remove("scale-90")}
                      onClick={() => void asignarOperario()}
                      className={`${btnAsignarOperarioClass} disabled:opacity-60`}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 text-white opacity-90"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        aria-hidden
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                      <span>{asignado ? "Asignado" : "Asignar ahora"}</span>
                    </button>
                  </>
                );
              })()}
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => setDetalle(null)}
            className="mt-6 w-full rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
          >
            Cerrar
          </button>
        </div>
      </div>
    ) : null;

  const modalPendientesIniciado =
    layout === "cards" && modalPendientesIniciadoAbierto ? (
      <div
        className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 p-3 sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-pendientes-iniciado-titulo"
      >
        <button
          type="button"
          className="absolute inset-0 cursor-default"
          aria-label="Cerrar"
          onClick={() => setModalPendientesIniciadoAbierto(false)}
        />
        <div className="relative z-10 flex max-h-[min(90vh,720px)] w-full max-w-4xl flex-col rounded-3xl border border-sky-200/90 bg-white shadow-2xl shadow-sky-900/10 overflow-hidden">
          <div className="shrink-0 border-b border-sky-100 bg-gradient-to-r from-sky-50 via-white to-cyan-50/80 px-5 py-4 sm:px-6 sm:py-5">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700 shadow-inner">
                <MdPendingActions className="h-6 w-6" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <h2
                  id="modal-pendientes-iniciado-titulo"
                  className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl"
                >
                  Tareas pendientes
                </h2>
                <p className="mt-0.5 text-sm text-slate-600">
                  Solo órdenes en estado <span className="font-semibold text-sky-800">Iniciado</span>
                  {cantidadPendientesIniciado > 0 ? (
                    <span className="tabular-nums">
                      {" "}
                      · {cantidadPendientesIniciado} orden{cantidadPendientesIniciado === 1 ? "" : "es"}
                    </span>
                  ) : null}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  Deslizá horizontalmente para ver más (hasta 3 tarjetas visibles a la vez).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalPendientesIniciadoAbierto(false)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                aria-label="Cerrar"
              >
                <HiOutlineXMark className="h-6 w-6" strokeWidth={2} />
              </button>
            </div>
          </div>
          <div className="min-h-0 flex-1 bg-white px-4 py-4 sm:px-6 sm:py-5">
            {filasSoloIniciado.length === 0 ? (
              <div className="flex min-h-[200px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-12 text-center text-sm text-slate-500">
                No hay órdenes en estado Iniciado en este momento.
              </div>
            ) : (
              <div
                ref={refCarruselModalIniciado}
                className="w-full snap-x snap-mandatory overflow-x-auto px-2 py-3 pb-2 [-webkit-overflow-scrolling:touch] scroll-smooth [scrollbar-width:thin] sm:px-3"
                role="region"
                aria-label="Órdenes en Iniciado"
              >
                <div className="flex w-max min-w-full flex-nowrap gap-2 sm:gap-4">
                  {filasSoloIniciado.map((row) => (
                    <TarjetaOrdenProcesamientoCarrusel
                      key={`${row.clientId}::${row.id}`}
                      row={row}
                      anchoMedido={anchoTarjetaModalIniciado}
                      onSelect={(r) => {
                        setError(null);
                        setModalPendientesIniciadoAbierto(false);
                        setDetalle(r);
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    ) : null;

  if (layout === "cards") {
    return (
      <div className={pad}>
        <div className="mb-3 flex flex-wrap items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700 shadow-sm">
            <FiCpu className="h-[18px] w-[18px]" strokeWidth={2} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold tracking-tight text-slate-900">Procesamiento</h3>
          </div>
          <button
            type="button"
            aria-label={`Abrir tareas pendientes en Iniciado (${cantidadPendientesIniciado})`}
            title={`Ver en un panel las ${cantidadPendientesIniciado} orden${cantidadPendientesIniciado === 1 ? "" : "es"} en Iniciado`}
            onClick={() => setModalPendientesIniciadoAbierto(true)}
            className="relative flex h-9 shrink-0 items-center justify-center rounded-xl border border-sky-200/90 bg-white px-1.5 text-sky-700 shadow-sm transition-colors hover:border-sky-300 hover:bg-sky-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/80"
          >
            <MdPendingActions className="h-[20px] w-[20px] shrink-0" aria-hidden />
            <span
              className="ml-0.5 min-w-[1.125rem] rounded-md bg-sky-100 px-1 py-0.5 text-center text-[11px] font-bold tabular-nums leading-none text-sky-900"
              aria-hidden
            >
              {cantidadPendientesIniciado}
            </span>
          </button>
        </div>
        <div className="mb-3 space-y-2">{alerts}</div>
        {codeOk && clientIds.length > 0 ? (
          <div
            ref={refCarruselProcesamiento}
            className="w-full snap-x snap-mandatory overflow-x-auto px-2 py-3 pb-2 [-webkit-overflow-scrolling:touch] scroll-smooth [scrollbar-width:thin] sm:px-3"
            role="region"
            aria-label="Órdenes en curso"
          >
            <div className="flex w-max min-w-full flex-nowrap gap-2 sm:gap-4">
              {filasCarruselPrincipal.length === 0 ? (
                <div className="w-full min-w-full shrink-0 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-3 py-10 text-center text-sm text-slate-500">
                  {filasActivas.length === 0 ? (
                    "No hay órdenes pendientes de procesamiento."
                  ) : (
                    <>
                      No hay órdenes <strong className="text-slate-700">En curso</strong>.
                    </>
                  )}
                </div>
              ) : (
                filasCarruselPrincipal.map((row) => (
                  <TarjetaOrdenProcesamientoCarrusel
                    key={`${row.clientId}::${row.id}`}
                    row={row}
                    anchoMedido={anchoTarjetaCarrusel}
                    onSelect={(r) => {
                      setError(null);
                      setDetalle(r);
                    }}
                  />
                ))
              )}
            </div>
          </div>
        ) : null}
        {modalPendientesIniciado}
        {detalleModal}
      </div>
    );
  }

  return (
    <div className={pad}>
      <p className="mb-3 text-xs leading-relaxed text-slate-600">
        Solo se listan pedidos en estado <strong>Iniciado</strong> o <strong>En curso</strong>. Las órdenes en{" "}
        <strong>Terminado</strong> no aparecen aquí. Al pasar a <strong>En curso</strong> se descuenta el primario en
        el mapa de bodega (material ya en zona de procesamiento). «En curso» solo lo puede elegir quien tenga la orden
        asignada desde <strong>Iniciado</strong>.
      </p>
      {alerts}
      {codeOk && clientIds.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="max-h-[min(50vh,360px)] overflow-x-auto overflow-y-auto sm:max-h-[min(55vh,420px)]">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="whitespace-nowrap px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Orden
                  </th>
                  <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">Cuenta</th>
                  <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">Primario</th>
                  <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">Secundario</th>
                  <th className="whitespace-nowrap px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Cant.
                  </th>
                  <th className="whitespace-nowrap px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Estim.
                  </th>
                  <th className="whitespace-nowrap px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Unidad
                  </th>
                  <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">Estado</th>
                  <th className="whitespace-nowrap px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Fecha
                  </th>
                </tr>
              </thead>
              <tbody>
                {filasActivas.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-8 text-center text-slate-500">
                      No hay órdenes en Iniciado ni En curso para esta bodega.
                    </td>
                  </tr>
                ) : (
                  filasActivas.map((row) => {
                    const key = `${row.clientId}::${row.id}`;
                    return (
                      <tr key={key} className="border-b border-slate-100">
                        <td className="whitespace-nowrap px-3 py-2 font-mono text-[12px] font-semibold text-slate-900">
                          {row.numero}
                        </td>
                        <td className="max-w-[120px] px-3 py-2 text-slate-800">
                          <span className="line-clamp-2 text-[12px]" title={row.clientName}>
                            {row.clientName || row.clientId}
                          </span>
                        </td>
                        <td className="max-w-[120px] px-3 py-2 text-slate-800">
                          <span className="line-clamp-2 text-[12px]">{row.productoPrimarioTitulo}</span>
                        </td>
                        <td className="max-w-[120px] px-3 py-2 text-slate-800">
                          <span className="line-clamp-2 text-[12px]">{row.productoSecundarioTitulo}</span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 tabular-nums text-slate-900">
                          {formatCantidad(row.cantidadPrimario)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 tabular-nums text-slate-800">
                          {row.estimadoUnidadesSecundario !== undefined &&
                          row.estimadoUnidadesSecundario !== null &&
                          Number.isFinite(row.estimadoUnidadesSecundario)
                            ? formatCantidad(row.estimadoUnidadesSecundario)
                            : "—"}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-slate-600">{UnidadEtiqueta(row)}</td>
                        <td className="px-3 py-2">{estadoSelect(row, key, "")}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-slate-600">{row.fecha || "—"}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
