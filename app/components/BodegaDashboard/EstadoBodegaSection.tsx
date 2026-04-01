/* eslint-disable react-hooks/set-state-in-effect */
import { FiArchive, FiBox, FiAlertTriangle } from "react-icons/fi";
import React, { useState, useEffect } from "react";
import SlotsGrid from "../bodega/SlotsGrid";
import SelectedSlotCard from "../bodega/SelectedSlotCard";
import type { Box, Client, Slot, Role } from "../../interfaces/bodega";
import EntradaAlertButton from "../common/EntradaAlertButton";
import { clientLabelFromList, formatBoxQuantityKg } from "@/app/lib/bodegaDisplay";


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
  role?: Role;
  /** Para mostrar nombre de cliente en Entrada/Salida (el id se guarda en la caja). */
  clients?: Pick<Client, "id" | "name">[];
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
    role,
    clients = [],
  } = props;

  const ITEMS_PER_PAGE = 4;
  const [entradaPage, setEntradaPage] = useState(0);
  const [salidaPage, setSalidaPage] = useState(0);
  const MAP_PAGE_SIZE = 12;
  const [mapPage, setMapPage] = useState(0);

  const sortedInboundBoxes = sortByPosition([...inboundBoxes]);
  const sortedOutboundBoxes = sortByPosition([...outboundBoxes]);

  const entradaTotalPages = Math.max(
    1,
    Math.ceil(sortedInboundBoxes.length / ITEMS_PER_PAGE),
  );
  const entradaStart = entradaPage * ITEMS_PER_PAGE;
  const inboundPageItems = sortedInboundBoxes.slice(
    entradaStart,
    entradaStart + ITEMS_PER_PAGE,
  );

  const salidaTotalPages = Math.max(
    1,
    Math.ceil(sortedOutboundBoxes.length / ITEMS_PER_PAGE),
  );
  const salidaStart = salidaPage * ITEMS_PER_PAGE;
  const outboundPageItems = sortedOutboundBoxes.slice(
    salidaStart,
    salidaStart + ITEMS_PER_PAGE,
  );

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil((slots?.length || 0) / MAP_PAGE_SIZE) - 1);
    if (mapPage > maxPage) {
      setMapPage(maxPage);
      setSelectedPosition(null);
    }
  }, [mapPage, slots?.length, MAP_PAGE_SIZE, setSelectedPosition]);

  useEffect(() => {
    const maxPage = Math.max(
      0,
      Math.ceil((inboundBoxes?.length || 0) / ITEMS_PER_PAGE) - 1,
    );
    if (entradaPage > maxPage) {
      setEntradaPage(maxPage);
    }
  }, [entradaPage, inboundBoxes?.length]);

  useEffect(() => {
    const maxPage = Math.max(
      0,
      Math.ceil((outboundBoxes?.length || 0) / ITEMS_PER_PAGE) - 1,
    );
    if (salidaPage > maxPage) {
      setSalidaPage(maxPage);
    }
  }, [salidaPage, outboundBoxes?.length]);

  // Buscar alertas de temperatura alta
  const highTempAlerts = inboundBoxes
    .filter((box) => typeof box.temperature === "number" && box.temperature > 5)
    .map((box) => ({
      name: box.name || "Sin nombre",
      autoId: box.autoId,
      temperature: box.temperature,
      position: box.position,
      client: box.client,
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
                              <p className="mt-1 text-xs text-slate-600 truncate">
                                Cliente: {clientLabelFromList(item.client || "", clients)}
                              </p>
                              <p className="mt-1 text-xs text-slate-600 truncate">
                                Cantidad: {formatBoxQuantityKg(item.quantityKg)}
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
          {sortedInboundBoxes.length === 0 ? (
            <div className="text-xs text-emerald-500">
              No hay cajas en ingreso.
            </div>
          ) : (
            <>
              {inboundPageItems.map((box, idx) => {
                const isHighTemp = typeof box.temperature === "number" && box.temperature > 5;
                return (
                  <div
                    key={`${box.position}-${box.autoId ?? "no-id"}-${idx}`}
                    className="rounded-xl border border-emerald-200 bg-white p-1 sm:p-2 text-[11px] sm:text-xs text-emerald-700 w-full"
                  >
                    <div className="font-semibold">
                      {box.name || "Sin nombre"}
                    </div>
                    <div>Id: {box.autoId}</div>
                    <div>Cliente: {clientLabelFromList(box.client || "", clients)}</div>
                    <div>Cantidad: {formatBoxQuantityKg(box.quantityKg)}</div>
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
              })}
              {sortedInboundBoxes.length > ITEMS_PER_PAGE ? (
                <div className="flex items-center justify-between mt-2 text-[11px] sm:text-xs text-emerald-700">
                  <button
                    type="button"
                    className="rounded-lg border border-emerald-200 px-2 py-1 bg-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => setEntradaPage((prev) => Math.max(0, prev - 1))}
                    disabled={entradaPage === 0}
                  >
                    Anterior
                  </button>
                  <span className="font-semibold">
                    {entradaPage + 1} de {entradaTotalPages}
                  </span>
                  <button
                    type="button"
                    className="rounded-lg border border-emerald-200 px-2 py-1 bg-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() =>
                      setEntradaPage((prev) =>
                        Math.min(entradaTotalPages - 1, prev + 1),
                      )
                    }
                    disabled={entradaPage >= entradaTotalPages - 1}
                  >
                    Siguiente
                  </button>
                </div>
              ) : null}
            </>
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
          role={role}
          page={mapPage}
          pageSize={MAP_PAGE_SIZE}
          onPageChange={(page) => setMapPage(page)}
        />
        <SelectedSlotCard
          slot={selectedSlot}
          onClose={() => setSelectedPosition(null)}
          onSave={() => undefined}
          canEdit={false}
          clients={clients}
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
          {sortedOutboundBoxes.length === 0 ? (
            <p className="text-xs text-pink-500">
              No hay cajas en salida.
            </p>
          ) : (
            <>
              {outboundPageItems.map((box, idx) => (
                <div
                  key={`${box.position}-${box.autoId ?? "no-id"}-${idx}`}
                  className="rounded-xl border border-pink-200 bg-white p-2 text-xs text-pink-700 w-full"
                >
                  <div className="font-semibold">
                    {box.name || "Sin nombre"}
                  </div>
                  <div>Id: {box.autoId}</div>
                  <div>Cliente: {clientLabelFromList(box.client || "", clients)}</div>
                  <div>Cantidad: {formatBoxQuantityKg(box.quantityKg)}</div>
                  <div>
                    Temp:{" "}
                    {typeof box.temperature === "number"
                      ? `${box.temperature} °C`
                      : "Sin temperatura"}
                  </div>
                </div>
              ))}
              {sortedOutboundBoxes.length > ITEMS_PER_PAGE ? (
                <div className="flex items-center justify-between mt-2 text-[11px] sm:text-xs text-pink-700">
                  <button
                    type="button"
                    className="rounded-lg border border-pink-200 px-2 py-1 bg-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => setSalidaPage((prev) => Math.max(0, prev - 1))}
                    disabled={salidaPage === 0}
                  >
                    Anterior
                  </button>
                  <span className="font-semibold">
                    {salidaPage + 1} de {salidaTotalPages}
                  </span>
                  <button
                    type="button"
                    className="rounded-lg border border-pink-200 px-2 py-1 bg-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() =>
                      setSalidaPage((prev) =>
                        Math.min(salidaTotalPages - 1, prev + 1),
                      )
                    }
                    disabled={salidaPage >= salidaTotalPages - 1}
                  >
                    Siguiente
                  </button>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </section>
  );
}