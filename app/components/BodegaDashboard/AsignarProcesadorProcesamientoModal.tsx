"use client";

import React from "react";
import { FiCpu, FiSearch } from "react-icons/fi";
import { ModalPlantilla } from "@/app/components/ui/ModalPlantilla";
import type { Client, Slot } from "@/app/interfaces/bodega";
import { SolicitudProcesamientoService } from "@/app/services/solicitudProcesamientoService";
import type { SolicitudProcesamiento } from "@/app/types/solicitudProcesamiento";
import { normalizeProcesamientoEstado } from "@/app/types/solicitudProcesamiento";
import { cantidadPrimarioProcesamientoTexto } from "@/app/lib/procesamientoDisplay";
import { formatEstimadoUnidadesSecundario } from "@/lib/catalogoProcesamiento";
import { PrecioSecundarioCatalogoLive } from "@/app/components/ui/procesamiento/PrecioSecundarioCatalogoLive";

function clientIdsParaBodega(clients: Client[], warehouseCodeCuenta: string): string[] {
  const code = String(warehouseCodeCuenta ?? "").trim();
  if (!code) return [];
  return clients
    .filter((c) => !c.disabled && String(c.code ?? "").trim() === code)
    .map((c) => c.id.trim())
    .filter(Boolean);
}

/** Tras el cierre del procesador: **Pendiente** (nuevo) u órdenes **Terminado** (legado). */
function filasPostCierreProcesamiento(rows: SolicitudProcesamiento[]): SolicitudProcesamiento[] {
  return rows.filter((r) => {
    const e = normalizeProcesamientoEstado(r.estado);
    return e === "Pendiente" || e === "Terminado";
  });
}

/** Clave estable cuenta + solicitud (misma que usa el slot al ubicar el resultado en bodega). */
function keyProcesamientoCuentaSolicitud(clientId: string, solicitudId: string): string {
  return `${String(clientId ?? "").trim()}::${String(solicitudId ?? "").trim()}`;
}

/** Solicitudes cuyo resultado ya figura en alguna posición del almacenamiento (`procesamientoSolicitudId`). */
function keysProcesamientoYaUbicadasEnMapa(slots: Slot[]): Set<string> {
  const set = new Set<string>();
  for (const s of slots) {
    const sol = String(s.procesamientoSolicitudId ?? "").trim();
    const cli = String(s.client ?? "").trim();
    if (sol && cli) set.add(keyProcesamientoCuentaSolicitud(cli, sol));
  }
  return set;
}

/** Pendiente / Terminado (legado) sin casillero en mapa con ese `procesamientoSolicitudId`. */
function filasPendientesUbicarEnMapa(rows: SolicitudProcesamiento[], slots: Slot[]): SolicitudProcesamiento[] {
  const yaEnMapa = keysProcesamientoYaUbicadasEnMapa(slots);
  return filasPostCierreProcesamiento(rows).filter((r) => {
    const k = keyProcesamientoCuentaSolicitud(r.clientId, r.id);
    return k && !yaEnMapa.has(k);
  });
}

