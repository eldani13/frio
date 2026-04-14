"use client";

import React from "react";
import { FiCpu, FiX } from "react-icons/fi";
import type { Client } from "@/app/interfaces/bodega";
import { SolicitudProcesamientoService } from "@/app/services/solicitudProcesamientoService";
import type { SolicitudProcesamiento } from "@/app/types/solicitudProcesamiento";
import { normalizeProcesamientoEstado } from "@/app/types/solicitudProcesamiento";

type ProcesadorItem = { id: string; name: string };

function clientIdsParaBodega(clients: Client[], warehouseCodeCuenta: string): string[] {
  const code = String(warehouseCodeCuenta ?? "").trim();
  if (!code) return [];
  return clients
    .filter((c) => !c.disabled && String(c.code ?? "").trim() === code)
    .map((c) => c.id.trim())
    .filter(Boolean);
}

function filasEnCurso(rows: SolicitudProcesamiento[]): SolicitudProcesamiento[] {
  return rows.filter((r) => normalizeProcesamientoEstado(r.estado) === "En curso");
}

function formatCantidad(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return Number.isInteger(n) ? String(n) : n.toLocaleString("es-CO", { maximumFractionDigits: 4 });
}

function etiquetaUnidadPrimario(row: SolicitudProcesamiento): string {
  if (row.unidadPrimarioVisualizacion === "peso") return "Peso";
  if (row.unidadPrimarioVisualizacion === "cantidad") return "Cantidad";
  return "—";
}

function filaAsignadaAProcesador(row: SolicitudProcesamiento, procesadores: ProcesadorItem[]): boolean {
  const uid = String(row.operarioBodegaUid ?? "").trim();
  return uid !== "" && procesadores.some((p) => p.id === uid);
}

/**
 * Modal del jefe: órdenes de procesamiento en **En curso** (material ya en flujo) para reasignar
 * la ejecución al rol **procesador** (`operarioBodegaUid` en Firestore).
 */
