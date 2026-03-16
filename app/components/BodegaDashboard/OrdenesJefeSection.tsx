/* eslint-disable @typescript-eslint/no-explicit-any */
import { FiArchive, FiBox, FiRepeat, FiSearch, FiAlertTriangle } from "react-icons/fi";

import React, { useState, useMemo } from "react";
import EntradaAlertButton from "../common/EntradaAlertButton";
import { RiUserReceivedLine } from "react-icons/ri";

const HIGH_TEMP_THRESHOLD = 5;


// Estado para forzar re-render cuando se asigna una alerta debe ir dentro del componente

export default function OrdenesJefeSection(props: {
  isJefe: boolean;
  inboundBoxes: any[];
  outboundBoxes: any[];
  slots: any[];
  alertasOperario: Array<{ position: number; [key: string]: unknown }>;
  alertasOperarioSolved: number[];
  llamadasJefe?: Array<Record<string, unknown>>;
  onUpdateAlertasOperario: (
    next: Array<{ position: number; [key: string]: unknown }>,
  ) => void;
  onUpdateLlamadasJefe: (next: Array<Record<string, unknown>>) => void;
  selectedBoxModal: any;
  setSelectedBoxModal: (box: any) => void;
  editTempModal: any;
  setEditTempModal: (modal: any) => void;
  handleUpdateBoxTemperature: (position: number, temp: number) => void;
  availableInboundForOrders: any[];
  ingresoOrderSourcePosition: number;
  setIngresoOrderSourcePosition: (v: number) => void;
  availableBodegaTargets: number[];
  ingresoOrderTargetPosition: number;
  setIngresoOrderTargetPosition: (v: number) => void;
  sortByPosition: <T extends { position: number }>(items: T[]) => T[];
  handleCreateOrder: (params: any) => void;
  bodegaOrderSourcePosition: number;
  setBodegaOrderSourcePosition: (v: number) => void;
  availableBodegaForOrders: any[];
  bodegaOrderTargetPosition: number;
  setBodegaOrderTargetPosition: (v: number) => void;
  reviewSourcePosition: number;
  setReviewSourcePosition: (v: number) => void;
  reviewBodegaList: any[];
  handleCreateReviewOrder: () => void;
  salidaSourcePosition: number;
  setSalidaSourcePosition: (v: number) => void;
  salidaTargetPosition: number;
  handleCreateOrderSalida: (params: any) => void;
  orderModalType: string | null;
  setOrderModalType: (type: string | null) => void;
  headerActions?: React.ReactNode;
}) {
  const ITEMS_PER_PAGE = 4;
  const [entradaPage, setEntradaPage] = useState(0);
  const [salidaPage, setSalidaPage] = useState(0);
  const {
    isJefe,
    inboundBoxes,
    outboundBoxes,
    slots,
    alertasOperario,
    alertasOperarioSolved,
    llamadasJefe = [],
    onUpdateAlertasOperario,
    onUpdateLlamadasJefe,
    selectedBoxModal,
    setSelectedBoxModal,
    editTempModal,
    setEditTempModal,
    handleUpdateBoxTemperature,
    availableInboundForOrders,
    ingresoOrderSourcePosition,
    setIngresoOrderSourcePosition,
    availableBodegaTargets,
    ingresoOrderTargetPosition,
    setIngresoOrderTargetPosition,
    sortByPosition,
    handleCreateOrder,
    bodegaOrderSourcePosition,
    setBodegaOrderSourcePosition,
    availableBodegaForOrders,
    bodegaOrderTargetPosition,
    setBodegaOrderTargetPosition,
    reviewSourcePosition,
    setReviewSourcePosition,
    reviewBodegaList,
    handleCreateReviewOrder,
    salidaSourcePosition,
    setSalidaSourcePosition,
    salidaTargetPosition,
    handleCreateOrderSalida,
    orderModalType,
    setOrderModalType,
  } = props;

  // Mark optional handler as intentionally unused in this view
  void handleCreateOrderSalida;

  // Estado para loading del modal de editar temperatura
  const [editTempLoading, setEditTempLoading] = React.useState(false);

  type ZoneKey = "entrada" | "bodega" | "salida";
  type ModalKind = "alertas" | "tareas";

  type DetailItem = {
    id: string;
    title: string;
    description: string;
    meta?: string;
  };

  const [statusModal, setStatusModal] = useState<{
    zone: ZoneKey;
    kind: ModalKind;
  } | null>(null);

  React.useEffect(() => {
    const maxPage = Math.max(
      0,
      Math.ceil((inboundBoxes?.length || 0) / ITEMS_PER_PAGE) - 1,
    );
    if (entradaPage > maxPage) {
      setEntradaPage(maxPage);
    }
  }, [entradaPage, inboundBoxes?.length]);

  React.useEffect(() => {
    const maxPage = Math.max(
      0,
      Math.ceil((outboundBoxes?.length || 0) / ITEMS_PER_PAGE) - 1,
    );
    if (salidaPage > maxPage) {
      setSalidaPage(maxPage);
    }
  }, [salidaPage, outboundBoxes?.length]);

  const zoneLabels: Record<ZoneKey, string> = {
    entrada: "Entrada",
    bodega: "Bodega",
    salida: "Salida",
  };

  const zoneAlertItems: Record<ZoneKey, DetailItem[]> = useMemo(() => {
    const items: Record<ZoneKey, DetailItem[]> = {
      entrada: [],
      bodega: [],
      salida: [],
    };
    return items;
  }, []);

  // Dummy placeholder for zoneTaskItems to avoid compile error
  const zoneTaskItems: Record<ZoneKey, DetailItem[]> = useMemo(() => {
    return {
      entrada: [],
      bodega: [],
      salida: [],
    };
  }, []);

  const sortedInboundBoxes = useMemo(
    () => sortByPosition([...inboundBoxes]),
    [inboundBoxes, sortByPosition],
  );

  const sortedOutboundBoxes = useMemo(
    () => sortByPosition([...outboundBoxes]),
    [outboundBoxes, sortByPosition],
  );

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

  const bodegaHighTempAlerts = useMemo(() => {
    const solvedPositions = new Set(alertasOperarioSolved ?? []);
    return slots
      .filter(
        (slot) =>
          typeof slot.temperature === "number" &&
          slot.temperature > HIGH_TEMP_THRESHOLD,
      )
      .filter((slot) => !solvedPositions.has(slot.position))
      .map((slot) => ({
        name: slot.name || "Sin nombre",
        autoId: slot.autoId,
        temperature: slot.temperature,
        position: slot.position,
      }));
  }, [alertasOperarioSolved, slots]);

  const [showAlertModal, setShowAlertModal] = useState(false);

  // Estado para mostrar el modal de llamados
  const [showLlamadosModal, setShowLlamadosModal] = React.useState(false);

  return (
    <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
      {isJefe && (
        <div className="col-span-4 mb-8">
          <div className="flex flex-col gap-4 sm:grid sm:grid-cols-2 lg:grid-cols-4">
            {/* Ingresos */}
            <button
              type="button"
              className="flex flex-col items-start rounded-xl p-3 shadow-sm bg-white text-slate-900 h-20 border border-slate-200 group transition hover:bg-slate-50"
              onClick={() => setOrderModalType("ingresos")}
            >
              <div className="flex items-center gap-1 mb-1">
                <FiArchive className="w-5 h-5 text-slate-500" />
                <span className="text-base font-semibold">Ingresos</span>
              </div>
              <span className="text-[11px] text-slate-500">
                Registrar entrada
              </span>
            </button>
            {/* Bodega a Bodega */}
            <button
              type="button"
              className="flex flex-col items-start rounded-xl p-3 shadow-sm bg-white text-slate-900 h-20 border border-slate-200 group transition hover:bg-slate-50"
              onClick={() => setOrderModalType("bodega")}
            >
              <div className="flex items-center gap-1 mb-1">
                <FiRepeat className="w-5 h-5 text-slate-500" />
                <span className="text-base font-semibold">Bodega a Bodega</span>
              </div>
              <span className="text-[11px] text-slate-500">
                Transferir cajas
              </span>
            </button>
            {/* Revisar */}
            <button
              type="button"
              className="flex flex-col items-start rounded-xl p-3 shadow-sm bg-white text-slate-900 h-20 border border-slate-200 group transition hover:bg-slate-50"
              onClick={() => setOrderModalType("revisar")}
            >
              <div className="flex items-center gap-1 mb-1">
                <FiSearch className="w-5 h-5 text-slate-500" />
                <span className="text-base font-semibold">Revisar</span>
              </div>
              <span className="text-[11px] text-slate-500">
                Consultar inventario
              </span>
            </button>
            {/* Crear Salida */}
            <button
              type="button"
              className="flex flex-col items-start rounded-xl p-3 shadow-sm bg-white text-slate-900 h-20 border border-slate-200 group transition hover:bg-slate-50"
              onClick={() => setOrderModalType("salida")}
            >
              <div className="flex items-center gap-1 mb-1">
                <FiBox className="w-5 h-5 text-slate-500" />
                <span className="text-base font-semibold">Crear Salida</span>
              </div>
              <span className="text-[11px] text-slate-500">
                Registrar salida
              </span>
            </button>
          </div>
        </div>
      )}
      {/* Mapa de Bodega para jefe */}
      {isJefe && (
        <div className="col-span-4 mb-8">
          {/* Modal for selected box details */}
          {selectedBoxModal && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/10 animate-fade-in p-2 sm:p-4"
              role="dialog"
              aria-modal="true"
              onClick={() => setSelectedBoxModal(null)}
            >
              <div
                className="w-full max-w-lg sm:max-w-xl rounded-3xl border border-blue-100 bg-white/90 shadow-2xl backdrop-blur-lg relative overflow-hidden animate-fade-in-up"
                onClick={(e) => e.stopPropagation()}
                style={{ fontFamily: '"Space Grotesk", "Work Sans", sans-serif' }}
              >
                {/* Header con gradiente y botón cerrar flotante */}
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
                    Detalles de la caja
                  </h2>
                  <button
                    type="button"
                    onClick={() => setSelectedBoxModal(null)}
                    className="absolute top-4 right-4 text-slate-400 hover:text-blue-500 text-2xl font-bold focus:outline-none transition-colors"
                    aria-label="Cerrar"
                  >
                    <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 6 6 18" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 6l12 12" /></svg>
                  </button>
                </div>
                {/* Detalles */}
                <div className="px-8 py-6 min-h-30 flex flex-col items-center max-h-[60vh] overflow-y-auto bg-white/80 w-full">
                  <div className="w-full space-y-2 text-sm text-slate-700 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-600">Nombre:</span>
                      <span className="truncate">{selectedBoxModal.name || "Sin nombre"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-600">Id único:</span>
                      <span className="truncate">{selectedBoxModal.autoId}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-600">Cliente:</span>
                      <span>{selectedBoxModal.client || "—"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-600">Posición:</span>
                      <span>{selectedBoxModal.position}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-600">Temperatura:</span>
                      <span>{typeof selectedBoxModal.temperature === "number" ? `${selectedBoxModal.temperature} °C` : "Sin temperatura"}</span>
                    </div>
                  </div>
                 
                </div>
                {/* Modal para editar temperatura */}
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
                      {/* Header minimalista */}
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
                          <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 6 6 18" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 6l12 12" /></svg>
                        </button>
                      </div>
                      {/* Detalles compactos */}
                      <div className="px-4 py-4 flex flex-col items-center max-h-[60vh] overflow-y-auto bg-white/90 w-full">
                        <div className="w-full space-y-1 text-xs text-slate-700 mb-2">
                          <div className="flex items-center gap-1">
                            <span className="font-semibold text-slate-600">Caja:</span>
                            <span className="truncate">{editTempModal.name || "Sin nombre"}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="font-semibold text-slate-600">Id:</span>
                            <span className="truncate">{editTempModal.autoId}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="font-semibold text-slate-600">Pos:</span>
                            <span>{editTempModal.position}</span>
                          </div>
                        </div>
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            const temp = Number(e.target.temp.value);
                            if (!isNaN(temp)) {
                              handleUpdateBoxTemperature(
                                editTempModal.position,
                                temp,
                              );
                              setEditTempModal(null);
                            }
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
                              id="temp-input"
                              defaultValue={editTempModal.temperature ?? ""}
                              type="number"
                              step="any"
                              inputMode="decimal"
                              className="w-full flex-1 rounded-lg border border-blue-200 px-2 py-1 text-sm font-semibold text-blue-900 shadow-sm focus:ring-2 focus:ring-blue-300 outline-none transition"
                              placeholder="Solo por imagen"
                              readOnly
                            />
                            <button
                              type="button"
                              className="flex items-center justify-center gap-1 rounded-lg bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 border border-blue-200 hover:bg-blue-100 transition"
                              style={{ minWidth: 0, minHeight: 32 }}
                              onClick={() =>
                                document
                                  .getElementById("temp-image-upload")
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
                            id="temp-image-upload"
                            type="file"
                            accept="image/*"
                            style={{ display: "none" }}
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const formData = new FormData();
                              formData.append("image", file);
                              // Mostrar feedback visual
                              const tempInput =
                                document.getElementById("temp-input");
                              if (tempInput)
                                tempInput.classList.add(
                                  "ring-2",
                                  "ring-blue-400",
                                );
                              setEditTempLoading(true);
                              try {
                                const res = await fetch(
                                  "https://asistencia-dos.onrender.com/api/image/analyze",
                                  {
                                    method: "POST",
                                    body: formData,
                                  },
                                );
                                const data = await res.json();
                                if (
                                  data.numbersDetected &&
                                  data.numbersDetected.length > 0
                                ) {
                                  let tempValue = data.numbersDetected[0];
                                  tempValue = tempValue.replace(",", ".");
                                  if (tempInput)
                                    (tempInput as HTMLInputElement).value =
                                      tempValue;
                                } else {
                                  alert(
                                    "No se detectó temperatura en la imagen.",
                                  );
                                }
                              } catch {
                                alert("Error al analizar la imagen.");
                              }
                              setEditTempLoading(false);
                              // Quitar feedback visual
                              if (tempInput)
                                setTimeout(
                                  () =>
                                    tempInput.classList.remove(
                                      "ring-2",
                                      "ring-blue-400",
                                    ),
                                  1200,
                                );
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
            </div>
          )}
          <div className="flex flex-col lg:flex-row items-stretch gap-8">
            {/* Entrada division left */}
            <div className="flex flex-col items-start rounded-3xl border border-green-200 bg-emerald-50 p-2 sm:p-4 w-full max-w-full sm:max-w-xs lg:max-w-60 h-full lg:min-h-[435px]">
              <div className="flex items-center justify-between w-full mb-2">
                <h3 className="text-sm sm:text-lg font-semibold text-emerald-600 flex items-center gap-2">
                  <span className="inline-block">
                    <FiArchive className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
                  </span>
                  Entrada
                </h3>
                <EntradaAlertButton boxes={inboundBoxes} />
                {/* {highTempAlerts.length > 0 && (
                  <div>
                    <button
                      className="ml-2 flex items-center px-2 py-0.5 rounded-full bg-[#e6003a] hover:bg-[#c20030] transition text-white relative shadow focus:outline-none min-h-6 min-w-6"
                      style={{ fontSize: '12px', height: '24px' }}
                      title="Ver alertas de temperatura"
                      onClick={() => setShowAlertModal(true)}
                    >
                      <FiAlertTriangle className="w-4 h-4 mr-1" />
                      <span className="text-[11px] font-semibold leading-none">{highTempAlerts.length}</span>
                    </button>
                  </div>
                )} */}
              </div>
              {/* Modal de alertas de temperatura alta - estilo personalizado */}
              {statusModal ? (
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-2 sm:p-4"
                  role="dialog"
                  aria-modal="true"
                  onClick={() => setStatusModal(null)}
                >
                  <div
                    className="w-full max-w-lg sm:max-w-2xl rounded-3xl bg-white p-0 shadow-2xl border border-blue-100 relative overflow-hidden"
                    onClick={(event) => event.stopPropagation()}
                  >
                    {/* Header sticky con icono */}
                    <div className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-blue-50/80 px-6 py-4 border-b border-blue-100">
                      <div className="flex items-center gap-3">
                        <span
                          className={`inline-flex items-center justify-center w-10 h-10 rounded-full ${statusModal.kind === "alertas" ? "bg-red-100" : "bg-amber-100"}`}
                        >
                          {statusModal.kind === "alertas" ? (
                            <svg
                              className="w-6 h-6 text-red-500"
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
                          ) : (
                            <svg
                              className="w-6 h-6 text-amber-500"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 17v-2a4 4 0 118 0v2M12 9v2m0 4h.01"
                              />
                            </svg>
                          )}
                        </span>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
                            {statusModal.kind === "alertas"
                              ? "Alertas"
                              : "Lista de tareas"}
                          </p>
                          <h3 className="mt-1 text-xl sm:text-2xl font-bold text-slate-900">
                            {zoneLabels[statusModal.zone]}
                          </h3>
                          <p className="mt-1 text-xs sm:text-sm text-slate-600">
                            {statusModal.kind === "alertas"
                              ? "Detalles de alertas activas en esta zona."
                              : "Tareas pendientes relacionadas con esta zona."}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setStatusModal(null)}
                        className="rounded-full border border-slate-200 px-3 py-1 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-blue-700"
                      >
                        Cerrar
                      </button>
                    </div>
                    {/* Lista de items */}
                    <div className="p-6 grid gap-4 max-h-[60vh] overflow-y-auto bg-white">
                      {(statusModal.kind === "alertas"
                        ? zoneAlertItems[statusModal.zone]
                        : zoneTaskItems[statusModal.zone]
                      ).length === 0 ? (
                        <div className="text-center text-slate-400 py-8">
                          <svg
                            className="mx-auto w-12 h-12 text-slate-200"
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
                          <p className="mt-2 text-base font-semibold">
                            No hay elementos para mostrar.
                          </p>
                        </div>
                      ) : (
                        (statusModal.kind === "alertas"
                          ? zoneAlertItems[statusModal.zone]
                          : zoneTaskItems[statusModal.zone]
                        ).map((item) => (
                          <div
                            key={item.id}
                            className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm hover:shadow-md transition"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-base font-semibold text-slate-900 truncate">
                                {item.title}
                              </p>
                              <p className="mt-1 text-sm text-slate-600 truncate">
                                {item.description}
                              </p>
                              {item.meta ? (
                                <p className="mt-2 text-xs font-semibold text-slate-500">
                                  {item.meta}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
              <div className="w-full flex flex-col gap-1 sm:gap-2">
                {sortedInboundBoxes.length === 0 ? (
                  <div className="text-xs text-emerald-500">
                    No hay cajas en ingreso.
                  </div>
                ) : (
                  <>
                    {inboundPageItems.map((box, idx) => (
                      <div
                        key={`${box.position}-${box.autoId ?? "no-id"}-${idx}`}
                        className="rounded-xl border border-emerald-200 bg-white p-1 sm:p-2 text-[11px] sm:text-xs text-emerald-700 w-full"
                      >
                        <div className="font-semibold">
                          {box.name || "Sin nombre"}
                        </div>
                        <div>Id: {box.autoId}</div>
                        <div>Cliente: {box.client || "—"}</div>
                        <div>
                          Temp:{" "}
                          {typeof box.temperature === "number"
                            ? `${box.temperature} °C`
                            : "Sin temperatura"}
                        </div>
                      </div>
                    ))}
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
            {/* Mapa de Bodega section center */}
            <div className="flex-[1.2] rounded-2xl bg-white p-2 sm:p-4 shadow-md border border-blue-200 w-full relative h-full lg:min-h-[380px] flex flex-col">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2 sm:mb-4">
                <h2 className="text-sm sm:text-lg font-semibold text-slate-900 flex items-center gap-1 sm:gap-2">
                  <span className="inline-block">
                    <FiArchive className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />
                  </span>
                  Mapa de Bodega
                </h2>
                {/* Indicadores de alertas y ocupadas para jefe */}
                <div className="flex items-center gap-2 sm:justify-end sm:ml-auto">
                  {bodegaHighTempAlerts.length > 0 && (
                    <button
                      className="flex items-center px-2 py-0.5 rounded-full bg-[#e6003a] hover:bg-[#c20030] transition text-white relative shadow focus:outline-none min-h-6 min-w-6"
                      style={{ fontSize: "12px", height: "24px" }}
                      title="Ver alertas de temperatura en bodega"
                      onClick={() => setShowAlertModal(true)}
                    >
                      <FiAlertTriangle className="w-4 h-4 mr-1" />
                      <span className="text-[11px] font-semibold leading-none">
                        {bodegaHighTempAlerts.length}
                      </span>
                    </button>
                  )}
                  {/* Botón de llamados solo si hay llamados activos */}
                  {llamadasJefe.length > 0 && (
                    <>
                      <button
                        className="flex items-center px-2 py-0.5 rounded-full bg-yellow-200 hover:bg-yellow-300 transition text-blue-900 relative shadow focus:outline-none min-h-6 min-w-6"
                        style={{ fontSize: "12px", height: "24px" }}
                        title="Ver llamados"
                        onClick={() => setShowLlamadosModal(true)}
                      >
                        <RiUserReceivedLine />
                      </button>
                      {showLlamadosModal && (
                        <div
                          className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/10 animate-fade-in p-2 sm:p-4"
                          role="dialog"
                          aria-modal="true"
                          onClick={() => setShowLlamadosModal(false)}
                        >
                          <div
                            className="w-full max-w-lg sm:max-w-xl rounded-3xl border border-yellow-100 bg-white/90 shadow-2xl backdrop-blur-lg relative overflow-hidden animate-fade-in-up"
                            onClick={e => e.stopPropagation()}
                            style={{ fontFamily: '"Space Grotesk", "Work Sans", sans-serif' }}
                          >
                            {/* Header con gradiente y botón cerrar flotante */}
                            <div className="flex flex-col items-center justify-center pt-8 pb-4 px-8 border-b border-yellow-100 bg-linear-to-r from-yellow-50 to-white rounded-t-3xl relative">
                              <span className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-yellow-100 shadow mb-2 animate-pulse">
                                <RiUserReceivedLine className="w-8 h-8 text-yellow-500" />
                              </span>
                              <h2 className="text-2xl font-extrabold text-yellow-700 drop-shadow mb-1 tracking-tight">Llamados para el jefe</h2>
                              <p className="text-sm text-slate-500 font-medium text-center">Estos son los llamados activos para el jefe.</p>
                              <button
                                className="absolute top-4 right-4 text-slate-400 hover:text-yellow-500 text-2xl font-bold focus:outline-none transition-colors"
                                onClick={() => setShowLlamadosModal(false)}
                                aria-label="Cerrar"
                              >
                                <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 6 6 18" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 6l12 12" /></svg>
                              </button>
                            </div>
                            {/* Lista de llamados */}
                            <div className="px-8 py-6 min-h-30 flex flex-col items-center max-h-[60vh] overflow-y-auto bg-white/80">
                              {llamadasJefe.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-8">
                                  <span className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-yellow-100 mb-2">
                                    <RiUserReceivedLine className="w-8 h-8 text-yellow-400" />
                                  </span>
                                  <div className="text-center text-slate-400 text-lg font-semibold">No hay llamados activos</div>
                                  <div className="text-slate-400 text-sm text-center mt-1">Cuando haya un llamado, aparecerá aquí.</div>
                                </div>
                              ) : (
                                <ul className="mt-2 w-full space-y-3">
                                  {llamadasJefe.map((llamado, idx) => (
                                    <li
                                      key={idx}
                                      className="bg-linear-to-r from-yellow-50 to-white border border-yellow-200 rounded-xl px-5 py-4 text-yellow-800 flex items-center gap-4 shadow-sm hover:shadow-md transition-all"
                                    >
                                      <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-yellow-100">
                                        <RiUserReceivedLine className="w-6 h-6 text-yellow-500" />
                                      </span>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className="font-bold text-base text-yellow-700 truncate">{(llamado as any).message || (llamado as any).titulo || "Llamado"}</span>
                                          {(llamado as any).from && (
                                            <span className="ml-2 text-xs text-yellow-700 bg-yellow-50 rounded px-2 py-0.5 border border-yellow-200">{(llamado as any).from}</span>
                                          )}
                                        </div>
                                        {(llamado as any).descripcion && (
                                          <div className="text-xs text-yellow-800 whitespace-pre-line mb-1">{(llamado as any).descripcion}</div>
                                        )}
                                        {(llamado as any).timestamp && (
                                          <div className="text-xs text-yellow-700 flex items-center gap-1 mt-1">
                                            <svg className="w-4 h-4 inline-block text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            {new Date((llamado as any).timestamp as number).toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric" })}, {new Date((llamado as any).timestamp as number).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}
                                          </div>
                                        )}
                                        <div className="flex flex-row items-center gap-2 mt-2">
                                          <button
                                            type="button"
                                            className="rounded-lg bg-green-500 hover:bg-green-600 text-white text-xs font-semibold px-4 py-1.5 shadow transition focus:outline-none focus:ring-2 focus:ring-green-400"
                                            onClick={() => {
                                              const remaining = llamadasJefe.filter((_, i) => i !== idx);
                                              onUpdateLlamadasJefe(remaining);
                                              if (remaining.length === 0) {
                                                setShowLlamadosModal(false);
                                              }
                                            }}
                                          >
                                            Resolver
                                          </button>
                                          <button
                                            type="button"
                                            className="rounded-lg bg-white border border-yellow-200 hover:bg-yellow-50 text-yellow-800 text-xs font-semibold px-4 py-1.5 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-yellow-200"
                                            onClick={() => {
                                              navigator.clipboard.writeText(
                                                `${(llamado as any).message || (llamado as any).titulo || "Llamado"} - ${(llamado as any).descripcion || ""}`,
                                              );
                                            }}
                                          >
                                            Copiar
                                          </button>
                                        </div>
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
                  )}
                </div>
              </div>
              {showAlertModal && (
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/10 animate-fade-in p-2 sm:p-4"
                  role="dialog"
                  aria-modal="true"
                  onClick={() => setShowAlertModal(false)}
                >
                  <div
                    className="w-full max-w-lg sm:max-w-xl rounded-3xl border border-blue-100 bg-white/90 shadow-2xl backdrop-blur-lg relative overflow-hidden animate-fade-in-up"
                    onClick={(e) => e.stopPropagation()}
                    style={{ fontFamily: '"Space Grotesk", "Work Sans", sans-serif' }}
                  >
                    <div className="flex items-start gap-3 px-6 pt-6 pb-4 border-b border-blue-100">
                      <div className="flex flex-col">
                        <h3 className="text-xl sm:text-2xl font-bold text-slate-900 drop-shadow">
                          Bodega
                        </h3>
                        <p className="mt-1 text-xs sm:text-sm text-slate-700 font-medium">
                          Detalles de alertas activas en esta zona.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowAlertModal(false)}
                        className="ml-auto rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 bg-white shadow transition hover:bg-blue-100 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        title="Cerrar"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-5 h-5 inline-block mr-1 -mt-1 text-blue-500"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                        Cerrar
                      </button>
                    </div>
                    {/* Lista de items */}
                    <div className="p-6 grid gap-4 max-h-[60vh] overflow-y-auto bg-white">
                      {bodegaHighTempAlerts.length === 0 ? (
                        <div className="text-center text-slate-400 py-8">
                          <svg
                            className="mx-auto w-12 h-12 text-slate-200"
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
                          <p className="mt-2 text-base font-semibold">
                            No hay alertas de temperatura en bodega.
                          </p>
                        </div>
                      ) : (
                        bodegaHighTempAlerts.map((slot) => (
                          <div
                            key={slot.position}
                            className="rounded-xl border border-red-200 bg-linear-to-br from-red-50 via-white to-red-100 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-md hover:shadow-lg transition-all duration-200 group relative"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-base font-semibold text-red-800 truncate">
                                  {slot.name || "Sin nombre"}
                                </p>
                                <span
                                  className="inline-block animate-pulse bg-red-500 text-white text-[10px] font-bold rounded-full px-2 py-0.5 ml-1 shadow-sm"
                                  title="Prioridad alta"
                                >
                                  ¡ALERTA!
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 mb-1">
                                Id:{" "}
                                <span className="font-mono text-red-700">
                                  {slot.autoId}
                                </span>{" "}
                                · Posición:{" "}
                                <span className="font-mono">
                                  {slot.position}
                                </span>
                              </p>
                              <p className="mt-1 text-sm font-semibold text-red-600 flex items-center gap-1">
                                <svg
                                  className="w-4 h-4 text-red-400 inline-block"
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
                                Temp: {slot.temperature} °C
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <button
                                type="button"
                                className={`flex items-center gap-2 rounded-lg bg-linear-to-r from-blue-600 to-cyan-500 px-4 py-2 text-sm font-semibold text-white shadow-lg transition-all duration-150 hover:from-blue-700 hover:to-cyan-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 active:scale-95 relative ${alertasOperario.some((a) => a.position === slot.position) ? "opacity-60 pointer-events-none" : ""}`}
                                title={
                                  alertasOperario.some(
                                    (a) => a.position === slot.position,
                                  )
                                    ? "Ya asignado"
                                    : "Asignar operario a esta alerta"
                                }
                                onMouseDown={(e) =>
                                  e.currentTarget.classList.add("scale-90")
                                }
                                onMouseUp={(e) =>
                                  e.currentTarget.classList.remove("scale-90")
                                }
                                onClick={() => {
                                  if (
                                    alertasOperario.some(
                                      (a) => a.position === slot.position,
                                    )
                                  ) {
                                    return;
                                  }
                                  onUpdateAlertasOperario([
                                    ...alertasOperario,
                                    {
                                      position: slot.position,
                                      name: slot.name,
                                      autoId: slot.autoId,
                                      temperature: slot.temperature,
                                    },
                                  ]);
                                }}
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="w-4 h-4 text-white opacity-90"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                  />
                                </svg>
                                <span>
                                  {alertasOperario.some(
                                    (a) => a.position === slot.position,
                                  )
                                    ? "Asignado"
                                    : "Asignar operario"}
                                </span>
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
                {slots.slice(0, 12).map((slot) => {
                  const isOccupied = slot.autoId && slot.autoId.trim() !== "";
                  return (
                    <div
                      key={slot.position}
                      className={`relative flex flex-col items-center justify-center rounded-3xl border border-slate-300 p-2 sm:p-4 transition ${isOccupied ? "bg-cyan-100 text-slate-900 cursor-pointer hover:ring-2 hover:ring-cyan-400" : "bg-slate-50 text-slate-400"}`}
                      style={{ minHeight: 90, maxWidth: 140 }}
                      onClick={() => isOccupied && setSelectedBoxModal(slot)}
                    >
                      <span className="absolute top-1 left-1 text-[9px] font-semibold rounded-full px-1 py-0.5  text-slate-600">
                        {slot.position}
                      </span>
                      {isOccupied ? (
                        <>
                          <div className="mb-1">
                            <FiBox className="w-4 h-4 sm:w-6 sm:h-6 text-cyan-400" />
                          </div>
                          <div className="font-semibold text-[clamp(0.65rem,1vw,0.85rem)] text-center truncate w-full">
                            {slot.name || "Sin nombre"}
                          </div>
                          <div className="text-[clamp(0.7rem,1.5vw,0.85rem)] mt-1 text-center truncate w-full">
                            {slot.autoId}
                          </div>
                          <div className="mt-2 text-[clamp(0.7rem,1.5vw,0.85rem)] font-medium bg-cyan-200 rounded-full px-1.5 sm:px-3 py-0.5 inline-block">
                            {typeof slot.temperature === "number"
                              ? `${slot.temperature} °C`
                              : "Sin temperatura"}
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center gap-1">
                          <div className="border-2 border-dashed border-slate-300 rounded-3xl w-7 h-7 sm:w-9 sm:h-9 flex items-center justify-center">
                            <span className="text-base sm:text-lg">+</span>
                          </div>
                          <div className="text-[clamp(0.7rem,1.5vw,0.85rem)] mt-1">
                            Vacía
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex flex-wrap items-center justify-end mt-2 sm:mt-4 gap-1 sm:gap-3">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-cyan-400 inline-block"></span>
                  <span className="text-[10px] sm:text-xs text-slate-600">
                    Ocupada
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-slate-300 inline-block"></span>
                  <span className="text-[10px] sm:text-xs text-slate-600">
                    Vacía
                  </span>
                </div>
              </div>
            </div>
            {/* Salida division right */}
            <div className="flex flex-col items-start rounded-3xl border border-pink-200 bg-pink-50 p-4 sm:p-6 w-full max-w-full sm:max-w-xs lg:max-w-60 h-full lg:min-h-108.75">
              <h3 className="text-base sm:text-lg font-semibold text-pink-600 mb-2 flex items-center gap-2">
                <span className="inline-block">
                  <FiBox className="w-5 h-5 text-pink-400" />
                </span>
                Salida
              </h3>
              <div className="w-full flex flex-col gap-2">
                {sortedOutboundBoxes.length === 0 ? (
                  <div className="text-xs text-pink-500">
                    No hay cajas en salida.
                  </div>
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
                        <div>Cliente: {box.client || "—"}</div>
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
          </div>
        </div>
      )}

      {/* Modals for each action */}
      {isJefe && orderModalType === "ingresos" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setOrderModalType(null)}
        >
          <div
            className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Registrar entrada
            </h2>
            {/* ...existing Ingresos form logic... */}
            <div className="grid gap-3">
              <label className="text-sm font-medium text-slate-600">
                Origen
              </label>
              <input
                value="Ingresos"
                readOnly
                className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-600"
              />
              <label className="text-sm font-medium text-slate-600">
                Caja en ingresos
              </label>
              <select
                value={ingresoOrderSourcePosition}
                onChange={(event) =>
                  setIngresoOrderSourcePosition(Number(event.target.value))
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                {availableInboundForOrders.length === 0 ? (
                  <option value={1}>Sin cajas</option>
                ) : (
                  sortByPosition(availableInboundForOrders).map((box) => (
                    <option
                      key={box.position}
                      value={box.position}
                    >{`Ingreso ${box.position} - ${box.name} (${box.autoId}) · ${box.client || "—"}`}</option>
                  ))
                )}
              </select>
              <label className="text-sm font-medium text-slate-600">
                Posicion en bodega
              </label>
              <select
                value={ingresoOrderTargetPosition}
                onChange={(event) =>
                  setIngresoOrderTargetPosition(Number(event.target.value))
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                {availableBodegaTargets.length === 0 ? (
                  <option value={1}>Sin posiciones libres</option>
                ) : (
                  availableBodegaTargets.map((position) => (
                    <option key={position} value={position}>
                      {position}
                    </option>
                  ))
                )}
              </select>
              <button
                type="button"
                onClick={() =>
                  handleCreateOrder({
                    destination: "a_bodega",
                    sourceZone: "ingresos",
                    sourcePosition: ingresoOrderSourcePosition,
                    targetPosition: ingresoOrderTargetPosition,
                  })
                }
                className="mt-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
              >
                Crear ingreso
              </button>
            </div>
          </div>
        </div>
      )}
      {isJefe && orderModalType === "bodega" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setOrderModalType(null)}
        >
          <div
            className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Transferir cajas
            </h2>
            {/* ...existing Bodega a Bodega form logic... */}
            <div className="grid gap-3">
              <label className="text-sm font-medium text-slate-600">
                Destino
              </label>
              <select
                value="a_bodega"
                disabled
                className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm"
              >
                <option value="a_bodega">Bodega</option>
              </select>
              <label className="text-sm font-medium text-slate-600">
                Origen
              </label>
              <input
                value="Bodega"
                readOnly
                className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-600"
              />
              <label className="text-sm font-medium text-slate-600">
                Caja en bodega
              </label>
              <select
                value={bodegaOrderSourcePosition}
                onChange={(event) =>
                  setBodegaOrderSourcePosition(Number(event.target.value))
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                {availableBodegaForOrders.length === 0 ? (
                  <option value={1}>Sin cajas</option>
                ) : (
                  sortByPosition(availableBodegaForOrders).map((box) => (
                    <option
                      key={box.position}
                      value={box.position}
                    >{`Bodega ${box.position} - ${box.name} (${box.autoId}) · ${box.client || "—"}`}</option>
                  ))
                )}
              </select>
              <label className="text-sm font-medium text-slate-600">
                Posicion en bodega
              </label>
              <select
                value={bodegaOrderTargetPosition}
                onChange={(event) =>
                  setBodegaOrderTargetPosition(Number(event.target.value))
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                {availableBodegaTargets.length === 0 ? (
                  <option value={1}>Sin posiciones libres</option>
                ) : (
                  availableBodegaTargets.map((position) => (
                    <option key={position} value={position}>
                      {position}
                    </option>
                  ))
                )}
              </select>
              <button
                type="button"
                onClick={() =>
                  handleCreateOrder({
                    destination: "a_bodega",
                    sourceZone: "bodega",
                    sourcePosition: bodegaOrderSourcePosition,
                    targetPosition: bodegaOrderTargetPosition,
                  })
                }
                className="mt-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500"
              >
                Crear orden
              </button>
            </div>
          </div>
        </div>
      )}
      {isJefe && orderModalType === "revisar" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setOrderModalType(null)}
        >
          <div
            className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Consultar inventario
            </h2>
            {/* Revisar cualquier caja: ingresos, bodega, salida */}
            <div className="grid gap-3">
              <label className="text-sm font-medium text-slate-600">Caja</label>
              <select
                value={reviewSourcePosition}
                onChange={(event) =>
                  setReviewSourcePosition(Number(event.target.value))
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                {/* Agrupar por zona */}
                {[
                  { label: "Ingresos", list: availableInboundForOrders },
                  { label: "Bodega", list: reviewBodegaList },
                  { label: "Salida", list: outboundBoxes },
                ].map((group) =>
                  group.list.length > 0 ? (
                    <optgroup key={group.label} label={group.label}>
                      {sortByPosition(group.list).map((box) => (
                        <option
                          key={`${group.label}-${box.position}`}
                          value={box.position}
                        >
                          {`${group.label} ${box.position} - ${box.name} (${box.autoId}) · ${box.client || "—"}`}
                        </option>
                      ))}
                    </optgroup>
                  ) : null,
                )}
                {/* Si no hay cajas en ninguna zona */}
                {availableInboundForOrders.length === 0 &&
                  reviewBodegaList.length === 0 &&
                  outboundBoxes.length === 0 && (
                    <option value={1}>Sin cajas</option>
                  )}
              </select>
              <button
                type="button"
                onClick={handleCreateReviewOrder}
                className="mt-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-500"
              >
                Crear revision
              </button>
            </div>
          </div>
        </div>
      )}
      {isJefe && orderModalType === "salida" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setOrderModalType(null)}
        >
          <div
            className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Registrar salida
            </h2>
            {/* ...existing Crear Salida form logic... */}
            <div className="grid gap-3">
              <label className="text-sm font-medium text-slate-600">
                Origen
              </label>
              <input
                value="Bodega"
                readOnly
                className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-600"
              />
              <label className="text-sm font-medium text-slate-600">
                Caja en bodega
              </label>
              <select
                value={salidaSourcePosition}
                onChange={(event) =>
                  setSalidaSourcePosition(Number(event.target.value))
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                {availableBodegaForOrders.length === 0 ? (
                  <option value={1}>Sin cajas</option>
                ) : (
                  sortByPosition(availableBodegaForOrders).map((box) => (
                    <option
                      key={box.position}
                      value={box.position}
                    >{`Bodega ${box.position} - ${box.name} (${box.autoId}) · ${box.client || "—"}`}</option>
                  ))
                )}
              </select>
              <label className="text-sm font-medium text-slate-600">
                Posicion en salida
              </label>
              <input
                value={salidaTargetPosition}
                type="number"
                readOnly
                className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-600"
              />
              <button
                type="button"
                onClick={() =>
                  handleCreateOrder({
                    destination: "a_salida",
                    sourceZone: "bodega",
                    sourcePosition: salidaSourcePosition,
                  })
                }
                className="mt-2 rounded-lg bg-pink-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-pink-500"
              >
                Crear salida
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
