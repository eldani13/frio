import React, { useCallback, useMemo, useState, useEffect } from "react";
import { FiBox, FiAlertCircle } from "react-icons/fi";
import { HiArrowRightOnRectangle } from "react-icons/hi2";
import { IoCloseOutline } from "react-icons/io5";
import type { Box, Client, Slot, BodegaOrder } from "../../interfaces/bodega";
import { TruckService } from "@/app/services/camionService";
import type { Camion } from "@/app/types/camion";
import {
  OcOrdenIngresoPanel,
  type IngresoDesdeOrdenCompraPayload,
} from "@/app/components/BodegaDashboard/OcOrdenIngresoPanel";
import {
  OcOrdenVentaIngresoPanel,
  type IngresoDesdeOrdenVentaPayload,
} from "@/app/components/BodegaDashboard/OcOrdenVentaIngresoPanel";
import BodegaZonaCajaCard from "@/app/components/bodega/BodegaZonaCajaCard";
import BodegaSlotLegend from "@/app/components/bodega/BodegaSlotLegend";
import {
  EmptyZonaSlot,
  padToLength,
  ZONA_ENTRADA_SALIDA_SLOTS,
  ZonaCuatroSlotsRow,
} from "@/app/components/bodega/ZonaCuatroSlotsRow";
import type { VentaPendienteCartonaje } from "@/app/types/ventaCuenta";

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
  handleDispatchBox: (
    position: number,
    truck: Camion | null,
    truckClientId: string,
  ) => Promise<boolean>;
  availableBodegaTargets: number[];
  isCliente?: boolean;
  clientFilterId?: string;
  onClientChange?: (id: string) => void;
  clientsForCatalog: Client[];
  warehouseId: string;
  isBodegaInterna: boolean;
  warehouseCodeCuenta?: string;
  onIngresoDesdeOrdenCompra: (payload: IngresoDesdeOrdenCompraPayload) => Promise<void>;
  onIngresoDesdeOrdenVenta: (payload: IngresoDesdeOrdenVentaPayload) => Promise<void>;
  /** Custodio: despachar todas las cajas en salida de una OV en un solo envío (estado → Transporte + viaje). */
  onDespachoPaqueteOrdenVenta?: (orden: VentaPendienteCartonaje, truck: Camion | null) => Promise<void>;
};

