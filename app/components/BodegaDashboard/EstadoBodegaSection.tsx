import { FiBox } from "react-icons/fi";
import { HiArrowRightOnRectangle } from "react-icons/hi2";
import React from "react";
import SlotsGrid from "../bodega/SlotsGrid";
import SelectedSlotCard from "../bodega/SelectedSlotCard";
import type {
  Box,
  BodegaOrder,
  Client,
  OrderSource,
  OrderType,
  ProcesamientoOrigenOrden,
  Slot,
  Role,
} from "../../interfaces/bodega";
import type { SolicitudProcesamiento } from "@/app/types/solicitudProcesamiento";
import type { Catalogo } from "@/app/types/catalogo";
import BodegaZonaCajaCard from "../bodega/BodegaZonaCajaCard";
import VentasEnCursoMapButton from "../bodega/VentasEnCursoMapButton";
import { ProcesamientoOrdenesActivasBodega } from "@/app/components/BodegaDashboard/ProcesamientoOrdenesActivasBodega";
import BodegaSlotLegend from "../bodega/BodegaSlotLegend";
import {
  EmptyZonaSlot,
  padToLength,
  ZONA_ENTRADA_SALIDA_SLOTS,
  ZonaCuatroSlotsRow,
} from "../bodega/ZonaCuatroSlotsRow";


