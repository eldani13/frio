import { FiAlertTriangle } from "react-icons/fi";
import React, { useState } from "react";

export interface EntradaAlert {
  name: string;
  autoId: string;
  temperature: number;
  position: number;
  client?: string;
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
          className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/10 animate-fade-in p-2 sm:p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full max-w-lg sm:max-w-xl rounded-3xl border border-blue-100 bg-white/90 shadow-2xl backdrop-blur-lg relative overflow-hidden animate-fade-in-up"
            onClick={event => event.stopPropagation()}
            style={{ fontFamily: '"Space Grotesk", "Work Sans", sans-serif' }}
          >
            {/* Header con gradiente y botón cerrar flotante */}
            <div className="flex flex-col items-center justify-center pt-8 pb-4 px-8 border-b border-blue-100 bg-gradient-to-r from-blue-50 to-white rounded-t-3xl relative">
              <span className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-red-100 shadow animate-pulse mb-2">
                <FiAlertTriangle className="w-8 h-8 text-red-500" />
              </span>
              <h2 className="text-2xl font-extrabold text-red-700 drop-shadow mb-1 tracking-tight">Alertas de Entrada</h2>
              <p className="text-sm text-slate-500 font-medium text-center">Estas son las alertas de temperatura activas en la zona de entrada.</p>
              <button
                className="absolute top-4 right-4 text-slate-400 hover:text-red-500 text-2xl font-bold focus:outline-none transition-colors"
                onClick={() => setShowModal(false)}
                aria-label="Cerrar"
              >
                <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 6 6 18" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 6l12 12" /></svg>
              </button>
            </div>
            {/* Lista de alertas */}
            <div className="px-8 py-6 min-h-30 flex flex-col items-center max-h-[60vh] overflow-y-auto bg-white/80">
              {alerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <svg className="w-16 h-16 text-slate-200 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <p className="text-slate-400 text-lg font-semibold text-center">No hay alertas activas</p>
                  <p className="text-slate-400 text-sm text-center mt-1">Cuando haya una alerta, aparecerá aquí.</p>
                </div>
              ) : (
                <ul className="mt-2 w-full space-y-3">
                  {alerts.map(item => (
                    <li key={item.position} className="bg-gradient-to-r from-red-50 to-white border border-red-200 rounded-xl px-5 py-4 text-red-800 flex items-center gap-4 shadow-sm hover:shadow-md transition-all">
                      <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-red-100">
                        <FiAlertTriangle className="w-6 h-6 text-red-500" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-base text-red-700 truncate">{item.name}</span>
                          <span className="ml-2 text-xs text-slate-700 bg-slate-100 rounded px-2 py-0.5">Id: {item.autoId}</span>
                        </div>
                        {item.client ? (
                          <div className="text-[11px] text-slate-600 mb-1">Cliente: {item.client}</div>
                        ) : null}
                        {typeof item.temperature === 'number' && (
                          <span className="inline-block text-xs font-semibold text-white bg-red-500 rounded px-2 py-0.5 animate-pulse shadow">{item.temperature} °C</span>
                        )}
                        <div className="text-xs text-slate-500 mt-1">Alerta de temperatura alta</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
