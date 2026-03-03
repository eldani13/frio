import { FiArchive, FiBox, FiAlertTriangle, FiX } from "react-icons/fi";
import React, { useState } from "react";
import SlotsGrid from "../bodega/SlotsGrid";
import SelectedSlotCard from "../bodega/SelectedSlotCard";
import type { Box, Slot } from "../../interfaces/bodega";
import EntradaAlertButton from "../common/EntradaAlertButton";


type Props = {
  inboundBoxes: Box[];
  slots: Slot[];
  selectedPosition: number | null;
  handleSelectSlot: (position: number) => void;
  renderStatusButtons: (zone: "bodega") => React.ReactNode;
  selectedSlot: Slot | null;
  setSelectedPosition: (position: number | null) => void;
  outboundBoxes: Box[];
  sortByPosition: <T extends { position: number }>(items: T[]) => T[];
};


export default function EstadoBodegaSection(props: Props) {
  const {
    inboundBoxes,
    slots,
    selectedPosition,
    handleSelectSlot,
    renderStatusButtons,
    selectedSlot,
    setSelectedPosition,
    outboundBoxes,
    sortByPosition,
  } = props;

  // Buscar alertas de temperatura alta
  const highTempAlerts = inboundBoxes
    .filter((box) => typeof box.temperature === "number" && box.temperature > 5)
    .map((box) => ({
      name: box.name || "Sin nombre",
      autoId: box.autoId,
      temperature: box.temperature,
      position: box.position,
    }));

  const [showAlertModal, setShowAlertModal] = useState(false);

  return (
    <section className="grid gap-6 xl:grid-cols-[1fr_1.8fr_1fr] 2xl:grid-cols-[1fr_2.1fr_1fr]">
      <div className="flex flex-col items-start rounded-3xl border border-green-200 bg-emerald-50 p-2 sm:p-4 min-h-45 w-full max-w-full sm:max-w-xs lg:max-w-60">
        <div className="flex items-center justify-between w-full mb-2">
          <h3 className="text-sm sm:text-lg font-semibold text-emerald-600 flex items-center gap-2">
            <span className="inline-block">
              <FiArchive className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
            </span>
            Entrada
          </h3>
          {/* headerActions: icono de alerta y otros posibles botones */}
         <EntradaAlertButton boxes={inboundBoxes} />
        </div>
              {/* Modal de alertas de temperatura alta - estilo personalizado */}
              {showAlertModal && (
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-2 sm:p-4"
                  role="dialog"
                  aria-modal="true"
                  onClick={() => setShowAlertModal(false)}
                >
                  <div
                    className="w-full max-w-lg sm:max-w-2xl rounded-3xl bg-white p-0 shadow-2xl border border-blue-100 relative overflow-hidden"
                    onClick={(event) => event.stopPropagation()}
                  >
                    {/* Header sticky con icono */}
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
                            Ingreso
                          </h3>
                          <p className="mt-1 text-xs sm:text-sm text-slate-600">
                            Detalles de alertas activas en esta zona.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowAlertModal(false)}
                        className="rounded-full border border-slate-200 px-3 py-1 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-blue-700"
                      >
                        Cerrar
                      </button>
                    </div>
                    {/* Lista de items */}
                    <div className="p-6 grid gap-4 max-h-[60vh] overflow-y-auto bg-white">
                      {highTempAlerts.length === 0 ? (
                        <div className="text-center text-slate-400 py-8">
                          <svg className="mx-auto w-12 h-12 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          <p className="mt-2 text-base font-semibold">No hay elementos para mostrar.</p>
                        </div>
                      ) : (
                        highTempAlerts.map((item) => (
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
        <div className="w-full flex flex-col gap-1 sm:gap-2">
          {inboundBoxes.length === 0 ? (
            <div className="text-xs text-emerald-500">
              No hay cajas en ingreso.
            </div>
          ) : (
            inboundBoxes.slice(0, 4).map((box) => {
              const isHighTemp = typeof box.temperature === "number" && box.temperature > 5;
              return (
                <div
                  key={box.position}
                  className="rounded-xl border border-emerald-200 bg-white p-1 sm:p-2 text-[11px] sm:text-xs text-emerald-700 w-full"
                >
                  <div className="font-semibold">
                    {box.name || "Sin nombre"}
                  </div>
                  <div>Id: {box.autoId}</div>
                  <div>
                    Temp:{" "}
                    {typeof box.temperature === "number"
                      ? <span className={isHighTemp ? "text-green-700 font-bold" : undefined}>
                          {box.temperature} °C
                        </span>
                      : "Sin temperatura"}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="min-w-0 flex flex-col gap-4">
        <SlotsGrid
          slots={slots}
          selectedPosition={selectedPosition}
          onSelect={handleSelectSlot}
          headerActions={renderStatusButtons("bodega")}
          occupiedCount={slots.filter((s) => s.autoId && s.autoId.trim() !== "").length}
          totalSlots={slots.length}
          role={typeof window !== "undefined" && window.localStorage ? (JSON.parse(window.localStorage.getItem("bodegaRoleV1") ?? '{}').role ?? undefined) : undefined}
        />
        <SelectedSlotCard
          slot={selectedSlot}
          onClose={() => setSelectedPosition(null)}
          onSave={() => undefined}
          canEdit={false}
        />
      </div>

      <div className="flex flex-col items-start rounded-3xl border border-pink-200 bg-pink-50 p-4 sm:p-6 min-h-30 w-full max-w-full sm:max-w-xs lg:max-w-60">
        <h3 className="text-base sm:text-lg font-semibold text-pink-600 mb-2 flex items-center gap-2">
          <span className="inline-block">
            <FiBox className="w-5 h-5 text-pink-400" />
          </span>
          Salida
        </h3>

        <div className="w-full flex flex-col gap-2">
          {outboundBoxes.length === 0 ? (
            <p className="text-xs text-pink-500">
              No hay cajas en salida.
            </p>
          ) : (
            sortByPosition(outboundBoxes).slice(0, 4).map((box) => (
              <div
                key={box.position}
                className="rounded-xl border border-pink-200 bg-white p-2 text-xs text-pink-700 w-full"
              >
                <div className="font-semibold">
                  {box.name || "Sin nombre"}
                </div>
                <div>Id: {box.autoId}</div>
                <div>
                  Temp:{" "}
                  {typeof box.temperature === "number"
                    ? `${box.temperature} °C`
                    : "Sin temperatura"}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}