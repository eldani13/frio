import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FiArchive, FiBox, FiAlertCircle } from "react-icons/fi";
import { IoCloseOutline } from "react-icons/io5";
import type { Box, Client, Slot, BodegaOrder, WarehouseMeta } from "../../interfaces/bodega";
import { CatalogoService } from "@/app/services/catalogoService";
import { AsignarBodegaService } from "@/app/services/asignarbodegaService";
import type { Catalogo } from "@/app/types/catalogo";

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

function catalogLabel(p: { title?: string; sku?: string }) {
  const t = p.title?.trim() || "Sin título";
  const s = p.sku?.trim();
  return s ? `${t} (${s})` : t;
}

function formatQuantityKg(kg: number | undefined) {
  if (kg === undefined || kg === null || Number.isNaN(kg)) return "—";
  return `${kg} kg`;
}

function mergeWarehousesForClient(
  byCode: WarehouseMeta[],
  fallback: WarehouseMeta[],
  clientId: string,
  accountCode: string,
): WarehouseMeta[] {
  const map = new Map<string, WarehouseMeta>();
  const add = (w: WarehouseMeta) => {
    if (!w?.id || w.disabled) return;
    map.set(w.id, w);
  };
  byCode.forEach(add);
  const codeTrim = accountCode.trim();
  fallback.forEach((w) => {
    const cc = (w.codeCuenta ?? "").trim();
    if (!cc) return;
    if (codeTrim && cc === codeTrim) add(w);
    if (cc === clientId) add(w);
  });
  return Array.from(map.values()).sort((a, b) =>
    (a.name ?? a.id).localeCompare(b.name ?? b.id, "es", { sensitivity: "base" }),
  );
}

function warehouseOptionLabel(w: WarehouseMeta) {
  const name = w.name?.trim() || w.id;
  const st = w.status?.trim();
  if (st === "externa" || st === "external") return `${name} · externa`;
  if (st === "interna") return `${name} · interna`;
  return name;
}

type Props = {
  isCustodio: boolean;
  canUseIngresoForm: boolean;
  slots: Slot[];
  orders: BodegaOrder[];
  inboundBoxes: Box[];
  outboundBoxes: Box[];
  ingresoPosition: number;
  ingresoName: string;
  ingresoTemp: string;
  ingresoQuantityKg: string;
  ingresoClientId: string;
  setIngresoClientId: (v: string) => void;
  setIngresoName: (v: string) => void;
  setIngresoTemp: (v: string) => void;
  setIngresoQuantityKg: (v: string) => void;
  handleIngreso: () => void;
  createReturnOrder: (box: Box, targetPosition: number) => string | null;
  sortByPosition: <T extends { position: number }>(items: T[]) => T[];
  handleDispatchBox: (position: number) => void;
  availableBodegaTargets: number[];
  isCliente?: boolean;
  clientFilterId?: string;
  onClientChange?: (id: string) => void;
  clientsForCatalog: Client[];
  warehouseId: string;
  onWarehouseSelect: (id: string) => void;
  warehousesFallback: WarehouseMeta[];
};

