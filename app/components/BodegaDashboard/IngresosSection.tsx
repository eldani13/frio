import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FiArchive, FiBox, FiAlertCircle } from "react-icons/fi";
import { IoCloseOutline } from "react-icons/io5";
import type { Box, Client, Slot, BodegaOrder } from "../../interfaces/bodega";
import {
  OcOrdenIngresoPanel,
  type IngresoDesdeOrdenCompraPayload,
} from "@/app/components/BodegaDashboard/OcOrdenIngresoPanel";

const HIGH_TEMP_THRESHOLD = 5;

function boxMatchesSalidaFilter(
  box: Box,
  filterId: string,
  clients: Pick<Client, "id" | "name">[],
): boolean {
  if (!filterId.trim()) return true;
  if (box.client === filterId) return true;
  const row = clients.find((c) => c.id === filterId);
  if (row && box.client.trim() === row.name.trim()) return true;
  return false;
}

function formatQuantityKg(kg: number | undefined) {
  if (kg === undefined || kg === null || Number.isNaN(kg)) return "—";
  return `${kg} kg`;
}

type Props = {
  isCustodio: boolean;
  slots: Slot[];
  orders: BodegaOrder[];
  inboundBoxes: Box[];
  outboundBoxes: Box[];
  ingresoClientId: string;
  setIngresoClientId: (v: string) => void;
  createReturnOrder: (box: Box, targetPosition: number) => string | null;
  sortByPosition: <T extends { position: number }>(items: T[]) => T[];
  handleDispatchBox: (position: number) => void;
  availableBodegaTargets: number[];
  isCliente?: boolean;
  clientFilterId?: string;
  onClientChange?: (id: string) => void;
  clientsForCatalog: Client[];
  warehouseId: string;
  isBodegaInterna: boolean;
  onIngresoDesdeOrdenCompra: (payload: IngresoDesdeOrdenCompraPayload) => Promise<void>;
};