export function AsignarProcesadorProcesamientoModal({
  isOpen,
  onClose,
  clients,
  warehouseCodeCuenta,
  procesadoresBodega,
  onPushTareaProcesamientoOperario,
}: {
  isOpen: boolean;
  onClose: () => void;
  clients: Client[];
  warehouseCodeCuenta: string;
  procesadoresBodega: ProcesadorItem[];
  onPushTareaProcesamientoOperario?: (tarea: Record<string, unknown>) => void;
}) {
  const [rows, setRows] = React.useState<SolicitudProcesamiento[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [busyKey, setBusyKey] = React.useState<string | null>(null);
  const [asignadoPorFila, setAsignadoPorFila] = React.useState<Record<string, string>>({});
  /** Filas marcadas como asignadas en esta sesión (antes de que llegue el snapshot de Firestore). */
  const [asignadoLocalKeys, setAsignadoLocalKeys] = React.useState<Set<string>>(() => new Set());

  const clientIds = React.useMemo(
    () => clientIdsParaBodega(clients, warehouseCodeCuenta),
    [clients, warehouseCodeCuenta],
  );

  React.useEffect(() => {
    if (!isOpen) {
      setRows([]);
      setError(null);
      setBusyKey(null);
      setAsignadoPorFila({});
      setAsignadoLocalKeys(new Set());
      return;
    }
    setError(null);
    return SolicitudProcesamientoService.subscribeParaBodegaInterna(
      clientIds,
      warehouseCodeCuenta,
      setRows,
      () => setError("No se pudieron cargar las órdenes de procesamiento."),
    );
  }, [isOpen, clientIds, warehouseCodeCuenta]);

  React.useEffect(() => {
    if (!isOpen || procesadoresBodega.length === 0) return;
    const def = procesadoresBodega[0].id;
    setAsignadoPorFila((prev) => {
      const next = { ...prev };
      for (const r of rows) {
        const k = `${r.clientId}::${r.id}`;
        if (!next[k] || !procesadoresBodega.some((p) => p.id === next[k])) {
          next[k] = def;
        }
      }
      return next;
    });
  }, [isOpen, rows, procesadoresBodega]);

  const enCurso = React.useMemo(() => filasEnCurso(rows), [rows]);

  if (!isOpen) return null;

  const codeOk = Boolean(String(warehouseCodeCuenta ?? "").trim());

  const asignar = async (row: SolicitudProcesamiento) => {
    const key = `${row.clientId}::${row.id}`;
    const pid = String(asignadoPorFila[key] ?? procesadoresBodega[0]?.id ?? "").trim();
    const proc = procesadoresBodega.find((p) => p.id === pid);
    if (!proc || !onPushTareaProcesamientoOperario) return;
    setBusyKey(key);
    setError(null);
    try {
      await SolicitudProcesamientoService.asignarOperarioBodega(row.clientId, row.id, {
        operarioUid: proc.id,
        operarioNombre: proc.name,
      });
      onPushTareaProcesamientoOperario({
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
        faseCola: normalizeProcesamientoEstado(row.estado) === "En curso" ? "en_curso" : "asignado",
      });
      setAsignadoLocalKeys((prev) => new Set(prev).add(key));
    } catch {
      setError("No se pudo asignar al procesador. Intentá de nuevo.");
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/45 p-3 backdrop-blur-[2px] sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="asignar-proc-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-3xl border border-sky-100 bg-white shadow-2xl sm:max-w-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative flex items-start gap-4 border-b border-slate-100 bg-linear-to-r from-sky-50 via-white to-white px-5 py-5 sm:px-6">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700 shadow-inner">
            <FiCpu className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1 pr-10">
            <h2 id="asignar-proc-modal-title" className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
              Asignar procesamiento al procesador
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
              Órdenes en estado <strong>En curso</strong> (después de que el operario las activó). Elegí un
              procesador para que la tarea aparezca en su cola y pueda terminarla.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Cerrar"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[min(62vh,480px)] space-y-4 overflow-y-auto px-5 py-5 sm:px-6">
          {!codeOk ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Esta bodega no tiene <strong>codeCuenta</strong> asignado.
            </p>
          ) : clientIds.length === 0 ? (
            <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              No hay clientes activos con código <span className="font-mono font-semibold">{warehouseCodeCuenta}</span>.
            </p>
          ) : null}
          {error ? (
            <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          ) : null}
          {procesadoresBodega.length === 0 ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              No hay usuarios con rol <strong>procesador</strong>. Creá uno en Configuración.
            </p>
          ) : enCurso.length === 0 ? (
            <p className="text-sm text-slate-600">
              No hay órdenes en <strong>En curso</strong>. El operario debe pasar una orden de procesamiento a «En
              curso» desde su bandeja antes de asignarla aquí al procesador.
            </p>
          ) : (
            <ul className="space-y-3">
              {enCurso.map((row) => {
                const key = `${row.clientId}::${row.id}`;
                const busy = busyKey === key;
                const yaAsignada =
                  filaAsignadaAProcesador(row, procesadoresBodega) || asignadoLocalKeys.has(key);
                return (
                  <li
                    key={key}
                    className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm"
                  >
                    <div className="min-w-0">
                      <p className="font-mono text-sm font-bold text-slate-900">{row.numero}</p>
                      <p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                        Primario
                      </p>
                      <p className="mt-0.5 text-xs leading-snug text-slate-800">{row.productoPrimarioTitulo}</p>
                      <p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                        Secundario (objetivo)
                      </p>
                      <p className="mt-0.5 text-xs leading-snug text-slate-800">
                        → {row.productoSecundarioTitulo}
                      </p>
                      <p className="mt-2 text-xs font-semibold text-slate-700">
                        Cantidad: {formatCantidad(Number(row.cantidadPrimario) || 0)} · {etiquetaUnidadPrimario(row)}
                        {row.estimadoUnidadesSecundario != null &&
                        Number.isFinite(Number(row.estimadoUnidadesSecundario))
                          ? ` · est. sec. ${formatCantidad(Number(row.estimadoUnidadesSecundario))} u.`
                          : ""}
                      </p>
                    </div>
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
                      <div className="min-w-0 flex-1">
                        <label className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                          Asignar a procesador
                        </label>
                        <select
                          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-400/40 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-70"
                          value={asignadoPorFila[key] ?? procesadoresBodega[0]?.id ?? ""}
                          onChange={(e) =>
                            setAsignadoPorFila((prev) => ({ ...prev, [key]: e.target.value }))
                          }
                          disabled={busy || yaAsignada}
                        >
                          {procesadoresBodega.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <button
                        type="button"
                        disabled={busy || yaAsignada}
                        onClick={() => void asignar(row)}
                        className={`inline-flex shrink-0 items-center justify-center rounded-xl px-4 py-2.5 text-sm font-bold shadow transition disabled:cursor-not-allowed disabled:opacity-60 ${
                          yaAsignada
                            ? "border border-slate-200 bg-slate-100 text-slate-600"
                            : "bg-sky-600 text-white hover:bg-sky-500"
                        }`}
                      >
                        {busy ? "Guardando…" : yaAsignada ? "Asignado" : "Asignar"}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="border-t border-slate-100 bg-slate-50/90 px-5 py-4 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 sm:w-auto"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