export default function IngresosSection(props: Props) {
  const {
    isCustodio,
    canUseIngresoForm,
    slots,
    orders,
    inboundBoxes,
    outboundBoxes,
    ingresoPosition,
    ingresoName,
    ingresoTemp,
    ingresoQuantityKg,
    ingresoClientId,
    setIngresoClientId,
    setIngresoName,
    setIngresoTemp,
    setIngresoQuantityKg,
    handleIngreso,
    createReturnOrder,
    sortByPosition,
    handleDispatchBox,
    availableBodegaTargets,
    isCliente = false,
    clientFilterId,
    onClientChange,
    clientsForCatalog,
    warehouseId,
    onWarehouseSelect,
    warehousesFallback,
  } = props;

  const [linkedWarehouses, setLinkedWarehouses] = useState<WarehouseMeta[]>([]);
  const [linkedWarehousesLoading, setLinkedWarehousesLoading] = useState(false);

  const [catalogProducts, setCatalogProducts] = useState<Catalogo[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [selectedCatalogProductId, setSelectedCatalogProductId] = useState("");

  const selectedClientRow = useMemo(
    () => clientsForCatalog.find((c) => c.id === ingresoClientId),
    [clientsForCatalog, ingresoClientId],
  );

  const catalogCodeCuenta = selectedClientRow?.code?.trim() ?? "";

  const loadCatalog = useCallback(async () => {
    if (!ingresoClientId.trim() || !catalogCodeCuenta) {
      setCatalogProducts([]);
      return;
    }
    setCatalogLoading(true);
    try {
      const data = await CatalogoService.getAll(ingresoClientId.trim(), catalogCodeCuenta);
      const sorted = [...data].sort((a, b) =>
        (a.title || "").localeCompare(b.title || "", "es", { sensitivity: "base" }),
      );
      setCatalogProducts(sorted);
    } finally {
      setCatalogLoading(false);
    }
  }, [ingresoClientId, catalogCodeCuenta]);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  const loadLinkedWarehouses = useCallback(async () => {
    if (!ingresoClientId.trim()) {
      setLinkedWarehouses([]);
      return;
    }
    setLinkedWarehousesLoading(true);
    try {
      let byCode: WarehouseMeta[] = [];
      if (catalogCodeCuenta) {
        byCode = await AsignarBodegaService.getWarehousesByCode(catalogCodeCuenta);
      }
      const merged = mergeWarehousesForClient(
        byCode,
        warehousesFallback,
        ingresoClientId.trim(),
        catalogCodeCuenta,
      );
      setLinkedWarehouses(merged);
    } finally {
      setLinkedWarehousesLoading(false);
    }
  }, [ingresoClientId, catalogCodeCuenta, warehousesFallback]);

  useEffect(() => {
    void loadLinkedWarehouses();
  }, [loadLinkedWarehouses]);

  useEffect(() => {
    setSelectedCatalogProductId("");
    setIngresoName("");
    setIngresoQuantityKg("");
  }, [ingresoClientId, setIngresoName, setIngresoQuantityKg]);

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

  useEffect(() => {
    if (!linkedWarehouses.length) return;
    if (linkedWarehouses.some((w) => w.id === warehouseId)) return;
    onWarehouseSelect(linkedWarehouses[0].id);
  }, [linkedWarehouses, warehouseId, onWarehouseSelect]);

  const ingresoAllowedByWarehouse =
    !linkedWarehousesLoading && linkedWarehouses.length > 0;

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
      setSelectedCatalogProductId("");
      setIngresoName("");
      setIngresoQuantityKg("");
    }
    setSelectedBoxId("");
  };

  const handleIngresoClienteChange = (value: string) => {
    setIngresoClientId(value);
    onClientChange?.(value);
    setSelectedCatalogProductId("");
    setIngresoName("");
    setIngresoQuantityKg("");
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
      <section className="flex flex-col lg:flex-row gap-6 items-stretch">
      <div className="rounded-2xl bg-white p-8 shadow-lg border border-green-200 w-full max-w-md mx-auto lg:mx-0 lg:w-87.5 flex flex-col gap-8 h-full">
        {/* Zona de ingresos arriba */}
        <div className="flex flex-col justify-between min-h-55">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-600 p-2 text-white">
                <FiArchive className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-lg font-semibold">Zona de ingresos</h2>
                <p className="text-xs text-slate-500">
                  Cajas recibidas recientemente
                </p>
              </div>
            </div>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-600">
              {inboundBoxes.length} cajas
            </span>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center mt-4">
            {inboundBoxes.length === 0 ? (
              <div className="flex flex-col items-center gap-2">
                <FiArchive className="w-10 h-10 text-slate-300" />
                <p className="text-sm text-slate-500">
                  No hay cajas en ingresos
                </p>
              </div>
            ) : (
              <div className="w-full max-h-32 overflow-y-auto flex flex-col items-center">
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
        <hr className="my-4 border-slate-200" />
        {/* Formulario de ingreso abajo */}
        {canUseIngresoForm ? (
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="rounded-full bg-emerald-600 p-2 text-white">
                <FiArchive className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-lg font-semibold">Ingreso de cajas</h2>
                <p className="text-xs text-slate-500">
                  Registrar nueva caja
                </p>
              </div>
            </div>
            <div className="grid gap-3 mt-6">
              <label className="text-sm font-medium text-slate-600">
                Orden de posición
              </label>
              <input
                value={ingresoPosition}
                type="number"
                readOnly
                className="w-full rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700"
              />
              <label className="text-sm font-medium text-slate-600">
                Cliente
              </label>
              <select
                value={ingresoClientId}
                onChange={(event) => handleIngresoClienteChange(event.target.value)}
                className="w-full rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 mb-2"
              >
                {clientsForCatalog.length === 0 ? (
                  <option value="">Sin clientes configurados</option>
                ) : (
                  clientsForCatalog.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))
                )}
              </select>
              <label className="text-sm font-medium text-slate-600">
                Bodega de la cuenta
              </label>
              {linkedWarehousesLoading && ingresoClientId.trim() ? (
                <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  Cargando bodegas…
                </p>
              ) : null}
              {!linkedWarehousesLoading &&
              linkedWarehouses.length === 0 &&
              ingresoClientId.trim() ? (
                <p
                  role="status"
                  className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
                >
                  Esta cuenta no tiene bodegas vinculadas.
                </p>
              ) : null}
              {!linkedWarehousesLoading && linkedWarehouses.length > 0 ? (
                <select
                  value={
                    linkedWarehouses.some((w) => w.id === warehouseId)
                      ? warehouseId
                      : linkedWarehouses[0]?.id ?? ""
                  }
                  onChange={(event) => onWarehouseSelect(event.target.value)}
                  className="w-full rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700"
                >
                  {linkedWarehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {warehouseOptionLabel(w)}
                    </option>
                  ))}
                </select>
              ) : null}
              {!catalogCodeCuenta && ingresoClientId && linkedWarehouses.length > 0 ? (
                <p className="text-xs text-amber-700">
                  Este cliente no tiene código de cuenta; no se puede cargar el catálogo. Completalo en
                  configuración.
                </p>
              ) : null}
              <label className="text-sm font-medium text-slate-600">
                Producto (catálogo)
              </label>
              <select
                value={selectedCatalogProductId}
                onChange={(event) => {
                  const id = event.target.value;
                  setSelectedCatalogProductId(id);
                  const p = catalogProducts.find((x) => x.id === id);
                  setIngresoName(p ? catalogLabel(p) : "");
                }}
                disabled={
                  catalogLoading ||
                  !catalogCodeCuenta ||
                  catalogProducts.length === 0 ||
                  !ingresoAllowedByWarehouse
                }
                className="w-full rounded-lg border border-emerald-200 px-3 py-2 text-sm text-emerald-800 disabled:bg-slate-100 disabled:text-slate-500"
              >
                <option value="">
                  {catalogLoading
                    ? "Cargando catálogo…"
                    : catalogProducts.length === 0
                      ? "Sin productos (revisa el catálogo del cliente)"
                      : "Selecciona un producto"}
                </option>
                {catalogProducts.map((p) => (
                  <option key={p.id} value={p.id ?? ""}>
                    {catalogLabel(p)}
                  </option>
                ))}
              </select>
              <label className="text-sm font-medium text-slate-600">
                Temperatura (°C)
              </label>
              <input
                value={ingresoTemp}
                onChange={(event) => setIngresoTemp(event.target.value)}
                type="number"
                disabled={!ingresoAllowedByWarehouse}
                className="w-full rounded-lg border border-emerald-200 px-3 py-2 text-sm text-emerald-800 disabled:bg-slate-100 disabled:text-slate-500"
                placeholder="Ej: -8"
              />
              <label className="text-sm font-medium text-slate-600">Cantidad (kg)</label>
              <input
                value={ingresoQuantityKg}
                onChange={(event) => setIngresoQuantityKg(event.target.value)}
                type="number"
                min={0}
                step="any"
                disabled={!ingresoAllowedByWarehouse}
                className="w-full rounded-lg border border-emerald-200 px-3 py-2 text-sm text-emerald-800 disabled:bg-slate-100 disabled:text-slate-500"
                placeholder="Ej: 250.5"
              />
              <button
                type="button"
                onClick={handleIngreso}
                disabled={!ingresoAllowedByWarehouse}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-400 disabled:hover:bg-slate-400"
              >
                <FiArchive className="w-4 h-4" /> Registrar ingreso
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* Zona de salida e ingresos */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-white p-8 shadow-lg border border-pink-200 w-full max-w-md mx-auto lg:mx-0 lg:w-87.5 flex flex-col gap-8 h-full">
          {/* Zona de salida arriba (solo lectura) */}
          <div className="flex flex-col justify-between min-h-55">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-pink-600 p-2 text-white">
                  <FiBox className="w-5 h-5" />
                </span>
                <div>
                  <h2 className="text-lg font-semibold">Zona de salida</h2>
                  <p className="text-xs text-slate-500">
                    Cajas programadas para salir
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-pink-100 px-3 py-1 text-xs font-semibold text-pink-600">
                {outboundFiltered.length} cajas
              </span>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center mt-4">
              {outboundFiltered.length === 0 ? (
                <div className="flex flex-col items-center gap-2">
                  <FiBox className="w-10 h-10 text-slate-300" />
                  <p className="text-sm text-slate-500">
                    No hay cajas en salida
                  </p>
                </div>
              ) : (
                <div className="w-full max-h-32 overflow-y-auto flex flex-col items-center">
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
          <hr className="my-4 border-pink-200" />
          {/* Formulario de envío abajo */}
          {outboundFiltered.length > 0 ? (
            <div className="flex flex-col h-full">
              <div className="flex items-center gap-3 mb-2">
                <span className="rounded-full bg-pink-600 p-2 text-white">
                  <FiBox className="w-5 h-5" />
                </span>
                <div>
                  <h2 className="text-lg font-semibold">Enviar caja</h2>
                  <p className="text-xs text-slate-500">
                    Registrar salida de caja
                  </p>
                </div>
              </div>
              <div className="grid gap-3 mt-6 flex-1">
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
            </div>
          ) : null}
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