export default function IngresosSection(props: Props) {
  const {
    isCustodio,
    slots,
    orders,
    inboundBoxes,
    outboundBoxes,
    ingresoClientId: _ingresoClientId,
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
    warehouseCodeCuenta,
    onIngresoDesdeOrdenCompra,
    onIngresoDesdeOrdenVenta,
    onDespachoPaqueteOrdenVenta,
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

  const [selectedBoxId, setSelectedBoxId] = useState<string>("");
  /** OV cuyas cajas en salida se enviarán juntas desde esta columna. */
  const [paqueteDespacho, setPaqueteDespacho] = useState<VentaPendienteCartonaje | null>(null);
  const [enviandoPaquete, setEnviandoPaquete] = useState(false);
  const [packageTrucks, setPackageTrucks] = useState<Camion[]>([]);
  const [packageTruckId, setPackageTruckId] = useState("");
  const [packageTrucksLoading, setPackageTrucksLoading] = useState(false);
  const [packageTrucksError, setPackageTrucksError] = useState<string | null>(null);
  const [manualTrucks, setManualTrucks] = useState<Camion[]>([]);
  const [manualTruckId, setManualTruckId] = useState("");
  const [manualTrucksLoading, setManualTrucksLoading] = useState(false);
  const [manualTrucksError, setManualTrucksError] = useState<string | null>(null);

  const outboundFiltered = useMemo(
    () =>
      outboundBoxes.filter((box) =>
        boxMatchesSalidaFilter(box, salidaFilterValue, clientsForCatalog),
      ),
    [outboundBoxes, salidaFilterValue, clientsForCatalog],
  );

  const selectedBox = useMemo(() => {
    if (!selectedBoxId) return outboundFiltered[0];
    return (
      outboundFiltered.find(
        (box) => (box.autoId ?? `pos-${box.position}`) === selectedBoxId,
      ) || outboundFiltered[0]
    );
  }, [outboundFiltered, selectedBoxId]);

  const sortedInboundIng = useMemo(
    () => sortByPosition([...inboundBoxes]),
    [inboundBoxes, sortByPosition],
  );
  const sortedOutboundIng = useMemo(
    () => sortByPosition([...outboundFiltered]),
    [outboundFiltered, sortByPosition],
  );
  const inboundSlotsItemsIng = useMemo(
    () => sortedInboundIng.slice(0, ZONA_ENTRADA_SALIDA_SLOTS),
    [sortedInboundIng],
  );
  const outboundSlotsItemsIng = useMemo(
    () => sortedOutboundIng.slice(0, ZONA_ENTRADA_SALIDA_SLOTS),
    [sortedOutboundIng],
  );

  const paqueteActivoKey = useMemo(
    () =>
      paqueteDespacho
        ? `${String(paqueteDespacho.idClienteDueno ?? "").trim()}::${String(paqueteDespacho.id ?? "").trim()}`
        : "",
    [paqueteDespacho],
  );

  /** Misma lógica que el despacho en BodegaDashboard: todas las cajas en salida de la OV (sin filtro de cliente). */
  const cajasPaqueteEnSalida = useMemo(() => {
    if (!paqueteDespacho) return [];
    const cid = String(paqueteDespacho.idClienteDueno ?? "").trim();
    const vid = String(paqueteDespacho.id ?? "").trim();
    if (!cid || !vid) return [];
    return outboundBoxes.filter(
      (b) =>
        String(b.ordenVentaId ?? "").trim() === vid &&
        String(b.ordenVentaClienteId ?? "").trim() === cid,
    );
  }, [paqueteDespacho, outboundBoxes]);

  const [reviewModal, setReviewModal] = useState<Box | null>(null);
  const [tempError, setTempError] = useState<string | null>(null);
  const [manualTruckError, setManualTruckError] = useState<string | null>(null);
  const [tempConfirmModal, setTempConfirmModal] = useState<{
    box: Box;
    finalTemp: string;
  } | null>(null);
  const [tempConfirmError, setTempConfirmError] = useState<string | null>(null);

  const truckLabel = useCallback((truck: Camion) => {
    const plate = String(truck.plate ?? "").trim();
    const brand = String(truck.brand ?? "").trim();
    const model = String(truck.model ?? "").trim();
    const code = String(truck.code ?? "").trim();
    const parts = [code, plate, [brand, model].filter(Boolean).join(" ")].filter(Boolean);
    return parts.join(" · ") || "Camion";
  }, []);

  const resolveClientId = useCallback(
    (raw: string) => {
      const needle = String(raw ?? "").trim();
      if (!needle) return "";
      const byId = clientsForCatalog.find((c) => c.id === needle);
      if (byId) return byId.id;
      const byName = clientsForCatalog.find(
        (c) => c.name.trim().toLowerCase() === needle.toLowerCase(),
      );
      return byName?.id ?? needle;
    },
    [clientsForCatalog],
  );

  const packageClientId = useMemo(
    () => String(paqueteDespacho?.idClienteDueno ?? "").trim(),
    [paqueteDespacho],
  );
  const packageCodeCuenta = useMemo(() => {
    const direct = String(paqueteDespacho?.codeCuenta ?? "").trim();
    if (direct) return direct;
    if (packageClientId) {
      return String(
        clientsForCatalog.find((c) => c.id === packageClientId)?.code ?? "",
      ).trim();
    }
    return String(warehouseCodeCuenta ?? "").trim();
  }, [paqueteDespacho, packageClientId, clientsForCatalog, warehouseCodeCuenta]);

  const manualClientId = useMemo(() => {
    const byVenta = String(selectedBox?.ordenVentaClienteId ?? "").trim();
    if (byVenta) return byVenta;
    if (salidaFilterValue) return String(salidaFilterValue).trim();
    const raw = String(selectedBox?.client ?? "").trim();
    return resolveClientId(raw);
  }, [selectedBox, salidaFilterValue, resolveClientId]);

  const manualCodeCuenta = useMemo(() => {
    if (manualClientId) {
      const byClient = clientsForCatalog.find((c) => c.id === manualClientId)?.code;
      if (byClient) return String(byClient).trim();
    }
    return String(warehouseCodeCuenta ?? "").trim();
  }, [manualClientId, clientsForCatalog, warehouseCodeCuenta]);

  const selectedPackageTruck = useMemo(
    () => packageTrucks.find((t) => t.id === packageTruckId) ?? null,
    [packageTrucks, packageTruckId],
  );
  const selectedManualTruck = useMemo(
    () => manualTrucks.find((t) => t.id === manualTruckId) ?? null,
    [manualTrucks, manualTruckId],
  );

  useEffect(() => {
    if (!packageClientId || !packageCodeCuenta) {
      setPackageTrucks([]);
      setPackageTruckId("");
      setPackageTrucksError(null);
      return;
    }
    let cancelled = false;
    setPackageTrucksLoading(true);
    setPackageTrucksError(null);
    void TruckService.getAll(packageClientId, packageCodeCuenta)
      .then((items) => {
        if (cancelled) return;
        const available = items.filter((t) => t.isAvailable);
        setPackageTrucks(available);
        setPackageTruckId((prev) =>
          available.some((t) => t.id === prev) ? prev : "",
        );
      })
      .catch(() => {
        if (cancelled) return;
        setPackageTrucks([]);
        setPackageTruckId("");
        setPackageTrucksError("No se pudieron cargar los camiones disponibles.");
      })
      .finally(() => {
        if (!cancelled) setPackageTrucksLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [packageClientId, packageCodeCuenta]);

  useEffect(() => {
    if (!manualClientId || !manualCodeCuenta) {
      setManualTrucks([]);
      setManualTruckId("");
      setManualTrucksError(null);
      setManualTruckError(null);
      return;
    }
    let cancelled = false;
    setManualTrucksLoading(true);
    setManualTrucksError(null);
    void TruckService.getAll(manualClientId, manualCodeCuenta)
      .then((items) => {
        if (cancelled) return;
        const available = items.filter((t) => t.isAvailable);
        setManualTrucks(available);
        setManualTruckId((prev) =>
          available.some((t) => t.id === prev) ? prev : "",
        );
      })
      .catch(() => {
        if (cancelled) return;
        setManualTrucks([]);
        setManualTruckId("");
        setManualTrucksError("No se pudieron cargar los camiones disponibles.");
      })
      .finally(() => {
        if (!cancelled) setManualTrucksLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [manualClientId, manualCodeCuenta]);

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

  return (
    <>
      <section className="grid min-h-0 w-full min-w-0 grid-cols-1 items-stretch gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* 1. Orden de ingreso (solo OC) */}
        <div className="flex h-full min-h-0 w-full min-w-0 flex-col">
          <OcOrdenIngresoPanel
            warehouseId={warehouseId}
            isBodegaInterna={isBodegaInterna}
            onRegistrar={onIngresoDesdeOrdenCompra}
            className="h-full min-h-0 flex-1 flex-col overflow-y-auto [scrollbar-gutter:stable]"
          />
        </div>

        {/* 2. Zona de ingreso (solo cola de cajas) */}
        <div className="flex h-full min-h-0 w-full min-w-0 flex-col rounded-2xl border border-emerald-200/95 bg-emerald-50/85 p-4 shadow-lg sm:p-6 lg:p-8">
          <div className="flex shrink-0 items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                <FiBox className="h-[18px] w-[18px] sm:h-5 sm:w-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <h2 className="app-title">
                  Zona de ingreso
                </h2>
              </div>
            </div>
            <span className="shrink-0 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-900">
              {inboundBoxes.length} cajas
            </span>
          </div>
          <div className="mt-3 flex min-h-0 flex-1 flex-col gap-3">
            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden [scrollbar-gutter:stable]">
              <ZonaCuatroSlotsRow layout="dosPorColumna" slotCount={8}>
                {padToLength(inboundSlotsItemsIng, ZONA_ENTRADA_SALIDA_SLOTS).map((box, idx) =>
                  box ? (
                    <BodegaZonaCajaCard
                      key={`ingreso-${box.position}-${box.autoId ?? "no-id"}-${idx}`}
                      box={box}
                      variant="entrada"
                      cornerLabel={idx + 1}
                      alertaTemperaturaAlta={
                        typeof box.temperature === "number" && box.temperature > HIGH_TEMP_THRESHOLD
                      }
                      className="mx-auto w-full"
                      clients={clientsForCatalog}
                      detalleChildren={
                        box.ordenCompraId || box.ordenVentaId ? (
                          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-3 text-xs text-slate-600">
                            {box.ordenCompraId ? (
                              <p>
                                <span className="font-semibold text-slate-700">OC: </span>
                                {box.ordenCompraId}
                              </p>
                            ) : null}
                            {box.ordenVentaId ? (
                              <p className={box.ordenCompraId ? "mt-1.5" : ""}>
                                <span className="font-semibold text-slate-700">Venta: </span>
                                {box.ordenVentaId}
                              </p>
                            ) : null}
                          </div>
                        ) : null
                      }
                    />
                  ) : (
                    <EmptyZonaSlot
                      key={`ing-ingreso-empty-${idx}`}
                      variant="entrada"
                      label={idx + 1}
                    />
                  ),
                )}
              </ZonaCuatroSlotsRow>
              {inboundBoxes.length === 0 ? (
                <p className="mt-2 text-center text-base text-emerald-900/85">No hay cajas en ingresos.</p>
              ) : null}
              {sortedInboundIng.length > ZONA_ENTRADA_SALIDA_SLOTS ? (
                <p className="mt-2 text-center text-base text-emerald-900/80">
                  Mostrando {ZONA_ENTRADA_SALIDA_SLOTS} de {sortedInboundIng.length} cajas.
                </p>
              ) : null}
            </div>
          </div>
        </div>

        {/* 3. Zona de salida */}
        <div className="flex h-full min-h-0 w-full min-w-0 flex-col rounded-2xl border border-pink-300 bg-pink-100/90 p-4 shadow-lg sm:p-6 lg:p-8">
          <div className="flex shrink-0 items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-pink-200/90 text-pink-900">
                <HiArrowRightOnRectangle className="h-[18px] w-[18px] sm:h-5 sm:w-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <h2 className="app-title">
                  Zona de salida
                </h2>
              </div>
            </div>
            <span className="shrink-0 rounded-full bg-pink-200/80 px-3 py-1 text-xs font-semibold text-pink-900">
              {outboundFiltered.length} cajas
            </span>
          </div>
          <div className="mt-3 flex min-h-0 flex-1 flex-col gap-3">
            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden [scrollbar-gutter:stable]">
              <ZonaCuatroSlotsRow layout="dosPorColumna" slotCount={8}>
                {padToLength(outboundSlotsItemsIng, ZONA_ENTRADA_SALIDA_SLOTS).map((box, idx) =>
                  box ? (
                    <BodegaZonaCajaCard
                      key={`salida-scroll-${box.position}-${box.autoId ?? "no-id"}-${idx}`}
                      box={box}
                      variant="salida"
                      cornerLabel={idx + 1}
                      className="mx-auto w-full"
                      clients={clientsForCatalog}
                      onCardClick={() =>
                        setSelectedBoxId(box.autoId ?? `pos-${box.position}`)
                      }
                      detalleChildren={
                        box.ordenCompraId || box.ordenVentaId ? (
                          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-3 text-xs text-slate-600">
                            {box.ordenCompraId ? (
                              <p>
                                <span className="font-semibold text-slate-700">OC: </span>
                                {box.ordenCompraId}
                              </p>
                            ) : null}
                            {box.ordenVentaId ? (
                              <p className={box.ordenCompraId ? "mt-1.5" : ""}>
                                <span className="font-semibold text-slate-700">Venta: </span>
                                {box.ordenVentaId}
                              </p>
                            ) : null}
                          </div>
                        ) : null
                      }
                    />
                  ) : (
                    <EmptyZonaSlot
                      key={`ing-salida-empty-${idx}`}
                      variant="salida"
                      label={idx + 1}
                    />
                  ),
                )}
              </ZonaCuatroSlotsRow>
              {outboundFiltered.length === 0 ? (
                <p className="mt-2 text-center text-base text-slate-500">No hay cajas en salida.</p>
              ) : null}
              {sortedOutboundIng.length > ZONA_ENTRADA_SALIDA_SLOTS ? (
                <p className="mt-2 text-center text-base text-pink-900/75">
                  Mostrando {ZONA_ENTRADA_SALIDA_SLOTS} de {sortedOutboundIng.length} cajas.
                </p>
              ) : null}
            </div>
          </div>
        </div>

        {/* 4. Orden de salida: venta (paquete / registro) + envío manual caja a caja */}
        <div className="flex h-full min-h-0 w-full min-w-0 flex-col rounded-2xl border border-pink-300 bg-pink-100/90 p-4 shadow-lg sm:p-6 lg:p-8">
          <div className="flex shrink-0 items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-pink-200/90 text-pink-900">
                <HiArrowRightOnRectangle className="h-[18px] w-[18px] sm:h-5 sm:w-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <h2 className="app-title">
                  Orden de salida
                </h2>
              </div>
            </div>
            <span className="shrink-0 rounded-full bg-pink-200/80 px-3 py-1 text-xs font-semibold text-pink-900">
              {paqueteDespacho ? "Paquete" : `${outboundFiltered.length} cajas`}
            </span>
          </div>

          <div className="mt-2 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto [scrollbar-gutter:stable]">
            {isBodegaInterna ? (
              <OcOrdenVentaIngresoPanel
                warehouseId={warehouseId}
                isBodegaInterna={isBodegaInterna}
                outboundBoxes={outboundBoxes}
                paqueteActivoKey={paqueteActivoKey}
                onArmarPaquete={(orden) => setPaqueteDespacho(orden)}
                onRegistrar={onIngresoDesdeOrdenVenta}
                embedEnOrdenSalida
              />
            ) : null}

            {isBodegaInterna && (paqueteDespacho || outboundFiltered.length > 0) ? (
              <div className="shrink-0 border-t border-pink-300/70" aria-hidden />
            ) : null}

            {paqueteDespacho ? (
              <div className="rounded-2xl border-2 border-dashed border-pink-400 bg-linear-to-br from-pink-50 to-white p-4 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wide text-pink-900">Paquete listo</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {paqueteDespacho.numero}{" "}
                  <span className="font-normal text-slate-600">· {paqueteDespacho.compradorNombre}</span>
                </p>
                {cajasPaqueteEnSalida.length === 0 ? (
                  <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    No hay cajas de esta venta en <strong>zona de salida</strong> (o faltan{" "}
                    <code className="rounded bg-white/80 px-0.5">ordenVentaId</code> /{" "}
                    <code className="rounded bg-white/80 px-0.5">ordenVentaClienteId</code> en las cajas). Revisá{" "}
                    <strong>Zona de salida</strong> y el flujo operario hasta salida.
                  </p>
                ) : (
                  <>
                    <p className="mt-2 text-base text-slate-600">
                      Se enviarán <strong>{cajasPaqueteEnSalida.length}</strong> caja(s) en un solo paso; la venta pasa
                      a <strong>Transporte</strong> y el viaje queda para el rol transporte.
                    </p>
                    <ul className="mt-2 max-h-[min(10rem,30vh)] space-y-1 overflow-y-auto text-xs text-slate-700">
                      {sortByPosition(cajasPaqueteEnSalida).map((b, i) => (
                        <li key={`pkg-${b.position}-${b.autoId ?? i}`} className="font-mono">
                          {b.autoId || `Pos ${b.position}`}
                          {b.name ? ` · ${b.name}` : ""}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                <div className="mt-3 grid gap-2">
                  <label className="text-sm font-medium text-slate-600">Camion asignado</label>
                  <select
                    value={packageTruckId}
                    onChange={(event) => setPackageTruckId(event.target.value)}
                    disabled={packageTrucksLoading || packageTrucks.length === 0}
                    className="w-full rounded-lg border border-pink-300 bg-pink-50/90 px-3 py-2 text-sm text-pink-900"
                  >
                    <option value="">
                      {packageTrucksLoading
                        ? "Cargando camiones…"
                        : packageTrucks.length === 0
                          ? "Sin camiones disponibles"
                          : "Selecciona un camión"}
                    </option>
                    {packageTrucks.map((truck) => (
                      <option key={truck.id} value={truck.id}>
                        {truckLabel(truck)}
                      </option>
                    ))}
                  </select>
                  {packageTrucksError ? (
                    <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
                      {packageTrucksError}
                    </p>
                  ) : null}
                </div>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  {onDespachoPaqueteOrdenVenta ? (
                    <button
                      type="button"
                      disabled={
                        enviandoPaquete ||
                        cajasPaqueteEnSalida.length === 0 ||
                        !selectedPackageTruck
                      }
                      onClick={() => {
                        void (async () => {
                          setEnviandoPaquete(true);
                          try {
                            await onDespachoPaqueteOrdenVenta(paqueteDespacho, selectedPackageTruck);
                            setPaqueteDespacho(null);
                            setPackageTruckId("");
                            setPackageTrucks((prev) =>
                              prev.filter((t) => t.id !== selectedPackageTruck?.id),
                            );
                          } finally {
                            setEnviandoPaquete(false);
                          }
                        })();
                      }}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-pink-700 px-4 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-pink-600 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      <FiBox className="h-4 w-4 shrink-0" />
                      {enviandoPaquete ? "Enviando…" : "Enviar paquete al transporte"}
                    </button>
                  ) : (
                    <p className="text-xs text-pink-900/90">El envío de paquete no está disponible en este contexto.</p>
                  )}
                  <button
                    type="button"
                    disabled={enviandoPaquete}
                    onClick={() => setPaqueteDespacho(null)}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancelar paquete
                  </button>
                </div>
              </div>
            ) : null}

            {!paqueteDespacho && outboundFiltered.length > 0 ? (
              <div className="grid gap-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-pink-900/90">Envío manual</p>
                <label className="text-sm font-medium text-slate-600">Orden de posición</label>
                <input
                  value={selectedBox?.position ?? ""}
                  type="number"
                  readOnly
                  className="w-full rounded-lg border border-pink-300 bg-pink-50/90 px-3 py-2 text-sm text-pink-900"
                />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-slate-600">Cliente</label>
                    <select
                      value={salidaFilterValue}
                      onChange={(event) => handleSalidaClientFilterChange(event.target.value)}
                      disabled={isCliente && !onClientChange}
                      className="w-full rounded-lg border border-pink-300 bg-pink-50/90 px-3 py-2 text-sm text-pink-900"
                    >
                      <option value="">Todos</option>
                      {clientsForCatalog.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                      {salidaFilterValue && !clientsForCatalog.some((c) => c.id === salidaFilterValue) ? (
                        <option value={salidaFilterValue}>
                          {`Cliente (id: ${salidaFilterValue.slice(0, 12)}…)`}
                        </option>
                      ) : null}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-slate-600">Caja</label>
                    <select
                      value={selectedBoxId}
                      onChange={(event) => setSelectedBoxId(event.target.value)}
                      disabled={boxOptions.length === 0}
                      className="w-full rounded-lg border border-pink-300 bg-pink-50/90 px-3 py-2 text-sm text-pink-900"
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
                <label className="text-sm font-medium text-slate-600">Camion</label>
                <select
                  value={manualTruckId}
                  onChange={(event) => {
                    setManualTruckId(event.target.value);
                    setManualTruckError(null);
                  }}
                  disabled={manualTrucksLoading || manualTrucks.length === 0}
                  className="w-full rounded-lg border border-pink-300 bg-pink-50/90 px-3 py-2 text-sm text-pink-900"
                >
                  <option value="">
                    {manualTrucksLoading
                      ? "Cargando camiones…"
                      : manualTrucks.length === 0
                        ? "Sin camiones disponibles"
                        : "Selecciona un camión"}
                  </option>
                  {manualTrucks.map((truck) => (
                    <option key={truck.id} value={truck.id}>
                      {truckLabel(truck)}
                    </option>
                  ))}
                </select>
                {manualTrucksError ? (
                  <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
                    {manualTrucksError}
                  </p>
                ) : null}
                {manualTruckError ? (
                  <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
                    {manualTruckError}
                  </p>
                ) : null}
                <label className="text-sm font-medium text-slate-600">Nombre de la caja</label>
                <input
                  value={selectedBox?.name ?? ""}
                  readOnly
                  className="w-full rounded-lg border border-pink-300 bg-white/90 px-3 py-2 text-sm text-slate-800"
                />
                <label className="text-sm font-medium text-slate-600">Temperatura (°C)</label>
                <input
                  value={selectedBox?.temperature ?? ""}
                  type="number"
                  readOnly
                  className="w-full rounded-lg border border-pink-300 bg-white/90 px-3 py-2 text-sm text-slate-800"
                />
                <label className="text-sm font-medium text-slate-600">Cantidad (kg)</label>
                <input
                  value={
                    selectedBox && typeof selectedBox.quantityKg === "number"
                      ? String(selectedBox.quantityKg)
                      : ""
                  }
                  readOnly
                  className="w-full rounded-lg border border-pink-300 bg-white/90 px-3 py-2 text-sm text-slate-800"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!selectedBox) return;
                    if (!selectedManualTruck || !manualClientId) {
                      setManualTruckError("Selecciona un camión disponible antes de enviar la caja.");
                      return;
                    }
                    setManualTruckError(null);
                    setReviewModal(selectedBox);
                  }}
                  className="mt-auto flex items-center justify-center gap-2 rounded-lg bg-pink-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-pink-600"
                >
                  <HiArrowRightOnRectangle className="h-4 w-4" aria-hidden /> Enviar caja
                </button>
              </div>
            ) : null}

            {!paqueteDespacho && outboundFiltered.length === 0 ? (
              isBodegaInterna ? (
                <p className="text-center text-base leading-relaxed text-pink-900/75">
                  No hay cajas en salida para envío manual. Arriba podés elegir una venta, armar paquete o registrar por
                  línea cuando corresponda.
                </p>
              ) : (
                <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 py-8 text-center text-sm text-pink-900/70">
                  <HiArrowRightOnRectangle className="h-10 w-10 text-pink-300" aria-hidden />
                  <p>No hay cajas en salida ni paquete seleccionado.</p>
                </div>
              )
            ) : null}
          </div>
        </div>
      </section>
      <div className="mt-3 flex w-full justify-center rounded-2xl border border-slate-200/80 bg-slate-50/60 px-3 py-2.5 sm:mt-4 sm:px-4">
        <BodegaSlotLegend variant="global" align="center" spacing="none" />
      </div>

    {reviewModal && (
      <div
        className="fixed inset-0 z-[80] flex items-center justify-center backdrop-blur-sm bg-black/20 animate-fade-in p-2 sm:p-4"
        role="dialog"
        aria-modal="true"
        onClick={() => setReviewModal(null)}
      >
        <div
          className="relative w-full max-w-lg animate-fade-in-up overflow-hidden rounded-3xl border border-red-100 bg-white/95 shadow-2xl backdrop-blur-lg sm:max-w-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col items-center justify-center pt-8 pb-4 px-8 border-b border-red-100 bg-linear-to-r from-red-50 to-white rounded-t-3xl relative">
            <span className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-red-100 shadow mb-2">
              <FiAlertCircle className="w-8 h-8 text-red-500" />
            </span>
            <h2 className="app-title mb-1">
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
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold text-slate-600">Camion</span>
                <span className="text-slate-900 font-semibold truncate max-w-[55%]">
                  {selectedManualTruck ? truckLabel(selectedManualTruck) : "Sin camión"}
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
          className="relative w-full max-w-sm animate-fade-in-up overflow-hidden rounded-2xl border border-emerald-100 bg-white/95 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col items-center justify-center pt-6 pb-3 px-5 border-b border-emerald-100 bg-linear-to-r from-emerald-50 to-white relative">
            <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 mb-2 shadow">
              <FiAlertCircle className="w-6 h-6 text-emerald-600" />
            </span>
            <h3 className="app-title">
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
                if (!selectedManualTruck || !manualClientId) {
                  setTempConfirmError("Selecciona un camión disponible antes de enviar.");
                  return;
                }
                setTempConfirmModal(null);
                void (async () => {
                  const ok = await handleDispatchBox(
                    tempConfirmModal.box.position,
                    selectedManualTruck,
                    manualClientId,
                  );
                  if (ok) {
                    setManualTrucks((prev) =>
                      prev.filter((t) => t.id !== selectedManualTruck.id),
                    );
                    setManualTruckId("");
                  }
                })();
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