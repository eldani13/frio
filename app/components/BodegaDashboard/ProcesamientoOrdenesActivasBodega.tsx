"use client";

import React from "react";
import { HiOutlineChevronDown } from "react-icons/hi2";
import { FiCpu } from "react-icons/fi";
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

/** Solo el operario asignado puede elegir «En curso» desde «Iniciado». */
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
  return Number.isInteger(n) ? String(n) : n.toLocaleString("es-CO", { maximumFractionDigits: 4 });
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
  tareasProcesamientoOperario = [],
  onPushTareaProcesamientoOperario,
  onProcesamientoTerminadoInventario,
}: {
  clients: Client[];
  warehouseCodeCuenta: string;
  /** Id de bodega interna (`warehouses`); para descontar kg al pasar a Terminado. */
  warehouseId?: string;
  slots?: Slot[];
  variant?: "default" | "compact";
  layout?: "table" | "cards";
  sessionUid?: string;
  sessionRole?: Role;
  operariosBodega?: Array<{ id: string; name: string }>;
  tareasProcesamientoOperario?: Array<Record<string, unknown>>;
  onPushTareaProcesamientoOperario?: (tarea: Record<string, unknown>) => void;
  onProcesamientoTerminadoInventario?: (
    nextSlots: Slot[],
    meta: { row: SolicitudProcesamiento; deductedKg: number; warning?: string },
  ) => void | Promise<void>;
}) {
  const [rows, setRows] = React.useState<SolicitudProcesamiento[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [savingId, setSavingId] = React.useState<string | null>(null);
  const [detalle, setDetalle] = React.useState<SolicitudProcesamiento | null>(null);
  const [modalBusy, setModalBusy] = React.useState(false);

  /** Un solo operario de bodega: se asigna a él directamente (sin selector). */
  const operarioUnico = operariosBodega[0] ?? null;

  const clientIds = React.useMemo(() => {
    const code = String(warehouseCodeCuenta ?? "").trim();
    if (!code) return [];
    return clients
      .filter((c) => !c.disabled && String(c.code ?? "").trim() === code)
      .map((c) => c.id.trim())
      .filter(Boolean);
  }, [clients, warehouseCodeCuenta]);

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
  const puedeAsignar = puedeGestionarAsignaciones(sessionRole);

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
      if (
        nextNorm === "Terminado" &&
        prevNorm === "En curso" &&
        warehouseId.trim() &&
        onProcesamientoTerminadoInventario
      ) {
        const r = deductSlotsAfterProcesamientoTerminado(slots, row, warehouseId);
        await onProcesamientoTerminadoInventario(r.slots, {
          row,
          deductedKg: r.deductedKg,
          warning: r.warning,
        });
      }
    } catch (e) {
      setRows((list) =>
        list.map((r) => (r.clientId === row.clientId && r.id === row.id ? { ...r, estado: prev } : r)),
      );
      setDetalle((d) => (d && d.clientId === row.clientId && d.id === row.id ? { ...d, estado: prev } : d));
      const code = e instanceof Error ? e.message : "";
      if (code === "solo_operario_asignado") {
        setError("Solo el operario asignado puede pasar la orden a «En curso».");
      } else if (code === "sin_operario_asignado") {
        setError("Asigná un operario antes de pasar a «En curso».");
      } else {
        setError("No se pudo actualizar el estado.");
      }
    } finally {
      setSavingId(null);
    }
  };

  const asignarOperario = async () => {
    if (!detalle || !operarioUnico || !onPushTareaProcesamientoOperario) return;
    setModalBusy(true);
    setError(null);
    try {
      await SolicitudProcesamientoService.asignarOperarioBodega(detalle.clientId, detalle.id, {
        operarioUid: operarioUnico.id,
        operarioNombre: operarioUnico.name,
      });
      setRows((list) =>
        list.map((r) =>
          r.clientId === detalle.clientId && r.id === detalle.id
            ? { ...r, operarioBodegaUid: operarioUnico.id, operarioBodegaNombre: operarioUnico.name }
            : r,
        ),
      );
      setDetalle((d) =>
        d && d.clientId === detalle.clientId && d.id === detalle.id
          ? {
              ...d,
              operarioBodegaUid: operarioUnico.id,
              operarioBodegaNombre: operarioUnico.name,
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
        operarioUid: operarioUnico.id,
        operarioNombre: operarioUnico.name,
        faseCola: "asignado",
      });
    } catch {
      setError("No se pudo asignar el operario.");
    } finally {
      setModalBusy(false);
    }
  };

  const codeOk = Boolean(String(warehouseCodeCuenta ?? "").trim());
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
            Operario bodega:{" "}
            <span className="font-medium text-slate-800">
              {detalle.operarioBodegaNombre?.trim() || detalle.operarioBodegaUid || "Sin asignar"}
            </span>
          </p>
          {puedeAsignar ? (
            <div className="mt-5 space-y-3 border-t border-slate-100 pt-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Asignar operario</p>
              <p className="text-[11px] text-slate-500">
                Un clic: queda asignado al operario de la bodega y pasa a su cola. Solo él puede llevar la orden de
                «Iniciado» a «En curso».
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
                  Boolean(operarioUnico) &&
                  iniciado &&
                  !asignado &&
                  !modalBusy &&
                  Boolean(onPushTareaProcesamientoOperario);
                return (
                  <>
                    {operarioUnico ? (
                      <p className="text-sm text-slate-700">
                        Se asigna a: <span className="font-semibold text-slate-900">{operarioUnico.name}</span>
                      </p>
                    ) : (
                      <p className="rounded-lg border border-amber-100 bg-amber-50/90 px-3 py-2 text-[11px] text-amber-900">
                        No hay ningún usuario con rol <strong>operario</strong> (o <strong>operador</strong> de bodega)
                        activo en el sistema. Creá uno en Configuración o revisá el rol en su perfil.
                      </p>
                    )}
                    <button
                      type="button"
                      title={
                        asignado
                          ? "Ya asignado"
                          : !operarioUnico
                            ? "Sin operario en el sistema"
                            : !iniciado
                              ? "Solo en estado Iniciado"
                              : "Asignar al operario de la bodega"
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

  if (layout === "cards") {
    return (
      <div className={pad}>
        <div className="mb-3 flex flex-wrap items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700 shadow-sm">
            <FiCpu className="h-[18px] w-[18px]" strokeWidth={2} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold tracking-tight text-slate-900">Procesamiento</h3>
            <p className="text-[11px] leading-snug text-slate-600">
              Iniciado y En curso. Tocá una tarjeta para ver el detalle y asignar al operario de bodega.
            </p>
          </div>
        </div>
        <div className="mb-3 space-y-2">{alerts}</div>
        {codeOk && clientIds.length > 0 ? (
          <div className="grid grid-cols-1 min-[520px]:grid-cols-2 xl:grid-cols-3 gap-3">
            {filasActivas.length === 0 ? (
              <div className="col-span-full rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 py-10 text-center text-sm text-slate-500">
                No hay órdenes pendientes de procesamiento.
              </div>
            ) : (
              filasActivas.map((row) => {
                const key = `${row.clientId}::${row.id}`;
                const estim =
                  row.estimadoUnidadesSecundario !== undefined &&
                  row.estimadoUnidadesSecundario !== null &&
                  Number.isFinite(row.estimadoUnidadesSecundario)
                    ? formatCantidad(row.estimadoUnidadesSecundario)
                    : "—";
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setError(null);
                      setDetalle(row);
                    }}
                    className="flex aspect-[5/4] w-full min-w-0 flex-col rounded-2xl border border-sky-200/90 bg-gradient-to-b from-sky-50/95 to-white p-2.5 text-left text-slate-900 shadow-sm transition hover:border-sky-300/90 hover:shadow-md sm:p-3"
                  >
                    <div className="flex shrink-0 items-start justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-1.5 font-mono text-xs font-bold text-sky-950">
                        <FiCpu className="h-3.5 w-3.5 shrink-0 text-sky-500" strokeWidth={2} aria-hidden />
                        <span className="truncate">{row.numero}</span>
                      </span>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold leading-tight ${procesamientoEstadoBadgeClass(row.estado)}`}
                      >
                        {row.estado}
                      </span>
                    </div>
                    <div className="mt-2 min-h-0 flex-1 space-y-1.5 overflow-y-auto overflow-x-hidden text-left">
                      <p className="break-words text-[11px] font-semibold leading-snug text-slate-800">
                        {row.clientName?.trim() || row.clientId}
                      </p>
                      <p className="break-words text-[11px] leading-snug text-slate-700">{row.productoPrimarioTitulo}</p>
                      <p className="break-words text-[10px] leading-snug text-slate-600">
                        <span className="font-medium text-slate-400">Secundario:</span> {row.productoSecundarioTitulo}
                      </p>
                      {row.operarioBodegaNombre || row.operarioBodegaUid ? (
                        <p className="text-[10px] text-sky-800">
                          Op.: {row.operarioBodegaNombre?.trim() || row.operarioBodegaUid}
                        </p>
                      ) : null}
                    </div>
                    <div className="mt-auto shrink-0 border-t border-sky-100/80 pt-1.5 text-center">
                      <p className="text-[11px] tabular-nums text-slate-700">
                        {formatCantidad(row.cantidadPrimario)} · {UnidadEtiqueta(row)}
                        {estim !== "—" ? ` · est. ${estim}` : ""}
                      </p>
                      <p className="text-[10px] text-slate-400">{row.fecha || "—"}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        ) : null}
        {detalleModal}
      </div>
    );
  }

  return (
    <div className={pad}>
      <p className="mb-3 text-xs leading-relaxed text-slate-600">
        Solo se listan pedidos en estado <strong>Iniciado</strong> o <strong>En curso</strong>. Las órdenes en{" "}
        <strong>Terminado</strong> no aparecen aquí. «En curso» solo lo puede elegir el operario asignado desde{" "}
        <strong>Iniciado</strong>.
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
