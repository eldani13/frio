import type { RequestsQueueProps } from "../../interfaces/bodega/RequestsQueue";
import { FiMapPin, FiBox, FiUser, FiCalendar, FiPackage, FiArrowRight, FiAlertCircle, FiPhoneCall } from "react-icons/fi";
import type { BodegaOrder, OrderType } from "../../interfaces/bodega";
import { IoCloseOutline } from "react-icons/io5";


const TYPE_LABELS: Record<OrderType, string> = {
  a_bodega: "A bodega",
  a_salida: "A salida",
  revisar: "Revisar",
};

const formatOrderDetails = (order: BodegaOrder): string => {
  const target = order.targetPosition ?? "-";
  const sourceLabel =
    order.sourceZone === "bodega"
      ? "Bodega"
      : order.sourceZone === "salida"
        ? "Salida"
        : "Ingreso";
  if (order.type === "revisar") {
    return `Revisar ${sourceLabel} ${order.sourcePosition}`;
  }
  if (order.type === "a_bodega") {
    return `${sourceLabel} ${order.sourcePosition} · Destino bodega ${target}`;
  }
  return `${sourceLabel} ${order.sourcePosition} · Destino salida ${target}`;
};

const orderTimestamp = (order: BodegaOrder) =>
  typeof order.createdAtMs === "number" ? order.createdAtMs : Date.now();

import React, { useState } from "react";

