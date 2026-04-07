"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useCallback, useMemo, useState } from "react";
import type { RequestsQueueProps } from "../../interfaces/bodega/RequestsQueue";
import type { BodegaOrder, OrderSource, OrderType } from "../../interfaces/bodega";
import {
  FiAlertCircle,
  FiArrowRight,
  FiBox,
  FiCalendar,
  FiMapPin,
  FiPackage,
  FiPhoneCall,
  FiUser,
} from "react-icons/fi";
import { IoCloseOutline } from "react-icons/io5";

const TYPE_LABELS: Record<OrderType, string> = {
  a_bodega: "A bodega",
  a_salida: "A salida",
  revisar: "Revisar",
};

const STATUS_STYLES: Record<
  "ingreso" | "bodega" | "salida" | "revisar",
  { bg: string; border: string; text: string; icon: string; label: string }
> = {
  ingreso: {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-700",
    icon: "text-emerald-500",
    label: "text-emerald-500",
  },
  bodega: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-700",
    icon: "text-blue-500",
    label: "text-blue-500",
  },
  salida: {
    bg: "bg-pink-50",
    border: "border-pink-200",
    text: "text-pink-700",
    icon: "text-pink-500",
    label: "text-pink-500",
  },
  revisar: {
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    text: "text-yellow-700",
    icon: "text-yellow-500",
    label: "text-yellow-600",
  },
};

const orderTimestamp = (order: BodegaOrder) =>
  typeof order.createdAtMs === "number" ? order.createdAtMs : Date.now();

/** Mismo umbral que `BodegaDashboard` / jefe: por encima = temperatura alta. */
const HIGH_TEMP_ALERT_THRESHOLD = 5;

function coerceTempLocal(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const t = Number(String(v).trim().replace(",", "."));
    return Number.isFinite(t) ? t : null;
  }
  return null;
}

function liveTempAssignedAlert(
  alerta: { position: number; zone?: unknown },
  slots: RequestsQueueProps["slots"],
  inboundBoxes: RequestsQueueProps["inboundBoxes"],
  outboundBoxes: RequestsQueueProps["outboundBoxes"],
): number | null {
  const pos = Number(alerta.position);
  const zone = (alerta.zone as OrderSource | undefined) ?? "bodega";
  if (zone === "bodega") {
    const s = slots.find((x) => x.position === pos);
    return coerceTempLocal(s?.temperature);
  }
  if (zone === "ingresos") {
    const b = inboundBoxes.find((x) => x.position === pos);
    return coerceTempLocal(b?.temperature);
  }
  const b = outboundBoxes.find((x) => x.position === pos);
  return coerceTempLocal(b?.temperature);
}

type ReviewDetail = {
  zone: OrderSource;
  position: number;
  autoId: string;
  name: string;
  temperature: number | null;
  client: string;
  source: "cloud" | "order";
};