export default function IngresosSection(props: Props) {
  const {
    isCustodio,
    slots,
    orders,
    inboundBoxes,
    outboundBoxes,
    ingresoClientId,
    setIngresoClientId,
    createReturnOrder,
    sortByPosition,
    handleDispatchBox,
    availableBodegaTargets,
    isCliente = false,
    clientFilterId,
    onClientChange,
    clientsForCatalog,
    warehouseId,
    isBodegaInterna,
    onIngresoDesdeOrdenCompra,
  } = props;

  const clientLabel = useCallback(
    (clientField: string) => {
      if (!clientField?.trim()) return "—";
      const row = clientsForCatalog.find((c) => c.id === clientField);
      if (row) return row.name;
      return clientField;
    },
    [clientsForCatalog],
  );

  const salidaFilterValue = clientFilterId ?? "";

  const outboundFiltered = useMemo(
    () =>
      outboundBoxes.filter((box) =>
        boxMatchesSalidaFilter(box, salidaFilterValue, clientsForCatalog),
      ),
    [outboundBoxes, salidaFilterValue, clientsForCatalog],
  );

  const [selectedBoxId, setSelectedBoxId] = useState<string>("");

  const [reviewModal, setReviewModal] = useState<Box | null>(null);
  const [tempError, setTempError] = useState<string | null>(null);
  const [tempConfirmModal, setTempConfirmModal] = useState<{
    box: Box;
    finalTemp: string;
  } | null>(null);
  const [tempConfirmError, setTempConfirmError] = useState<string | null>(null);

  const getFirstFreeBodegaSlot = () => {
    const free = slots.find((slot) => !slot.autoId || !slot.autoId.trim());
    return free ? free.position : null;
  };

  const createReturnOrderForHighTemp = (box: Box) => {
    const alreadyPending = orders.some(
      (order) =>
        order?.type === "a_bodega" &&
        order?.sourceZone === "salida" &&
        Number(order?.sourcePosition) === box.position,
    );
    if (alreadyPending) {
      return "Ya existe una tarea para esta caja.";
    }

    const targetPosition = getFirstFreeBodegaSlot();
    if (!targetPosition) {
      return "No hay posiciones libres en bodega para reasignar la caja.";
    }
    if (!availableBodegaTargets.includes(targetPosition)) {
      return "La posición libre ya fue tomada por otra tarea.";
    }

    return createReturnOrder(box, targetPosition);
  };

  if (!isCustodio) return null;

  const handleSalidaClientFilterChange = (value: string) => {
    onClientChange?.(value);
    if (value) {
      setIngresoClientId(value);
    }
    setSelectedBoxId("");
  };

  const boxOptions = outboundFiltered.map((box) => ({
    value: box.autoId ?? `pos-${box.position}`,
    label: box.autoId ? `${box.autoId} · ${box.name ?? "Sin nombre"}` : `Pos ${box.position} · ${box.name ?? "Sin nombre"}`,
  }));

  const selectedBox = selectedBoxId
    ? outboundFiltered.find(
        (box) => (box.autoId ?? `pos-${box.position}`) === selectedBoxId,
      ) || outboundFiltered[0]
    : outboundFiltered[0];

  return (
    <>
      <section className="grid w-full min-w-0 grid-cols-1 items-stretch gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* 1. Orden de ingreso (OC en transporte → checklist → cajas en zona) */}
        <div className="flex h-full min-h-0 w-full min-w-0">
          <OcOrdenIngresoPanel
            warehouseId={warehouseId}
            isBodegaInterna={isBodegaInterna}
            onRegistrar={onIngresoDesdeOrdenCompra}
          />
        </div>

        {/* 2. Zona de ingreso (solo cola de cajas) */}
        <div className="rounded-2xl bg-white p-4 sm:p-6 lg:p-8 shadow-lg border border-green-200 w-full min-w-0 flex h-full min-h-0 flex-col gap-4 sm:gap-6">
          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex items-center justify-between gap-2 mb-2 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="rounded-full bg-emerald-600 p-2 text-white shrink-0">
                  <FiArchive className="w-5 h-5" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold">Zona de ingreso</h2>
                  
                </div>
              </div>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-600 shrink-0">
                {inboundBoxes.length} cajas
              </span>
            </div>
            <div className="flex-1 flex flex-col mt-2 min-h-[8rem]">
              {inboundBoxes.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 flex-1 py-6">
                  <FiArchive className="w-10 h-10 text-slate-300" />
                  <p className="text-sm text-slate-500 text-center">No hay cajas en ingresos</p>
                </div>
              ) : (
                <div className="w-full max-h-[min(22rem,55vh)] overflow-y-auto overflow-x-hidden flex flex-col">
                  {sortByPosition(inboundBoxes).map((box, idx) => (
                    <div
                      key={`ingreso-${box.position}-${box.autoId ?? "no-id"}-${idx}`}
                      className="rounded-xl border border-emerald-200 bg-white p-3 text-sm text-emerald-700 w-full mb-2"
                    >
                      <p className="font-semibold">Ingreso {box.position}</p>
                      <p>Id único: {box.autoId}</p>
                      <p>Nombre: {box.name}</p>
                      <p>Temperatura: {box.temperature} °C</p>
                      <p>Cantidad: {formatQuantityKg(box.quantityKg)}</p>
                      <p>Cliente: {clientLabel(box.client)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 3. Orden de salida */}
        <div className="rounded-2xl bg-white p-4 sm:p-6 lg:p-8 shadow-lg border border-pink-200 w-full min-w-0 flex h-full min-h-0 flex-col gap-4 sm:gap-6">
          {outboundFiltered.length > 0 ? (
            <>
              <div className="flex items-center gap-3 shrink-0">
                <span className="rounded-full bg-pink-600 p-2 text-white shrink-0">
                  <FiBox className="w-5 h-5" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold">Orden de salida</h2>
                  <p className="text-xs text-slate-500">Registrar salida de caja</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                    Complementa <strong>orden de compra</strong> y <strong>orden de ingreso</strong> (primera
                    columna): cuando el <strong>operario</strong> ejecuta la tarea «A salida», la caja entra en
                    esta cola y en <strong>Zona de salida</strong>; acá la elegís para confirmar el envío al
                    cliente.
                  </p>
                </div>
              </div>
              <div className="grid gap-3 flex-1 min-h-0">
                <label className="text-sm font-medium text-slate-600">
                  Orden de posición
                </label>
                <input
                  value={selectedBox?.position ?? ""}
                  type="number"
                  readOnly
                  className="w-full rounded-lg border border-pink-200 bg-pink-50 px-3 py-2 text-sm text-pink-600"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-slate-600">
                      Cliente
                    </label>
                    <select
                      value={salidaFilterValue}
                      onChange={(event) => handleSalidaClientFilterChange(event.target.value)}
                      disabled={isCliente && !onClientChange}
                      className="w-full rounded-lg border border-pink-200 px-3 py-2 text-sm bg-pink-50 text-pink-700"
                    >
                      <option value="">Todos</option>
                      {clientsForCatalog.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                      {salidaFilterValue &&
                      !clientsForCatalog.some((c) => c.id === salidaFilterValue) ? (
                        <option value={salidaFilterValue}>
                          {`Cliente (id: ${salidaFilterValue.slice(0, 12)}…)`}
                        </option>
                      ) : null}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-slate-600">
                      Caja
                    </label>
                    <select
                      value={selectedBoxId}
                      onChange={(event) => setSelectedBoxId(event.target.value)}
                      disabled={boxOptions.length === 0}
                      className="w-full rounded-lg border border-pink-200 px-3 py-2 text-sm bg-pink-50 text-pink-700"
                    >
                      {boxOptions.length === 0 ? (
                        <option value="">Sin cajas</option>
                      ) : (
                        boxOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </div>
                <label className="text-sm font-medium text-slate-600">
                  Nombre de la caja
                </label>
                <input
                  value={selectedBox?.name ?? ""}
                  readOnly
                  className="w-full rounded-lg border border-pink-200 px-3 py-2 text-sm"
                />
                <label className="text-sm font-medium text-slate-600">
                  Temperatura (°C)
                </label>
                <input
                  value={selectedBox?.temperature ?? ""}
                  type="number"
                  readOnly
                  className="w-full rounded-lg border border-pink-200 px-3 py-2 text-sm"
                />
                <label className="text-sm font-medium text-slate-600">Cantidad (kg)</label>
                <input
                  value={
                    selectedBox && typeof selectedBox.quantityKg === "number"
                      ? String(selectedBox.quantityKg)
                      : ""
                  }
                  readOnly
                  className="w-full rounded-lg border border-pink-200 px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!selectedBox) return;
                    setTempError(null);
                    setReviewModal(selectedBox);
                  }}
                  className="mt-auto flex items-center justify-center gap-2 rounded-lg bg-pink-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-pink-500"
                >
                  <FiBox className="w-4 h-4" /> Enviar caja
                </button>
              </div>
            </>
          ) : (
            <div className="flex w-full min-w-0 flex-1 flex-col items-stretch justify-start gap-4">
              <div className="flex items-start gap-3">
                <span className="rounded-full bg-pink-600 p-2 text-white shrink-0">
                  <FiBox className="w-5 h-5" />
                </span>
                <div className="min-w-0 pt-0.5">
                  <h2 className="text-lg font-semibold leading-tight">Orden de salida</h2>
                </div>
              </div>
              
            </div>
          )}
        </div>

        {/* 4. Zona de salida */}
        <div className="rounded-2xl bg-white p-4 sm:p-6 lg:p-8 shadow-lg border border-pink-200 w-full min-w-0 flex h-full min-h-0 flex-col gap-4 sm:gap-6">
          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex items-center justify-between gap-2 mb-2 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="rounded-full bg-pink-600 p-2 text-white shrink-0">
                  <FiBox className="w-5 h-5" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold">Zona de salida</h2>
                  
                </div>
              </div>
              <span className="rounded-full bg-pink-100 px-3 py-1 text-xs font-semibold text-pink-600 shrink-0">
                {outboundFiltered.length} cajas
              </span>
            </div>
            <div className="flex-1 flex flex-col mt-2 min-h-[8rem]">
              {outboundFiltered.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 flex-1 py-6">
                  <FiBox className="w-10 h-10 text-slate-300" />
                  <p className="text-sm text-slate-500 text-center">No hay cajas en salida</p>
                </div>
              ) : (
                <div className="w-full max-h-[min(22rem,55vh)] overflow-y-auto overflow-x-hidden flex flex-col">
                  {sortByPosition(outboundFiltered).map((box, idx) => (
                    <div
                      key={`salida-scroll-${box.position}-${box.autoId ?? "no-id"}-${idx}`}
                      className="rounded-xl border border-pink-200 bg-white p-3 text-sm text-pink-700 w-full mb-2"
                    >
                      <p className="font-semibold">Salida {box.position}</p>
                      <p>Id único: {box.autoId}</p>
                      <p>Nombre: {box.name}</p>
                      <p>Temperatura: {box.temperature} °C</p>
                      <p>Cantidad: {formatQuantityKg(box.quantityKg)}</p>
                      <p>Cliente: {clientLabel(box.client)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

    {reviewModal && (
      <div
        className="fixed inset-0 z-[80] flex items-center justify-center backdrop-blur-sm bg-black/20 animate-fade-in p-2 sm:p-4"
        role="dialog"
        aria-modal="true"
        onClick={() => setReviewModal(null)}
      >
        <div
          className="w-full max-w-lg sm:max-w-xl rounded-3xl border border-red-100 bg-white/95 shadow-2xl backdrop-blur-lg relative overflow-hidden animate-fade-in-up"
          onClick={(e) => e.stopPropagation()}
          style={{ fontFamily: '"Space Grotesk", "Work Sans", sans-serif' }}
        >
          <div className="flex flex-col items-center justify-center pt-8 pb-4 px-8 border-b border-red-100 bg-linear-to-r from-red-50 to-white rounded-t-3xl relative">
            <span className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-red-100 shadow mb-2">
              <FiAlertCircle className="w-8 h-8 text-red-500" />
            </span>
            <h2 className="text-2xl font-extrabold text-red-700 drop-shadow mb-1 tracking-tight">
             ¿Confirmar envio de caja?
            </h2>
            <p className="text-sm text-slate-600 font-medium text-center">
              Detalles de la posición a revisar antes de enviarla.
            </p>
            <button
              type="button"
              onClick={() => setReviewModal(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-red-600 text-2xl font-bold focus:outline-none transition-colors"
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
                  Salida {reviewModal.position}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold text-slate-600">Nombre</span>
                <span className="text-slate-900 font-semibold truncate max-w-[55%]">
                  {reviewModal.name || "Sin nombre"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold text-slate-600">Id</span>
                <span className="text-slate-900 font-semibold truncate max-w-[55%]">
                  {reviewModal.autoId || "N/A"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold text-slate-600">Cliente</span>
                <span className="text-slate-900 truncate max-w-[55%]">
                  {clientLabel(reviewModal.client || "")}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold text-slate-600">Temperatura</span>
                <span className="text-slate-900 font-semibold">
                  {reviewModal.temperature !== undefined && reviewModal.temperature !== null
                    ? `${reviewModal.temperature} °C`
                    : "Sin dato"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold text-slate-600">Cantidad</span>
                <span className="text-slate-900 font-semibold">
                  {formatQuantityKg(reviewModal.quantityKg)}
                </span>
              </div>
              {tempError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {tempError}
                </div>
              ) : null}
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
                  className="flex-1 sm:flex-none rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-lg transition hover:bg-emerald-700 active:scale-95 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  onClick={() => {
                    const tempNumber =
                      reviewModal.temperature !== undefined && reviewModal.temperature !== null
                        ? Number(reviewModal.temperature)
                        : null;
                    if (
                      tempNumber !== null &&
                      !Number.isNaN(tempNumber) &&
                      tempNumber > HIGH_TEMP_THRESHOLD
                    ) {
                      const errorMessage = createReturnOrderForHighTemp(reviewModal);
                      setTempError(
                        errorMessage
                          ? `${errorMessage} La caja no se enviara.`
                          : "Temperatura mayor a 5 C. Se creo una tarea para que el operario devuelva la caja a bodega.",
                      );
                      return;
                    }
                    setTempError(null);
                    setTempConfirmError(null);
                    setTempConfirmModal({
                      box: reviewModal,
                      finalTemp:
                        reviewModal.temperature !== undefined && reviewModal.temperature !== null
                          ? String(reviewModal.temperature)
                          : "",
                    });
                    setReviewModal(null);
                  }}
                >
                  Enviar caja
                </button>
            </div>
          </div>
        </div>
      </div>
    )}

    {tempConfirmModal && (
      <div
        className="fixed inset-0 z-[90] flex items-center justify-center p-2 bg-black/40 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        onClick={() => setTempConfirmModal(null)}
      >
        <div
          className="w-full max-w-sm rounded-2xl border border-emerald-100 bg-white/95 shadow-2xl relative overflow-hidden animate-fade-in-up"
          onClick={(e) => e.stopPropagation()}
          style={{ fontFamily: '"Space Grotesk", "Work Sans", sans-serif' }}
        >
          <div className="flex flex-col items-center justify-center pt-6 pb-3 px-5 border-b border-emerald-100 bg-linear-to-r from-emerald-50 to-white relative">
            <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 mb-2 shadow">
              <FiAlertCircle className="w-6 h-6 text-emerald-600" />
            </span>
            <h3 className="text-xl font-extrabold text-emerald-700 tracking-tight">
              Confirmar temperatura
            </h3>
            <p className="text-xs text-slate-600 text-center mt-1">
              Ingresa la temperatura final antes de enviar la caja.
            </p>
            <button
              type="button"
              onClick={() => setTempConfirmModal(null)}
              className="absolute top-3 right-3 text-slate-400 hover:text-emerald-600 text-xl font-bold focus:outline-none transition-colors"
              aria-label="Cerrar"
            >
              <IoCloseOutline />
            </button>
          </div>

          <div className="px-5 py-4 flex flex-col gap-3 bg-white/90 max-h-[65vh] overflow-y-auto">
            <div className="text-xs text-slate-700 space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-600">Caja:</span>
                <span className="truncate">
                  {tempConfirmModal.box.name || "Sin nombre"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-600">Id:</span>
                <span className="truncate">{tempConfirmModal.box.autoId || "N/A"}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-600">Pos:</span>
                <span>{tempConfirmModal.box.position}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-600">Temp inicial:</span>
                <span>
                  {tempConfirmModal.box.temperature !== undefined && tempConfirmModal.box.temperature !== null
                    ? `${tempConfirmModal.box.temperature} °C`
                    : "Sin dato"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-600">Cantidad:</span>
                <span>{formatQuantityKg(tempConfirmModal.box.quantityKg)}</span>
              </div>
            </div>

            {tempConfirmError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {tempConfirmError}
              </div>
            ) : null}

            <form
              className="flex flex-col gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const parsed = Number(tempConfirmModal.finalTemp);
                if (Number.isNaN(parsed)) {
                  setTempConfirmError("Ingresa una temperatura valida.");
                  return;
                }
                if (parsed > HIGH_TEMP_THRESHOLD) {
                  const errorMessage = createReturnOrderForHighTemp(tempConfirmModal.box);
                  setTempConfirmError(
                    errorMessage
                      ? `${errorMessage} La caja no se enviara.`
                      : "Temperatura mayor a 5 C. Se creo una tarea para que el operario devuelva la caja a bodega.",
                  );
                  return;
                }
                setTempConfirmModal(null);
                handleDispatchBox(tempConfirmModal.box.position);
              }}
            >
              <label className="text-xs font-medium text-slate-700 flex items-center gap-1">
                Temperatura final (°C)
              </label>
              <input
                value={tempConfirmModal.finalTemp}
                onChange={(e) =>
                  setTempConfirmModal((prev) =>
                    prev ? { ...prev, finalTemp: e.target.value } : prev,
                  )
                }
                type="number"
                step="any"
                className="w-full rounded-lg border border-emerald-200 px-3 py-2 text-sm font-semibold text-emerald-900 shadow-sm focus:ring-2 focus:ring-emerald-300 outline-none transition"
                placeholder="Ingresa la temperatura medida"
              />
              <div className="flex gap-2 mt-2">
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white shadow transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                >
                  Confirmar y enviar
                </button>
                <button
                  type="button"
                  className="flex-1 rounded-lg bg-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 shadow transition hover:bg-slate-300"
                  onClick={() => setTempConfirmModal(null)}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    )}
    </>
  );
}