export default function RequestsQueue({
  requests,
  canExecute,
  onExecute,
  onReport,
}: RequestsQueueProps) {
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertasOperario, setAlertasOperario] = useState<any[]>([]);

  React.useEffect(() => {
    if (showAlertModal && typeof window !== 'undefined') {
      try {
        const stored = window.localStorage.getItem('alertas_operario');
        if (stored) {
          setAlertasOperario(JSON.parse(stored));
        } else {
          setAlertasOperario([]);
        }
      } catch {
        setAlertasOperario([]);
      }
    }
  }, [showAlertModal]);
  const orderedRequests = [...requests].sort(
    (a, b) => orderTimestamp(a) - orderTimestamp(b)
  );
  const nextRequest = orderedRequests[0];

  return (
    <div>
      {/* Modal de Alertas */}
      {showAlertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/10 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl p-0 max-w-lg w-full relative animate-fade-in-up border border-red-100">
            {/* Header */}
            <div className="flex flex-col items-center justify-center pt-8 pb-4 px-8 border-b border-red-100 bg-gradient-to-r from-red-50 to-white rounded-t-3xl">
              <span className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 shadow animate-pulse mb-2">
                <FiAlertCircle className="w-9 h-9 text-red-500" />
              </span>
              <h2 className="text-2xl font-extrabold text-red-700 drop-shadow mb-1">Alertas asignadas</h2>
              <p className="text-sm text-slate-500 font-medium text-center">Estas son las alertas de temperatura que tienes asignadas actualmente.</p>
              <button
                className="absolute top-4 right-4 text-slate-400 hover:text-red-500 text-2xl font-bold focus:outline-none transition-colors"
                onClick={() => setShowAlertModal(false)}
                aria-label="Cerrar"
              >
                <IoCloseOutline />
              </button>
            </div>
            <div className="px-8 py-6 min-h-30 flex flex-col items-center">
              {alertasOperario.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <svg className="w-16 h-16 text-slate-200 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <p className="text-slate-400 text-lg font-semibold text-center">No hay alertas asignadas</p>
                  <p className="text-slate-400 text-sm text-center mt-1">Cuando se te asigne una alerta, aparecerá aquí.</p>
                </div>
              ) : (
                <ul className="mt-2 w-full space-y-3">
                  {alertasOperario.map((alerta, idx) => (
                    <li key={idx} className="bg-linear-to-r from-red-50 to-white border border-red-200 rounded-xl px-5 py-4 text-red-800 flex items-center gap-4 shadow-sm hover:shadow-md transition-all">
                      <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-red-100">
                        <FiAlertCircle className="w-6 h-6 text-red-500" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-base text-red-700">Alerta {alerta.position}</span>
                          {alerta.name && (
                            <span className="ml-2 text-xs text-slate-700 bg-slate-100 rounded px-2 py-0.5">{alerta.name}</span>
                          )}
                        </div>
                        {typeof alerta.temperature === 'number' && (
                          <span className="inline-block text-xs font-semibold text-white bg-red-500 rounded px-2 py-0.5 animate-pulse shadow">{alerta.temperature} °C</span>
                        )}
                        <div className="text-xs text-slate-500 mt-1">Alerta de temperatura alta</div>
                      </div>
                      <button
                        className="ml-2 px-3 py-1 rounded-lg bg-green-500 hover:bg-green-600 text-white text-xs font-bold shadow transition-all focus:outline-none focus:ring-2 focus:ring-green-300"
                        onClick={() => {
                          let nuevasAlertas = alertasOperario.filter((a, i) => i !== idx);
                          if (typeof window !== 'undefined') {
                            window.localStorage.setItem('alertas_operario', JSON.stringify(nuevasAlertas));
                            // Guardar la posición solucionada en alertas_operario_solved
                            let solved = [];
                            try {
                              const prev = window.localStorage.getItem('alertas_operario_solved');
                              solved = prev ? JSON.parse(prev) : [];
                            } catch { solved = []; }
                            if (!solved.includes(alerta.position)) {
                              solved.push(alerta.position);
                              window.localStorage.setItem('alertas_operario_solved', JSON.stringify(solved));
                            }
                            // Notificar a otros componentes (como el jefe) que una alerta fue solucionada
                            window.localStorage.setItem('alerta_solved_event', JSON.stringify({ position: alerta.position, timestamp: Date.now() }));
                          }
                          setAlertasOperario(nuevasAlertas);
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
            {/* Close button for mobile UX */}
            <div className="flex justify-center pb-6 pt-2 px-8">
              <button
                className="w-full sm:w-auto rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-lg py-3 px-8 shadow transition-all focus:outline-none focus:ring-2 focus:ring-red-300"
                onClick={() => setShowAlertModal(false)}
              >
                Cerrar
              </button>
            </div>
          </div>
          {/* Ya no se cierra al hacer click en el fondo */}
        </div>
      )}
      <div>
        {canExecute ? (
          <button
            type="button"
            disabled={!nextRequest}
            onClick={e => {
              if (!nextRequest) return;
              const btn = e.currentTarget;
              btn.classList.add("zoom-out");
              setTimeout(() => {
                btn.classList.remove("zoom-out");
                onExecute(nextRequest.id);
              }, 180);
            }}
            className="rounded-2xl bg-white p-6 sm:p-8 shadow-sm w-full border border-emerald-200 transition-transform duration-150 hover:shadow-lg focus:shadow-lg active:shadow-lg hover:scale-[0.98] active:scale-[0.95]"
            style={{ outline: "none" }}
          >
            <div className="flex items-center justify-between mb-6">
              <span className="px-6 py-2 rounded-xl bg-emerald-600 text-white font-semibold text-lg flex items-center gap-2">
                <FiBox className="w-5 h-5" />
                {nextRequest ? TYPE_LABELS[nextRequest.type] : "A bodega"}
              </span>
              <div className="flex items-center gap-3">
                <span className="px-4 py-1 rounded-xl border border-yellow-300 bg-yellow-50 text-yellow-700 font-semibold text-base flex items-center gap-2">
                  <FiAlertCircle className="w-5 h-5" /> Pendiente
                </span>
                <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 font-bold text-base border border-emerald-200">
                  {requests.length} tareas
                </span>
              </div>
            </div>
            {!nextRequest ? (
              <div className="flex min-h-[60vh] items-center justify-center rounded-3xl border border-slate-200 bg-slate-50 px-8 text-center">
                <p className="text-3xl font-semibold text-slate-700">
                  No hay solicitudes pendientes.
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl  p-4 sm:p-8">
                <div className="flex flex-col items-center">
                  <span className="text-slate-500 font-semibold text-lg mb-4">Transferencia de:</span>
                  <div className="flex items-center justify-center gap-6 w-full">
                    {/* Origen */}
                    <div className="flex flex-col items-center bg-red-100 border border-red-200 rounded-2xl px-8 py-6 w-64">
                      <FiMapPin className="w-8 h-8 text-red-400 mb-2" />
                      <span className="text-xs text-red-400 mb-1">ORIGEN</span>
                      <span className="text-2xl font-bold text-red-700">{nextRequest.sourceZone === "bodega" ? "Bodega" : nextRequest.sourceZone === "salida" ? "Salida" : "Ingreso"} {nextRequest.sourcePosition}</span>
                    </div>
                    {/* Flecha */}
                    <FiArrowRight className="w-10 h-10 text-slate-300" />
                    {/* Destino */}
                    <div className="flex flex-col items-center bg-emerald-50 border border-emerald-200 rounded-2xl px-8 py-6 w-64">
                      <FiBox className="w-8 h-8 text-emerald-400 mb-2" />
                      <span className="text-xs text-emerald-400 mb-1">DESTINO</span>
                      <span className="text-2xl font-bold text-emerald-700">{
                        nextRequest.type === "a_bodega"
                          ? `bodega ${nextRequest.targetPosition}`
                          : nextRequest.type === "a_salida"
                            ? `salida ${nextRequest.targetPosition}`
                            : nextRequest.targetPosition && String(nextRequest.targetPosition).trim() !== "" && nextRequest.targetPosition !== undefined && nextRequest.targetPosition !== null
                              ? `revisar ${nextRequest.targetPosition}`
                              : "revisar"
                      }</span>
                    </div>
                  </div>
                  <hr className="my-8 border-slate-200 w-full" />
                  {/* Detalles */}
                  <div className="flex flex-wrap justify-center gap-8 w-full mb-6">
                    <div className="flex items-center gap-2">
                      <FiUser className="w-5 h-5 text-slate-400" />
                      <span className="text-xs text-slate-500">Solicitado por</span>
                      <span className="font-semibold text-slate-700">{nextRequest.createdBy}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FiCalendar className="w-5 h-5 text-slate-400" />
                      <span className="text-xs text-slate-500">Fecha y hora</span>
                      <span className="font-semibold text-slate-700">{nextRequest.createdAt}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FiPackage className="w-5 h-5 text-slate-400" />
                      <span className="text-xs text-slate-500">ID de solicitud</span>
                      <span className="font-semibold text-slate-700">{nextRequest.id}</span>
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
            className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-red-100 hover:bg-red-200 text-red-700 font-bold text-lg py-4 shadow transition-all border-2 border-red-200 focus:outline-none focus:ring-2 focus:ring-red-300"
            style={{ minWidth: 0 }}
            onClick={() => setShowAlertModal(true)}
          >
            <FiAlertCircle className="w-6 h-6" />
            Alertas
            {alertasOperario.length > 0 && (
              <span className="ml-2 px-2 py-0.5 rounded-full bg-red-500 text-white text-base font-bold animate-pulse" style={{minWidth: 28, textAlign: 'center'}}>
                {alertasOperario.length}
              </span>
            )}
          </button>
          <button
            type="button"
            className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-yellow-100 hover:bg-yellow-200 text-yellow-700 font-bold text-lg py-4 shadow transition-all border-2 border-yellow-200 focus:outline-none focus:ring-2 focus:ring-yellow-300"
            style={{ minWidth: 0 }}
            onClick={() => {
              if (typeof window !== 'undefined') {
                const llamada = {
                  timestamp: Date.now(),
                  from: 'operario',
                  message: 'Llamado del operario',
                };
                window.localStorage.setItem('llamada_jefe', JSON.stringify(llamada));
              }
            }}
          >
            <FiPhoneCall className="w-6 h-6" />
            Llamar
          </button>
        </div>
      </div>
    </div>
  );
}
