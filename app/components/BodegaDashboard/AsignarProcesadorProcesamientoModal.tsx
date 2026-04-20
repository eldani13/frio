"use client";

import React from "react";
import { FiCpu, FiX } from "react-icons/fi";
import type { Client, Slot } from "@/app/interfaces/bodega";
import { SolicitudProcesamientoService } from "@/app/services/solicitudProcesamientoService";
import type { SolicitudProcesamiento } from "@/app/types/solicitudProcesamiento";
import { normalizeProcesamientoEstado } from "@/app/types/solicitudProcesamiento";

function clientIdsParaBodega(clients: Client[], warehouseCodeCuenta: string): string[] {
  const code = String(warehouseCodeCuenta ?? "").trim();
  if (!code) return [];
  return clients
    .filter((c) => !c.disabled && String(c.code ?? "").trim() === code)
    .map((c) => c.id.trim())
    .filter(Boolean);
}

function filasTerminadas(rows: SolicitudProcesamiento[]): SolicitudProcesamiento[] {
  return rows.filter((r) => normalizeProcesamientoEstado(r.estado) === "Terminado");
}

/** Clave estable cuenta + solicitud (misma que usa el slot al ubicar el resultado en bodega). */
function keyProcesamientoCuentaSolicitud(clientId: string, solicitudId: string): string {
  return `${String(clientId ?? "").trim()}::${String(solicitudId ?? "").trim()}`;
}

/** Solicitudes cuyo resultado ya figura en alguna posición del mapa de bodega (`procesamientoSolicitudId`). */
function keysProcesamientoYaUbicadasEnMapa(slots: Slot[]): Set<string> {
  const set = new Set<string>();
  for (const s of slots) {
    const sol = String(s.procesamientoSolicitudId ?? "").trim();
    const cli = String(s.client ?? "").trim();
    if (sol && cli) set.add(keyProcesamientoCuentaSolicitud(cli, sol));
  }
  return set;
}

/** Terminadas que aún no tienen caja/slot en el mapa con ese `procesamientoSolicitudId`. */
function filasTerminadasPendientesDeUbicarEnMapa(
  rows: SolicitudProcesamiento[],
  slots: Slot[],
): SolicitudProcesamiento[] {
  const yaEnMapa = keysProcesamientoYaUbicadasEnMapa(slots);
  return filasTerminadas(rows).filter((r) => {
    const k = keyProcesamientoCuentaSolicitud(r.clientId, r.id);
    return k && !yaEnMapa.has(k);
  });
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

/**
 * Modal del jefe: órdenes **Terminado** cuyo resultado **aún no** fue ubicado en el mapa de bodega.
 */
export function AsignarProcesadorProcesamientoModal({
  isOpen,
  onClose,
  clients,
  warehouseCodeCuenta,
  slots = [],
}: {
  isOpen: boolean;
  onClose: () => void;
  clients: Client[];
  warehouseCodeCuenta: string;
  /** Posiciones actuales de bodega; si un slot tiene `procesamientoSolicitudId`, esa orden ya no se lista. */
  slots?: Slot[];
}) {
  const [rows, setRows] = React.useState<SolicitudProcesamiento[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  const clientIds = React.useMemo(
    () => clientIdsParaBodega(clients, warehouseCodeCuenta),
    [clients, warehouseCodeCuenta],
  );

  React.useEffect(() => {
    if (!isOpen) {
      setRows([]);
      setError(null);
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

  const todasTerminadas = React.useMemo(() => filasTerminadas(rows), [rows]);
  const terminadasPendientesMapa = React.useMemo(
    () => filasTerminadasPendientesDeUbicarEnMapa(rows, slots),
    [rows, slots],
  );

  if (!isOpen) return null;

  const codeOk = Boolean(String(warehouseCodeCuenta ?? "").trim());

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
              Procesamiento finalizado
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
              Órdenes <strong>Terminado</strong> que todavía no tienen el resultado ubicado en el{" "}
              <strong>mapa de bodega</strong>. Si ya se trasladaron a una posición, dejan de aparecer acá.
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
          {terminadasPendientesMapa.length === 0 ? (
            <p className="text-sm text-slate-600">
              {todasTerminadas.length > 0 ? (
                <>
                  Todas las órdenes en <strong>Terminado</strong> ya tienen el resultado ubicado en el mapa de bodega.
                  No queda ninguna pendiente de trasladar desde procesamiento.
                </>
              ) : (
                <>
                  No hay órdenes de procesamiento <strong>finalizadas</strong> todavía. Cuando el procesador marque una
                  orden como terminada, aparecerá acá hasta que la ubiques en el mapa con un traslado a bodega.
                </>
              )}
            </p>
          ) : (
            <ul className="space-y-3">
              {terminadasPendientesMapa.map((row) => {
                const key = `${row.clientId}::${row.id}`;
                return (
                  <li
                    key={key}
                    className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="font-mono text-sm font-bold text-slate-900">{row.numero}</p>
                      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800">
                        Terminado
                      </span>
                    </div>
                    <p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">Primario</p>
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