type Props = {
  inboundBoxes: Box[];
  slots: Slot[];
  selectedPosition: number | null;
  handleSelectSlot: (position: number) => void;
  renderStatusButtons: (zone: "entrada" | "bodega" | "salida") => React.ReactNode;
  selectedSlot: Slot | null;
  setSelectedPosition: (position: number | null) => void;
  outboundBoxes: Box[];
  sortByPosition: <T extends { position: number }>(items: T[]) => T[];
  role?: Role;
  /** Para mostrar nombre de cliente en Entrada/Salida (el id se guarda en la caja). */
  clients?: Client[];
  /** Código de cuenta de la bodega para el modal Procesamiento en el mapa. */
  warehouseCodeCuenta?: string;
  sessionUid?: string;
  sessionRole?: Role;
  operariosBodega?: Array<{ id: string; name: string; roleLabel?: string }>;
  /** Usuarios con rol `procesador` — reasignación automática al pasar la orden a «En curso». */
  procesadoresBodega?: Array<{ id: string; name: string }>;
  tareasProcesamientoOperario?: Array<Record<string, unknown>>;
  onPushTareaProcesamientoOperario?: (tarea: Record<string, unknown>) => void;
  warehouseId?: string;
  onProcesamientoTerminadoInventario?: (
    nextSlots: Slot[],
    meta: {
      row: SolicitudProcesamiento;
      deductedKg: number;
      warning?: string;
      quitarTareaDeCola?: boolean;
    },
  ) => void | Promise<void>;
  /** Órdenes de trabajo pendientes (p. ej. movimientos procesamiento → bodega) para tareas informativas. */
  ordenesBodegaPendientes?: BodegaOrder[];
  /** Casilleros libres en mapa (traslado procesado → destino). */
  availableBodegaTargets?: number[];
  /** Crear orden `a_bodega` desde procesamiento (mismo contrato que en Órdenes del jefe). */
  onCrearOrdenBodega?: (params: {
    destination: OrderType;
    sourceZone: OrderSource;
    sourcePosition: number;
    targetPosition?: number;
    procesamientoOrigen?: ProcesamientoOrigenOrden;
  }) => void;
  /** Catálogo de la cuenta (opcional): etiquetas de unidad del primario en órdenes de procesamiento. */
  productosCatalogo?: Catalogo[];
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
    warehouseCodeCuenta = "",
    sessionUid,
    sessionRole,
    operariosBodega = [],
    procesadoresBodega = [],
    tareasProcesamientoOperario = [],
    onPushTareaProcesamientoOperario,
    warehouseId = "",
    onProcesamientoTerminadoInventario,
    ordenesBodegaPendientes = [],
    availableBodegaTargets = [],
    onCrearOrdenBodega,
    productosCatalogo,
  } = props;

  const sortedInboundBoxes = sortByPosition([...inboundBoxes]);
  const sortedOutboundBoxes = sortByPosition([...outboundBoxes]);

  const inboundSlotsItems = sortedInboundBoxes.slice(0, ZONA_ENTRADA_SALIDA_SLOTS);
  const outboundSlotsItems = sortedOutboundBoxes.slice(0, ZONA_ENTRADA_SALIDA_SLOTS);

  return (
    <div className="flex w-full flex-col gap-3 sm:gap-4">
    <section className="grid items-stretch gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.8fr)_minmax(0,1fr)] 2xl:grid-cols-[minmax(0,1fr)_minmax(0,2.1fr)_minmax(0,1fr)]">
      <div className="flex h-full min-h-0 w-full min-w-0 max-w-full flex-col rounded-3xl border border-emerald-200/95 bg-emerald-50/85 p-2 sm:max-w-lg sm:p-4">
        <div className="mb-2 flex min-w-0 shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="app-title flex min-w-0 items-center gap-2">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <FiBox className="h-[18px] w-[18px] sm:h-5 sm:w-5" aria-hidden />
            </span>
            Entrada
          </h3>
          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:ml-auto sm:justify-end">
            {renderStatusButtons("entrada")}
          </div>
        </div>
        <div className="flex min-h-0 w-full flex-1 flex-col justify-between gap-3">
          <div className="flex flex-col gap-2 sm:gap-4">
            <ZonaCuatroSlotsRow layout="dosPorColumna" slotCount={8}>
              {padToLength(inboundSlotsItems, ZONA_ENTRADA_SALIDA_SLOTS).map((box, idx) =>
                box ? (
                  <BodegaZonaCajaCard
                    key={`${box.position}-${box.autoId ?? "no-id"}-${idx}`}
                    box={box}
                    variant="entrada"
                    cornerLabel={idx + 1}
                    alertaTemperaturaAlta={
                      typeof box.temperature === "number" && box.temperature > 5
                    }
                    clients={clients}
                  />
                ) : (
                  <EmptyZonaSlot key={`entrada-empty-${idx}`} variant="entrada" label={idx + 1} />
                ),
              )}
            </ZonaCuatroSlotsRow>
            {sortedInboundBoxes.length === 0 ? (
              <p className="text-center text-base text-emerald-900/85">No hay cajas en ingreso.</p>
            ) : null}
            {sortedInboundBoxes.length > ZONA_ENTRADA_SALIDA_SLOTS ? (
              <p className="text-center text-base text-emerald-900/80">
                Mostrando {ZONA_ENTRADA_SALIDA_SLOTS} de {sortedInboundBoxes.length} cajas en ingreso.
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
        <SlotsGrid
          slots={slots}
          selectedPosition={selectedPosition}
          onSelect={handleSelectSlot}
          clients={clients}
          titleActions={
            <VentasEnCursoMapButton
              clients={clients}
              warehouseCodeCuenta={warehouseCodeCuenta}
              sessionRole={role}
              operariosBodega={operariosBodega}
              tareasProcesamientoOperario={tareasProcesamientoOperario}
              onPushTareaProcesamientoOperario={onPushTareaProcesamientoOperario}
              productosCatalogo={productosCatalogo}
            />
          }
          headerActions={renderStatusButtons("bodega")}
          occupiedCount={slots.filter((s) => s.autoId && s.autoId.trim() !== "").length}
          totalSlots={slots.length}
          role={role}
        />
        <div className="flex min-h-0 w-full flex-1 flex-col rounded-2xl border border-sky-200 bg-white p-3 shadow-md sm:p-4">
          <ProcesamientoOrdenesActivasBodega
            clients={clients}
            warehouseCodeCuenta={warehouseCodeCuenta}
            warehouseId={warehouseId}
            slots={slots}
            layout="slots4"
            pendientesContexto="procesamiento"
            sessionUid={sessionUid}
            sessionRole={sessionRole}
            operariosBodega={operariosBodega}
            procesadoresBodega={procesadoresBodega}
            tareasProcesamientoOperario={tareasProcesamientoOperario}
            onPushTareaProcesamientoOperario={onPushTareaProcesamientoOperario}
            onProcesamientoTerminadoInventario={onProcesamientoTerminadoInventario}
            ordenesBodegaPendientes={ordenesBodegaPendientes}
            availableBodegaTargets={availableBodegaTargets}
            onCrearOrdenBodega={onCrearOrdenBodega}
            productosCatalogo={productosCatalogo}
          />
        </div>
        <SelectedSlotCard
          slot={selectedSlot}
          onClose={() => setSelectedPosition(null)}
          onSave={() => undefined}
          canEdit={false}
          clients={clients}
        />
      </div>

      <div className="flex h-full min-h-0 w-full min-w-0 max-w-full flex-col rounded-3xl border border-pink-300 bg-pink-100/90 p-2 sm:max-w-lg sm:p-4">
        <div className="mb-2 flex min-w-0 shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="app-title flex min-w-0 items-center gap-2">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-pink-200/90 text-pink-900">
              <HiArrowRightOnRectangle className="h-[18px] w-[18px] sm:h-5 sm:w-5" aria-hidden />
            </span>
            Salida
          </h3>
          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:ml-auto sm:justify-end">
            {renderStatusButtons("salida")}
          </div>
        </div>

        <div className="flex min-h-0 w-full flex-1 flex-col justify-between gap-3">
          <div className="flex flex-col gap-2 sm:gap-4">
            <ZonaCuatroSlotsRow layout="dosPorColumna" slotCount={8}>
              {padToLength(outboundSlotsItems, ZONA_ENTRADA_SALIDA_SLOTS).map((box, idx) =>
                box ? (
                  <BodegaZonaCajaCard
                    key={`${box.position}-${box.autoId ?? "no-id"}-${idx}`}
                    box={box}
                    variant="salida"
                    cornerLabel={idx + 1}
                    clients={clients}
                  />
                ) : (
                  <EmptyZonaSlot key={`salida-empty-${idx}`} variant="salida" label={idx + 1} />
                ),
              )}
            </ZonaCuatroSlotsRow>
            {sortedOutboundBoxes.length === 0 ? (
                    <p className="text-center text-base text-pink-900/80">No hay cajas en salida.</p>
            ) : null}
            {sortedOutboundBoxes.length > ZONA_ENTRADA_SALIDA_SLOTS ? (
                    <p className="text-center text-base text-pink-900/75">
                Mostrando {ZONA_ENTRADA_SALIDA_SLOTS} de {sortedOutboundBoxes.length} cajas en salida.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
    <div className="flex w-full justify-center rounded-2xl border border-slate-200/80 bg-slate-50/60 px-3 py-2.5 sm:px-4">
      <BodegaSlotLegend variant="global" align="center" spacing="none" />
    </div>
    </div>
  );
}