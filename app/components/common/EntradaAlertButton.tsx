import { FiAlertTriangle } from "react-icons/fi";
import React, { useState } from "react";

export interface EntradaAlert {
  name: string;
  autoId: string;
  temperature: number;
  position: number;
}

interface EntradaAlertProps {
  boxes: EntradaAlert[];
  threshold?: number;
  className?: string;
}

export default function EntradaAlertButton({ boxes, threshold = 5, className }: EntradaAlertProps) {
  const alerts = boxes.filter(box => typeof box.temperature === "number" && box.temperature > threshold);
  const [showModal, setShowModal] = useState(false);

  if (alerts.length === 0) return null;

  return (
    <>
      <button
        className={`flex items-center px-2 py-0.5 rounded-full bg-[#e6003a] hover:bg-[#c20030] transition text-white shadow focus:outline-none min-h-6 min-w-6 ${className || ''}`}
        style={{ fontSize: '12px', height: '24px' }}
        title="Ver alertas de temperatura"
        onClick={() => setShowModal(true)}
      >
        <FiAlertTriangle className="w-4 h-4 mr-1" />
        <span className="text-[11px] font-semibold leading-none">{alerts.length}</span>
      </button>
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-2 sm:p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full max-w-lg sm:max-w-2xl rounded-3xl bg-white p-0 shadow-2xl border border-blue-100 relative overflow-hidden"
            onClick={event => event.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-blue-50/80 px-6 py-4 border-b border-blue-100">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-red-100">
                  <FiAlertTriangle className="w-6 h-6 text-red-500" />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
                    Alertas
                  </p>
                  <h3 className="mt-1 text-xl sm:text-2xl font-bold text-slate-900">
                    Entrada
                  </h3>
                  <p className="mt-1 text-xs sm:text-sm text-slate-600">
                    Detalles de alertas activas en esta zona.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-full border border-slate-200 px-3 py-1 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-blue-700"
              >
                Cerrar
              </button>
            </div>
            <div className="p-6 grid gap-4 max-h-[60vh] overflow-y-auto bg-white">
              {alerts.length === 0 ? (
                <div className="text-center text-slate-400 py-8">
                  <svg className="mx-auto w-12 h-12 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <p className="mt-2 text-base font-semibold">No hay elementos para mostrar.</p>
                </div>
              ) : (
                alerts.map(item => (
                  <div
                    key={item.position}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm hover:shadow-md transition"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-semibold text-slate-900 truncate">
                        {item.name}
                      </p>
                      <p className="mt-1 text-sm text-slate-600 truncate">
                        Id: {item.autoId}
                      </p>
                      <p className="mt-2 text-xs font-semibold text-red-600">
                        Temp: {item.temperature} °C
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