export default function RequestsQueue(props: RequestsQueueProps) {
  const {
    requests,
    canExecute,
    onExecute,
    onReport: _onReport,
    slots = [],
    inboundBoxes = [],
    outboundBoxes = [],
    alertasOperario = [],
    alertasOperarioSolved = [],
    llamadasJefe = [],
    onUpdateAlertasOperario,
    onUpdateAlertasOperarioSolved,
    onUpdateLlamadasJefe,
    onPersistTemperatureForAlert,
    onOperarioResolveTemperatureAlert,
  } = props;

  // Optional callbacks may be provided from parent, keep refs without invoking
  void _onReport;

  const [showAlertModal, setShowAlertModal] = useState(false);
  const [showSolveModal, setShowSolveModal] = useState(false);
  const [alertaSeleccionada, setAlertaSeleccionada] = useState<
    | null
    | {
        alerta: { position: number; [key: string]: unknown };
        idx: number;
      }
  >(null);
  const [editTempModal, setEditTempModal] = useState<
    | null
    | {
        position: number;
        autoId?: string;
        name?: string;
        temperature: number | null;
        zone: OrderSource;
      }
  >(null);
  const [editTempLoading, setEditTempLoading] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);
  const [reviewModal, setReviewModal] = useState<
    | null
    | {
        order: BodegaOrder;
        detail: ReviewDetail | null;
      }
  >(null);

  const orderedRequests = useMemo(
    () => [...requests].sort((a, b) => orderTimestamp(a) - orderTimestamp(b)),
    [requests],
  );
  const nextRequest = orderedRequests[0];

  /**
   * Solo alertas cuya zona sigue por encima del umbral. Evita listar asignaciones “fantasma”
   * si Firestore aún tiene la fila pero el mapa ya tiene temperatura corregida.
   * `sourceIndex` = índice en `alertasOperario` (para resolver / persistir).
   */
  const alertasOperarioVisibles = useMemo(() => {
    const out: Array<{
      alerta: (typeof alertasOperario)[number];
      sourceIndex: number;
    }> = [];
    alertasOperario.forEach((alerta, sourceIndex) => {
      const live = liveTempAssignedAlert(alerta, slots, inboundBoxes, outboundBoxes);
      if (live !== null && Number.isFinite(live) && live <= HIGH_TEMP_ALERT_THRESHOLD) {
        return;
      }
      out.push({ alerta, sourceIndex });
    });
    return out;
  }, [alertasOperario, slots, inboundBoxes, outboundBoxes]);

  const originStatus: keyof typeof STATUS_STYLES = nextRequest
    ? (() => {
        const zone = (nextRequest.sourceZone || "").toString().toLowerCase();
        if (zone === "bodega") return "bodega";
        if (zone === "salida") return "salida";
        if (zone === "ingreso" || zone === "ingresos") return "ingreso";
        return "ingreso";
      })()
    : "ingreso";
  const destinationStatus: keyof typeof STATUS_STYLES = nextRequest
    ? nextRequest.type === "a_bodega"
      ? "bodega"
      : nextRequest.type === "a_salida"
        ? "salida"
        : nextRequest.type === "revisar"
          ? "revisar"
          : "ingreso"
    : "ingreso";
  const originStyle = STATUS_STYLES[originStatus];
  const destinationStyle = STATUS_STYLES[destinationStatus];

  const loadReviewDetail = useCallback(
    (order: BodegaOrder): ReviewDetail | null => {
      const sourceList =
        order.sourceZone === "ingresos"
          ? inboundBoxes
          : order.sourceZone === "salida"
            ? outboundBoxes
            : slots;

      const match = sourceList.find(
        (item: any) => item && Number(item.position) === order.sourcePosition,
      );

      if (match) {
        return {
          zone: order.sourceZone,
          position: order.sourcePosition,
          autoId: typeof match.autoId === "string" ? match.autoId : "",
          name: typeof match.name === "string" ? match.name : "",
          temperature:
            typeof match.temperature === "number" ? match.temperature : null,
          client: typeof match.client === "string" ? match.client : "",
          source: "cloud",
        };
      }

      if (order.autoId || order.boxName || order.client) {
        return {
          zone: order.sourceZone,
          position: order.sourcePosition,
          autoId: order.autoId ?? "",
          name: order.boxName ?? "",
          temperature: null,
          client: order.client ?? "",
          source: "order",
        };
      }

      return null;
    },
    [inboundBoxes, outboundBoxes, slots],
  );

  const handleUpdateAlertTemperature = (
    position: number,
    newTemp: number,
    opts: { zone?: OrderSource; name?: string; autoId?: string } = {},
  ) => {
    const zone = opts.zone ?? "bodega";
    if (Number.isFinite(newTemp) && onPersistTemperatureForAlert) {
      onPersistTemperatureForAlert(Number(position), newTemp, zone);
    }

    const updated = alertasOperario.map((a) =>
      Number(a.position) === position ? { ...a, temperature: newTemp } : a,
    );
    onUpdateAlertasOperario(updated);
    setAlertaSeleccionada((prev) => {
      if (!prev) return prev;
      return prev.alerta.position === position
        ? { ...prev, alerta: { ...prev.alerta, temperature: newTemp } }
        : prev;
    });

    if (alertaSeleccionada) {
      const pos = Number(position);
      const solved = alertasOperarioSolved.includes(pos)
        ? alertasOperarioSolved
        : [...alertasOperarioSolved, pos];
      onUpdateAlertasOperarioSolved(solved);
    }
  };

  const markAlertSolved = (
    alerta: { position: number; [key: string]: unknown },
    idx: number,
  ) => {
    const remaining = alertasOperario.filter((_, i) => i !== idx);
    onUpdateAlertasOperario(remaining);

    const pos = Number(alerta.position);
    const solvedPositions = alertasOperarioSolved.includes(pos)
      ? alertasOperarioSolved
      : [...alertasOperarioSolved, pos];
    onUpdateAlertasOperarioSolved(solvedPositions);

    setShowSolveModal(false);
    setAlertaSeleccionada(null);
  };

  const handleMainExecute = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (!nextRequest) return;
    if (nextRequest.type === "revisar") {
      const detail = loadReviewDetail(nextRequest);
      setReviewModal({ order: nextRequest, detail });
      return;
    }
    const btn = event.currentTarget;
    btn.classList.add("zoom-out");
    setTimeout(() => {
      btn.classList.remove("zoom-out");
      onExecute(nextRequest.id);
    }, 180);
  };

  const handleCall = () => {
    const llamada = {
      timestamp: Date.now(),
      from: "operario",
      message: "Llamado del operario",
    };
    onUpdateLlamadasJefe([...llamadasJefe, llamada]);
    setShowCallModal(true);
  };

  return (
    <div>
      {/* Modal de Alertas */}
      {showAlertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/10 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl p-0 max-w-lg w-full relative animate-fade-in-up border border-red-100">
            <div className="flex flex-col items-center justify-center pt-8 pb-4 px-8 border-b border-red-100 bg-linear-to-r from-red-50 to-white rounded-t-3xl">
              <span className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 shadow animate-pulse mb-2">
                <FiAlertCircle className="w-9 h-9 text-red-500" />
              </span>
              <h2 className="text-2xl font-extrabold text-red-700 drop-shadow mb-1">
                Alertas asignadas
              </h2>
              <p className="text-sm text-slate-500 font-medium text-center">
                Estas son las alertas de temperatura que tienes asignadas actualmente.
              </p>
              <button
                className="absolute top-4 right-4 text-slate-400 text-2xl font-bold focus:outline-none transition-colors"
                onClick={() => setShowAlertModal(false)}
                aria-label="Cerrar"
              >
                <IoCloseOutline />
              </button>
            </div>
            <div className="px-8 py-6 min-h-30 flex flex-col items-center">
              {alertasOperarioVisibles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <svg
                    className="w-16 h-16 text-slate-200 mb-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="text-slate-400 text-lg font-semibold text-center">
                    No hay alertas asignadas
                  </p>
                  <p className="text-slate-400 text-sm text-center mt-1">
                    Cuando se te asigne una alerta, aparecerá aquí.
                  </p>
                </div>
              ) : (
                <ul className="mt-2 w-full space-y-3">
                  {alertasOperarioVisibles.map(({ alerta, sourceIndex }) => (
                    <li
                      key={`${sourceIndex}-${Number(alerta.position)}`}
                      className="bg-linear-to-r from-red-50 to-white border border-red-200 rounded-xl px-5 py-4 text-red-800 flex items-center gap-4 shadow-sm hover:shadow-md transition-all"
                    >
                      <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-red-100">
                        <FiAlertCircle className="w-6 h-6 text-red-500" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-base text-red-700">
                            Alerta {alerta.position}
                          </span>
                          {(alerta as any).name && (
                            <span className="ml-2 text-xs text-slate-700 bg-slate-100 rounded px-2 py-0.5">
                              {(alerta as any).name}
                            </span>
                          )}
                        </div>
                        {(() => {
                          const live = liveTempAssignedAlert(alerta, slots, inboundBoxes, outboundBoxes);
                          const shown =
                            live !== null && Number.isFinite(live)
                              ? live
                              : typeof (alerta as any).temperature === "number"
                                ? (alerta as any).temperature
                                : null;
                          return shown !== null ? (
                            <span className="inline-block text-xs font-semibold text-white bg-red-500 rounded px-2 py-0.5 animate-pulse shadow">
                              {shown} °C
                            </span>
                          ) : null;
                        })()}
                        <div className="text-xs text-slate-500 mt-1">Alerta de temperatura alta</div>
                      </div>
                      <button
                        className="ml-2 px-3 py-1 rounded-lg bg-green-500 hover:bg-green-600 text-white text-xs font-bold shadow transition-all focus:outline-none focus:ring-2 focus:ring-green-300"
                        onClick={() => {
                          setAlertaSeleccionada({ alerta, idx: sourceIndex });
                          setShowSolveModal(true);
                        }}
                        title="Marcar como solucionada"
                      >
                        Solucionar
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex justify-center pb-6 pt-2 px-8">
              <button
                className="w-full sm:w-auto rounded-xl bg-red-500 text-white font-bold text-lg py-3 px-8 shadow transition-all focus:outline-none focus:ring-2 focus:ring-red-300"
                onClick={() => setShowAlertModal(false)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      <div>
        {canExecute ? (
          <button
            type="button"
            disabled={!nextRequest}
            onClick={handleMainExecute}
            className="rounded-2xl bg-white p-6 sm:p-8 shadow-sm w-full border border-emerald-200 transition-transform duration-150 hover:shadow-lg focus:shadow-lg active:shadow-lg hover:scale-[0.98] active:scale-[0.95]"
            style={{ outline: "none" }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
              <span className="px-6 py-2 rounded-xl bg-emerald-600 text-white font-semibold text-lg flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-start">
                <FiBox className="w-5 h-5" />
                {nextRequest ? TYPE_LABELS[nextRequest.type] : "A bodega"}
              </span>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto justify-start sm:justify-end">
                <span className="px-4 py-1 rounded-xl border border-yellow-300 bg-yellow-50 text-yellow-700 font-semibold text-base flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-start">
                  <FiAlertCircle className="w-5 h-5" /> Pendiente
                </span>
                <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 font-bold text-base border border-emerald-200 w-full sm:w-auto text-center">
                  {requests.length} tareas
                </span>
              </div>
            </div>
            {!nextRequest ? (
              <div className="flex min-h-88 items-center justify-center rounded-3xl border border-slate-200 bg-slate-50 px-6 py-10 text-center">
                <p className="text-2xl font-semibold text-slate-700">
                  No hay solicitudes pendientes.
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl  p-4 sm:p-8">
                <div className="flex flex-col items-center">
                  <span className="text-slate-500 font-semibold text-lg mb-4">
                    Transferencia de:
                  </span>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 w-full">
                    <div
                      className={`flex flex-col items-center rounded-2xl px-6 sm:px-8 py-5 sm:py-6 w-full sm:w-64 max-w-md border ${originStyle.bg} ${originStyle.border}`}
                    >
                      <FiMapPin className={`w-8 h-8 mb-2 ${originStyle.icon}`} />
                      <span className={`text-xs mb-1 ${originStyle.label}`}>
                        ORIGEN
                      </span>
                      <span className={`text-2xl font-bold ${originStyle.text}`}>
                        {nextRequest.sourceZone === "bodega"
                          ? "Bodega"
                          : nextRequest.sourceZone === "salida"
                            ? "Salida"
                            : "Ingreso"}{" "}
                        {nextRequest.sourcePosition}
                      </span>
                    </div>
                    <FiArrowRight className="w-8 h-8 sm:w-10 sm:h-10 text-slate-300" />
                    <div
                      className={`flex flex-col items-center rounded-2xl px-6 sm:px-8 py-5 sm:py-6 w-full sm:w-64 max-w-md border ${destinationStyle.bg} ${destinationStyle.border}`}
                    >
                      <FiBox className={`w-8 h-8 mb-2 ${destinationStyle.icon}`} />
                      <span className={`text-xs mb-1 ${destinationStyle.label}`}>
                        DESTINO
                      </span>
                      <span className={`text-2xl font-bold ${destinationStyle.text}`}>
                        {nextRequest.type === "a_bodega"
                          ? `bodega ${nextRequest.targetPosition}`
                          : nextRequest.type === "a_salida"
                            ? `salida ${nextRequest.targetPosition}`
                            : nextRequest.targetPosition &&
                                String(nextRequest.targetPosition).trim() !== "" &&
                                nextRequest.targetPosition !== undefined &&
                                nextRequest.targetPosition !== null
                              ? `revisar ${nextRequest.targetPosition}`
                              : "revisar"}
                      </span>
                    </div>
                  </div>
                  <hr className="my-8 border-slate-200 w-full" />
                  <div className="flex flex-wrap justify-center gap-4 sm:gap-8 w-full mb-6">
                    <div className="flex items-center gap-1 sm:gap-2 text-center sm:text-left">
                      <FiUser className="w-5 h-5 text-slate-400" />
                      <span className="text-xs text-slate-500">Solicitado por</span>
                      <span className="font-semibold text-slate-700">
                        {nextRequest.createdBy}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2 text-center sm:text-left">
                      <FiCalendar className="w-5 h-5 text-slate-400" />
                      <span className="text-xs text-slate-500">Fecha y hora</span>
                      <span className="font-semibold text-slate-700">
                        {nextRequest.createdAt}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2 text-center sm:text-left">
                      <FiPackage className="w-5 h-5 text-slate-400" />
                      <span className="text-xs text-slate-500">ID de solicitud</span>
                      <span className="font-semibold text-slate-700">
                        {nextRequest.id}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </button>
        ) : null}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 w-full">
          <button
            type="button"
            className={`flex-1 flex items-center justify-center gap-2 rounded-2xl font-bold text-lg py-4 shadow transition-all border-2 focus:outline-none focus:ring-2
              ${alertasOperarioVisibles.length > 0
                ? "bg-red-100 hover:bg-red-200 text-red-700 border-red-200 focus:ring-red-300"
                : "bg-slate-100 text-slate-400 border-slate-200 focus:ring-slate-300 cursor-not-allowed"}
            `}
            style={{ minWidth: 0 }}
            onClick={() => alertasOperarioVisibles.length > 0 && setShowAlertModal(true)}
            disabled={alertasOperarioVisibles.length === 0}
          >
            <FiAlertCircle className="w-6 h-6" />
            Alertas
            {alertasOperarioVisibles.length > 0 && (
              <span
                className="ml-2 px-2 py-0.5 rounded-full bg-red-500 text-white text-base font-bold animate-pulse"
                style={{ minWidth: 28, textAlign: "center" }}
              >
                {alertasOperarioVisibles.length}
              </span>
            )}
          </button>
          <button
            type="button"
            className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-yellow-100 hover:bg-yellow-200 text-yellow-700 font-bold text-lg py-4 shadow transition-all border-2 border-yellow-200 focus:outline-none focus:ring-2 focus:ring-yellow-300"
            style={{ minWidth: 0 }}
            onClick={handleCall}
          >
            <FiPhoneCall className="w-6 h-6" />
            Llamar
          </button>
        </div>
      </div>

      {reviewModal && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center backdrop-blur-sm bg-black/20 animate-fade-in p-2 sm:p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setReviewModal(null)}
        >
          <div
            className="w-full max-w-lg sm:max-w-xl rounded-3xl border border-yellow-100 bg-white/95 shadow-2xl backdrop-blur-lg relative overflow-hidden animate-fade-in-up"
            onClick={(e) => e.stopPropagation()}
            style={{ fontFamily: '"Space Grotesk", "Work Sans", sans-serif' }}
          >
            <div className="flex flex-col items-center justify-center pt-8 pb-4 px-8 border-b border-yellow-100 bg-linear-to-r from-yellow-50 to-white rounded-t-3xl relative">
              <span className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-yellow-100 shadow mb-2">
                <FiAlertCircle className="w-8 h-8 text-yellow-500" />
              </span>
              <h2 className="text-2xl font-extrabold text-yellow-700 drop-shadow mb-1 tracking-tight">
                Revisar caja
              </h2>
              <p className="text-sm text-slate-600 font-medium text-center">
                Detalles de la posición a revisar antes de marcarla como gestionada.
              </p>
              <button
                type="button"
                onClick={() => setReviewModal(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-yellow-600 text-2xl font-bold focus:outline-none transition-colors"
                aria-label="Cerrar"
              >
                <IoCloseOutline />
              </button>
            </div>

            <div className="px-8 py-6 flex flex-col gap-4 max-h-[65vh] overflow-y-auto bg-white/90 w-full">
              <div className="w-full space-y-2 text-sm text-slate-700">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-slate-600">Zona</span>
                  <span className="text-slate-900 font-bold">
                    {(() => {
                      const labelMap: Record<OrderSource, string> = {
                        ingresos: "Ingreso",
                        bodega: "Bodega",
                        salida: "Salida",
                      };
                      return `${labelMap[reviewModal.order.sourceZone]} ${reviewModal.order.sourcePosition}`;
                    })()}
                  </span>
                </div>
                {reviewModal.detail ? (
                  <>
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-slate-600">Nombre</span>
                      <span className="text-slate-900 font-semibold truncate max-w-[55%]">
                        {reviewModal.detail.name || "Sin nombre"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-slate-600">Id</span>
                      <span className="text-slate-900 font-semibold truncate max-w-[55%]">
                        {reviewModal.detail.autoId || "N/A"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-slate-600">Cliente</span>
                      <span className="text-slate-900 truncate max-w-[55%]">
                        {reviewModal.detail.client || "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-slate-600">Temperatura</span>
                      <span className="text-slate-900 font-semibold">
                        {reviewModal.detail.temperature !== null
                          ? `${reviewModal.detail.temperature} °C`
                          : "Sin dato"}
                      </span>
                    </div>
                    {reviewModal.detail.source === "order" ? (
                      <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                        No se encontró la caja en los datos de la nube. Se muestran los datos guardados en la orden.
                      </p>
                    ) : null}
                  </>
                ) : (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    No se encontró la caja en los datos de la nube. Usa “Marcar revisada” si ya validaste manualmente.
                  </div>
                )}
                <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                  Creada: {reviewModal.order.createdAt}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:justify-end w-full">
                <button
                  type="button"
                  className="flex-1 sm:flex-none rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow transition hover:bg-slate-100"
                  onClick={() => setReviewModal(null)}
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  className="flex-1 sm:flex-none rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 shadow transition hover:bg-blue-100"
                  onClick={() => {
                    const detail = reviewModal.detail;
                    setEditTempModal({
                      position: detail?.position ?? reviewModal.order.sourcePosition,
                      autoId: detail?.autoId || reviewModal.order.autoId || "",
                      name: detail?.name || reviewModal.order.boxName || "",
                      temperature: detail?.temperature ?? null,
                      zone: reviewModal.order.sourceZone,
                    });
                  }}
                >
                  Temperatura
                </button>
                <button
                  type="button"
                  className="flex-1 sm:flex-none rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-lg transition hover:bg-emerald-700 active:scale-95 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  onClick={() => {
                    setReviewModal(null);
                    onExecute(reviewModal.order.id);
                  }}
                >
                  Marcar revisada
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCallModal && (
        <div
          className="fixed inset-0 z-70 flex items-center justify-center backdrop-blur-sm bg-black/15 animate-fade-in p-2 sm:p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowCallModal(false)}
        >
          <div
            className="w-full max-w-lg sm:max-w-xl rounded-3xl border border-blue-100 bg-white/90 shadow-2xl backdrop-blur-lg relative overflow-hidden animate-fade-in-up"
            onClick={(e) => e.stopPropagation()}
            style={{ fontFamily: '"Space Grotesk", "Work Sans", sans-serif' }}
          >
            <div className="flex flex-col items-center justify-center pt-8 pb-4 px-8 border-b border-blue-100 bg-linear-to-r from-blue-50 to-white rounded-t-3xl relative">
              <span className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-blue-100 shadow mb-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-8 h-8 text-blue-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </span>
              <h2 className="text-2xl font-extrabold text-blue-700 drop-shadow mb-1 tracking-tight">
                Llamado enviado
              </h2>
              <p className="text-sm text-slate-600 font-medium text-center">
                El jefe ya fue notificado. Pronto atenderá el llamado.
              </p>
              <button
                type="button"
                onClick={() => setShowCallModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-blue-500 text-2xl font-bold focus:outline-none transition-colors"
                aria-label="Cerrar"
              >
                <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 6 6 18" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-8 py-8 flex flex-col items-center bg-white/85 w-full">
              <div className="text-base sm:text-lg font-semibold text-slate-800 text-center">
                Por favor espera instrucciones o la llegada del jefe.
              </div>
            </div>
          </div>
        </div>
      )}

      {showAlertModal && showSolveModal && alertaSeleccionada && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center backdrop-blur-sm bg-black/25 animate-fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-lg sm:max-w-xl rounded-3xl border border-red-100 bg-white/90 shadow-2xl backdrop-blur-lg relative overflow-hidden animate-fade-in-up"
            onClick={(e) => e.stopPropagation()}
            style={{ fontFamily: '"Space Grotesk", "Work Sans", sans-serif' }}
          >
            <div className="flex flex-col items-center justify-center pt-8 pb-4 px-8 border-b border-red-100 bg-linear-to-r from-red-50 to-white rounded-t-3xl relative">
              <span className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 shadow animate-pulse mb-2">
                <FiAlertCircle className="w-9 h-9 text-red-500" />
              </span>
              <h3 className="text-2xl font-extrabold text-red-700 drop-shadow mb-1 tracking-tight">
                Alerta {alertaSeleccionada.alerta.position}
              </h3>
              <p className="text-sm text-slate-500 font-medium text-center">
                Selecciona la acción para esta alerta.
              </p>
              <button
                type="button"
                onClick={() => setShowSolveModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-red-500 text-2xl font-bold focus:outline-none transition-colors"
                aria-label="Cerrar"
              >
                <svg
                  width="28"
                  height="28"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M18 6 6 18"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="px-8 py-6 min-h-30 flex flex-col items-center max-h-[60vh] overflow-y-auto bg-white/85 w-full">
              <div className="w-full space-y-2 text-sm text-slate-700 mb-4">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-600">Nombre:</span>
                  {(alertaSeleccionada.alerta as any).name && (
                    <span className="inline-block px-2 py-1 rounded bg-slate-100 text-slate-700 text-xs">
                      {(alertaSeleccionada.alerta as any).name}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-600">Id único:</span>
                  <span className="truncate">
                    {(alertaSeleccionada.alerta as any).autoId || "N/A"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-600">Temperatura:</span>
                  {typeof (alertaSeleccionada.alerta as any).temperature === "number" && (
                    <span className="inline-block px-2 py-1 rounded bg-red-100 text-red-700 font-semibold text-xs">
                      {(alertaSeleccionada.alerta as any).temperature} °C
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 mt-4 w-full">
                <button
                  type="button"
                  className="flex-1 rounded-xl bg-blue-700 px-4 py-2 text-base font-bold text-white shadow-lg transition hover:bg-blue-800 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-300"
                  onClick={() =>
                    setEditTempModal({
                      position: Number(alertaSeleccionada.alerta.position),
                      autoId: (alertaSeleccionada.alerta as any).autoId,
                      name: (alertaSeleccionada.alerta as any).name,
                      temperature: (alertaSeleccionada.alerta as any).temperature,
                      zone:
                        ((alertaSeleccionada.alerta as { zone?: OrderSource }).zone as OrderSource) ??
                        "bodega",
                    })
                  }
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-5 h-5 inline-block mr-1 -mt-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 17a5 5 0 01-10 0c0-2.5 2-4.5 5-4.5s5 2 5 4.5z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 3v10"
                    />
                  </svg>
                  Actualizar temperatura
                </button>
                <button
                  type="button"
                  className="flex-1 rounded-xl bg-slate-200 px-4 py-2 text-base font-semibold text-slate-700 shadow transition hover:bg-slate-300"
                  onClick={() => setShowSolveModal(false)}
                >
                  Cerrar
                </button>
              </div>
              <div className="flex justify-end w-full mt-6">
                <span className="text-xs text-slate-500">
                  Al actualizar temperatura se marcará como solucionada.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {editTempModal && (
        <div
          className="fixed inset-0 z-100 flex items-center justify-center p-2 bg-black/40 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={() => setEditTempModal(null)}
        >
          <div
            className="w-full max-w-xs rounded-2xl border border-blue-100 bg-white/95 shadow-xl relative overflow-hidden animate-fade-in-up"
            onClick={(e) => e.stopPropagation()}
            style={{ fontFamily: '"Space Grotesk", "Work Sans", sans-serif' }}
          >
            <div className="flex flex-col items-center justify-center pt-5 pb-2 px-4 border-b border-blue-100 bg-linear-to-r from-blue-50 to-white rounded-t-2xl relative">
              <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-blue-100 mb-1">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5 text-blue-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </span>
              <h2 className="text-lg font-bold text-blue-700 mb-0.5 tracking-tight">
                Editar temperatura
              </h2>
              <button
                type="button"
                onClick={() => setEditTempModal(null)}
                className="absolute top-2 right-2 text-slate-400 hover:text-blue-500 text-xl font-bold focus:outline-none transition-colors"
                aria-label="Cerrar"
              >
                <svg
                  width="22"
                  height="22"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M18 6 6 18"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="px-4 py-4 flex flex-col items-center max-h-[60vh] overflow-y-auto bg-white/90 w-full">
              <div className="w-full space-y-1 text-xs text-slate-700 mb-2">
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-slate-600">Caja:</span>
                  <span className="truncate">{editTempModal.name || "Sin nombre"}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-slate-600">Id:</span>
                  <span className="truncate">{editTempModal.autoId || "N/A"}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-slate-600">Pos:</span>
                  <span>{editTempModal.position}</span>
                </div>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const raw = formData.get("temp");
                  const temp =
                    raw === "" || raw == null ? NaN : Number(String(raw).replace(",", "."));
                  if (Number.isNaN(temp) || !Number.isFinite(temp)) {
                    return;
                  }
                  if (alertaSeleccionada && onOperarioResolveTemperatureAlert) {
                    onOperarioResolveTemperatureAlert({
                      position: editTempModal.position,
                      newTemp: temp,
                      zone: editTempModal.zone,
                      alertIndex: alertaSeleccionada.idx,
                    });
                    setShowSolveModal(false);
                    setAlertaSeleccionada(null);
                  } else {
                    handleUpdateAlertTemperature(editTempModal.position, temp, {
                      zone: editTempModal.zone,
                      name: editTempModal.name,
                      autoId: editTempModal.autoId,
                    });
                    if (alertaSeleccionada) {
                      markAlertSolved(
                        alertaSeleccionada.alerta,
                        alertaSeleccionada.idx,
                      );
                    }
                  }
                  setEditTempModal(null);
                }}
                className="flex flex-col gap-1 w-full"
              >
                <label className="text-xs font-medium text-slate-700 mb-1 flex items-center gap-1">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-4 h-4 text-blue-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 17a5 5 0 01-10 0c0-2.5 2-4.5 5-4.5s5 2 5 4.5z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 3v10"
                    />
                  </svg>
                  Temperatura (°C)
                </label>
                <div className="flex gap-1 items-center w-full">
                  <input
                    name="temp"
                    id="temp-input-operario"
                    defaultValue={editTempModal.temperature ?? ""}
                    type="number"
                    step="any"
                    inputMode="decimal"
                    className="w-full flex-1 rounded-lg border border-blue-200 px-2 py-1 text-sm font-semibold text-blue-900 shadow-sm focus:ring-2 focus:ring-blue-300 outline-none transition"
                    placeholder="Ej. 2,5 o subí imagen"
                  />
                  <button
                    type="button"
                    className="flex items-center justify-center gap-1 rounded-lg bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 border border-blue-200 hover:bg-blue-100 transition"
                    style={{ minWidth: 0, minHeight: 32 }}
                    onClick={() =>
                      document
                        .getElementById("temp-image-upload-operario")
                        ?.click()
                    }
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-3 h-3 mr-1 text-blue-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5-5m0 0l5 5m-5-5v12"
                      />
                    </svg>
                    Subir imagen
                  </button>
                </div>
                <input
                  id="temp-image-upload-operario"
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const fd = new FormData();
                    fd.append("image", file);
                    const tempInput = document.getElementById(
                      "temp-input-operario",
                    ) as HTMLInputElement | null;
                    if (tempInput)
                      tempInput.classList.add("ring-2", "ring-blue-400");
                    setEditTempLoading(true);
                    try {
                      const res = await fetch(
                        "https://asistencia-dos.onrender.com/api/image/analyze",
                        {
                          method: "POST",
                          body: fd,
                        },
                      );
                      const data = await res.json();
                      if (
                        data.numbersDetected &&
                        data.numbersDetected.length > 0
                      ) {
                        let tempValue = data.numbersDetected[0];
                        tempValue = tempValue.replace(",", ".");
                        if (tempInput) tempInput.value = tempValue;
                      } else {
                        alert("No se detecto temperatura en la imagen.");
                      }
                    } catch {
                      alert("Error al analizar la imagen.");
                    }
                    setEditTempLoading(false);
                    if (tempInput) {
                      setTimeout(
                        () =>
                          tempInput.classList.remove("ring-2", "ring-blue-400"),
                        1200,
                      );
                    }
                    e.target.value = "";
                  }}
                />
                {editTempLoading && (
                  <div className="flex items-center gap-1 mt-1 text-blue-500 text-xs">
                    <svg
                      className="animate-spin w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        d="M12 2a10 10 0 0110 10"
                        stroke="currentColor"
                        strokeWidth="4"
                        strokeLinecap="round"
                      />
                    </svg>
                    Analizando imagen...
                  </div>
                )}
                <div className="flex gap-1 mt-2 w-full">
                  <button
                    type="submit"
                    className="flex-1 rounded-lg bg-green-100 px-2 py-1 text-xs font-semibold text-green-700 shadow-sm transition hover:bg-green-200"
                  >
                    Guardar
                  </button>
                  <button
                    type="button"
                    className="flex-1 rounded-lg bg-pink-100 px-2 py-1 text-xs font-semibold text-pink-700 shadow-sm transition hover:bg-pink-200"
                    onClick={() => setEditTempModal(null)}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