/**
 * Modal del jefe: órdenes **Pendiente** (o **Terminado** legado) cuyo resultado **aún no** fue ubicado en el almacenamiento.
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

  const todasPostCierre = React.useMemo(() => filasPostCierreProcesamiento(rows), [rows]);
  const terminadasPendientesMapa = React.useMemo(() => filasPendientesUbicarEnMapa(rows, slots), [rows, slots]);

  const [busqueda, setBusqueda] = React.useState("");
  React.useEffect(() => {
    if (!isOpen) setBusqueda("");
  }, [isOpen]);

  const terminadasFiltradas = React.useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return terminadasPendientesMapa;
    return terminadasPendientesMapa.filter((row) => {
      const blob = [
        row.numero,
        row.productoPrimarioTitulo,
        row.productoSecundarioTitulo,
        row.clientId,
        row.id,
      ]
        .join(" ")
        .toLowerCase();
      return blob.includes(q);
    });
  }, [terminadasPendientesMapa, busqueda]);

  const codeOk = Boolean(String(warehouseCodeCuenta ?? "").trim());

  return (
    <ModalPlantilla
      open={isOpen}
      onClose={onClose}
      titulo="Procesamiento finalizado"
      tituloId="asignar-proc-modal-title"
      headerIcon={<FiCpu className="h-7 w-7 text-blue-600" strokeWidth={2} aria-hidden />}
      zIndexClass="z-[70]"
      maxWidthClass="max-w-xl"
      cardMaxHeightClass="max-h-[min(90vh,720px)]"
      subtitulo={
        <span>
          Órdenes en <strong className="font-semibold text-slate-700">Pendiente</strong> (procesador ya cerró) que
          todavía no tienen el resultado ubicado en el <strong className="font-semibold text-slate-700">almacenamiento</strong>.
          Si ya se trasladaron a una posición, dejan de aparecer acá.
        </span>
      }
      footer={
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-base font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Cerrar
          </button>
        </div>
      }
    >
        <div className="max-h-[min(62vh,480px)] space-y-4 overflow-y-auto">
          {terminadasPendientesMapa.length > 0 ? (
            <div className="relative">
              <FiSearch
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden
              />
              <input
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por número, producto…"
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200/60"
                autoComplete="off"
                aria-label="Filtrar órdenes terminadas"
              />
            </div>
          ) : null}
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
              {todasPostCierre.length > 0 ? (
                <>
                  Todas las órdenes post-proceso ya tienen el resultado ubicado en el almacenamiento. No queda ninguna
                  pendiente de trasladar desde procesamiento.
                </>
              ) : (
                <>
                  No hay órdenes de procesamiento <strong>finalizadas</strong> todavía. Cuando el procesador pase una
                  orden a <strong>Pendiente</strong>, aparecerá acá hasta que la ubiques en el mapa con un traslado a
                  bodega.
                </>
              )}
            </p>
          ) : terminadasFiltradas.length === 0 ? (
            <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">
              Ninguna orden coincide con la búsqueda. Probá con otro término o borrá el filtro.
            </p>
          ) : (
            <ul className="space-y-3">
              {terminadasFiltradas.map((row) => {
                const key = `${row.clientId}::${row.id}`;
                return (
                  <li
                    key={key}
                    className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="font-mono text-sm font-bold text-slate-900">{row.numero}</p>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-base font-bold uppercase tracking-wide ${
                          normalizeProcesamientoEstado(row.estado) === "Pendiente"
                            ? "bg-violet-100 text-violet-900"
                            : "bg-slate-200 text-slate-800"
                        }`}
                      >
                        {normalizeProcesamientoEstado(row.estado)}
                      </span>
                    </div>
                    <p className="mt-2 text-base font-bold uppercase tracking-wide text-slate-500">Primario</p>
                    <p className="mt-0.5 text-xs leading-snug text-slate-800">{row.productoPrimarioTitulo}</p>
                    <p className="mt-2 text-base font-bold uppercase tracking-wide text-slate-500">
                      Secundario (objetivo)
                    </p>
                    <p className="mt-0.5 text-xs leading-snug text-slate-800">
                      → {row.productoSecundarioTitulo}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      Precio (catálogo):{" "}
                      <PrecioSecundarioCatalogoLive
                        clientId={row.clientId}
                        productoSecundarioId={row.productoSecundarioId}
                        className="font-semibold tabular-nums text-slate-800"
                      />
                    </p>
                    <p className="mt-2 text-xs font-semibold text-slate-700">
                      Insumo: {cantidadPrimarioProcesamientoTexto(row)}
                      {row.estimadoUnidadesSecundario != null &&
                      Number.isFinite(Number(row.estimadoUnidadesSecundario))
                        ? ` · est. sec. ${formatEstimadoUnidadesSecundario(Number(row.estimadoUnidadesSecundario))} u.`
                        : ""}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
    </ModalPlantilla>
  );
}
