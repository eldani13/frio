"use client";

import React from "react";
import { HiArrowsRightLeft, HiOutlineChevronDown, HiOutlineXMark } from "react-icons/hi2";
import { FiBox, FiCpu } from "react-icons/fi";
import { MdPendingActions } from "react-icons/md";
import type {
  BodegaOrder,
  Client,
  OrderSource,
  OrderType,
  ProcesamientoOrigenOrden,
  Role,
  Slot,
} from "@/app/interfaces/bodega";
import {
  desperdicioDevueltoEnMapa,
  listPendientesMovimientoBodega,
  procesamientoUbicacionCompletaEnMapa,
  slotTieneProcesadoUbicado,
  type PendienteMovimientoBodega,
} from "@/app/lib/pendientesMovimientoProcesamiento";
import {
  BODEGA_ZONE_STATUS_ICON_ACTIVE_CLASS,
  BODEGA_ZONE_STATUS_ICON_INACTIVE_CLASS,
  BODEGA_ZONE_STATUS_NUM_ACTIVE_CLASS,
  BODEGA_ZONE_STATUS_NUM_INACTIVE_CLASS,
  BODEGA_ZONE_STATUS_PILL_ACTIVE_CLASS,
  BODEGA_ZONE_STATUS_PILL_INACTIVE_CLASS,
  OCCUPIED_MAPA_TONE_PRIMARIO,
  OCCUPIED_MAPA_TONE_PROCESADO,
} from "@/app/lib/bodegaDisplay";
import { kgSobranteParaDevolucionMapa, unidadesSecundarioEnterasParaMapa } from "@/app/lib/sobranteKg";
import { recordMermaProcesamientoKg } from "@/lib/bodegaCloudState";
import { SolicitudProcesamientoService } from "@/app/services/solicitudProcesamientoService";
import type { SolicitudProcesamiento } from "@/app/types/solicitudProcesamiento";
import {
  deductSlotsAfterProcesamientoTerminado,
  findSlotPrimarioParaDevolverDesperdicio,
} from "@/lib/procesamientoInventarioBodega";
import {
  desperdicioKgSugeridoDesdeMerma,
  stringKgInicialDesperdicio,
} from "@/app/lib/desperdicioKgSugerido";
import {
  PROCESAMIENTO_ESTADOS,
  procesamientoEstadoBadgeClass,
  normalizeProcesamientoEstado,
} from "@/app/types/solicitudProcesamiento";
import { BodegaDetalleModalFila, BodegaDetalleModalShell } from "@/app/components/bodega/CajaDetalleModal";
import { EmptyZonaSlot, ZonaCuatroSlotsRow } from "@/app/components/bodega/ZonaCuatroSlotsRow";
import {
  BODEGA_SLOT_BODY_CLASS,
  BODEGA_SLOT_ROUNDED,
  BODEGA_SLOT_SHELL_CLASS,
  BODEGA_SLOT_SHELL_PADDING,
} from "@/app/lib/bodegaSlotUniform";
import type { Catalogo } from "@/app/types/catalogo";
import {
  cantidadPrimarioProcesamientoTexto,
  estimadoUnidadesSecundarioTexto,
  primarioCatalogoPorId,
} from "@/app/lib/procesamientoDisplay";

function opcionesEstadoSelect(estadoActual: string): string[] {
  const cur = estadoActual.trim();
  const ordered = [...PROCESAMIENTO_ESTADOS];
  const base = cur && !ordered.some((x) => x === cur) ? [cur, ...ordered] : [...ordered];
  const n = normalizeProcesamientoEstado(estadoActual);
  /** «Terminado» solo lo asigna el sistema al ubicar todo en almacenamiento. */
  if (n === "Pendiente" || n === "Terminado") {
    return [n];
  }
  if (n === "Iniciado") {
    return base.filter((x) => x !== "Terminado" && x !== "Pendiente");
  }
  if (n === "En curso") {
    return base.filter((x) => x !== "Terminado");
  }
  return base;
}

/** Solo el responsable asignado (operario o procesador) puede elegir «En curso» desde «Iniciado». */
function opcionesEstadoParaSesion(row: SolicitudProcesamiento, sessionUid?: string): string[] {
  const base = opcionesEstadoSelect(row.estado);
  const cur = normalizeProcesamientoEstado(row.estado);
  if (cur !== "Iniciado") return base;
  const op = String(row.operarioBodegaUid ?? "").trim();
  const uid = String(sessionUid ?? "").trim();
  if (!op || uid !== op) return base.filter((o) => o !== "En curso");
  return base;
}

function formatKgDesperdicio(n: number | undefined | null): string {
  if (n === undefined || n === null || !Number.isFinite(Number(n))) return "—";
  return `${Number(n).toLocaleString("es-CO", { maximumFractionDigits: 4 })} kg`;
}

function createdAtMsRow(s: SolicitudProcesamiento): number {
  const ts = s.createdAt;
  if (ts && typeof ts.toMillis === "function") {
    try {
      return ts.toMillis();
    } catch {
      return 0;
    }
  }
  return 0;
}

function esActivaEnBodega(row: SolicitudProcesamiento): boolean {
  const e = normalizeProcesamientoEstado(row.estado);
  return e === "Iniciado" || e === "En curso";
}

/**
 * Una celda de la fila de 4: en **En curso** solo primario; en **Pendiente** (o legado **Terminado**) solo lo que aún no volvió al mapa
 * (desperdicio reintegrado al primario y/o procesado ubicado en casillero).
 */
type ZonaSlotItem =
  | { kind: "primario"; row: SolicitudProcesamiento }
  | { kind: "secundario"; row: SolicitudProcesamiento };

function slotItemsDesdeFilasZona(filas: SolicitudProcesamiento[], slots: Slot[]): ZonaSlotItem[] {
  const out: ZonaSlotItem[] = [];
  for (const row of filas) {
    const e = normalizeProcesamientoEstado(row.estado);
    const cid = String(row.clientId ?? "").trim();
    const sid = String(row.id ?? "").trim();

    if (e === "En curso") {
      out.push({ kind: "primario", row });
      continue;
    }

    if (e === "Pendiente" || e === "Terminado") {
      const sk = kgSobranteParaDevolucionMapa(row);
      const muestraPrimario = sk > 0 && !desperdicioDevueltoEnMapa(slots, cid, sid);
      const muestraSecundario = !slotTieneProcesadoUbicado(slots, cid, sid);
      if (muestraPrimario) {
        out.push({ kind: "primario", row });
      }
      if (muestraSecundario) {
        out.push({ kind: "secundario", row });
      }
      continue;
    }
  }
  return out;
}

function puedeGestionarAsignaciones(role?: Role): boolean {
  return role === "jefe" || role === "administrador";
}

/** Casillero primario: misma receta visual que `SlotCard` en almacenamiento (tono cielo). */
function TarjetaSlotProcesamientoPrimario({
  row,
  onSelect,
  cornerLabel,
  productosCatalogo,
}: {
  row: SolicitudProcesamiento;
  onSelect: (row: SolicitudProcesamiento) => void;
  cornerLabel: number;
  productosCatalogo?: Catalogo[];
}) {
  const cuenta = String(row.clientName ?? row.clientId ?? "").trim() || "—";
  const esEnCurso = normalizeProcesamientoEstado(row.estado) === "En curso";
  const tone = OCCUPIED_MAPA_TONE_PRIMARIO;
  const sk = kgSobranteParaDevolucionMapa(row);
  const cat = primarioCatalogoPorId(productosCatalogo, row.productoPrimarioId);
  const lineaSub = esEnCurso
    ? `${row.numero} · ${cuenta} · ${cantidadPrimarioProcesamientoTexto(row, cat)}`
    : [
        row.numero,
        cuenta,
        `Merma ${formatKgDesperdicio(row.desperdicioKg)}`,
        sk > 0 ? `Sobr. ${formatKgDesperdicio(sk)}` : "",
      ]
        .filter((x) => String(x).trim().length > 0)
        .join(" · ");
  return (
    <button
      type="button"
      onClick={() => onSelect(row)}
      title={`${row.numero} · ${row.productoPrimarioTitulo}`}
      className={`relative flex w-full flex-col text-left ${BODEGA_SLOT_SHELL_CLASS} ${BODEGA_SLOT_ROUNDED} ${BODEGA_SLOT_SHELL_PADDING} transition ${tone.shell}`}
    >
      <span className={`absolute left-2 top-2 z-10 text-xs leading-none ${tone.positionLabel}`}>
        {cornerLabel}
      </span>
      <div className={BODEGA_SLOT_BODY_CLASS}>
        <div className={tone.inner}>
          <div className="flex min-h-0 min-w-0 flex-1 gap-2 overflow-hidden">
            <FiBox
              className={`mt-0.5 h-4 w-4 shrink-0 sm:h-[18px] sm:w-[18px] ${tone.icon}`}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <div
                className={`truncate font-semibold leading-tight text-[clamp(0.65rem,1vw,0.8rem)] ${tone.name}`}
              >
                {row.productoPrimarioTitulo?.trim() || "—"}
              </div>
              <div
                className={`mt-0.5 truncate leading-tight text-[clamp(0.65rem,1.4vw,0.78rem)] ${tone.id}`}
                title={lineaSub}
              >
                {lineaSub}
              </div>
            </div>
          </div>
          <div className="mt-2 flex shrink-0 justify-center">
            <span
              className={`inline-block max-w-full truncate rounded-full px-2 py-0.5 text-[clamp(0.65rem,1.4vw,0.78rem)] font-medium ${procesamientoEstadoBadgeClass(row.estado)}`}
            >
              {row.estado}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

/** Casillero procesado: misma receta visual que `SlotCard` con producto procesado (tono violeta). */
function TarjetaSlotProcesamientoSecundario({
  row,
  onSelect,
  cornerLabel,
}: {
  row: SolicitudProcesamiento;
  onSelect: (row: SolicitudProcesamiento) => void;
  cornerLabel: number;
}) {
  const cuenta = String(row.clientName ?? row.clientId ?? "").trim() || "—";
  const estSec =
    row.estimadoUnidadesSecundario !== undefined &&
    row.estimadoUnidadesSecundario !== null &&
    Number.isFinite(Number(row.estimadoUnidadesSecundario))
      ? `est. ${estimadoUnidadesSecundarioTexto(row.estimadoUnidadesSecundario)}`
      : null;
  const tone = OCCUPIED_MAPA_TONE_PROCESADO;
  const lineaSub = [row.numero, cuenta, estSec].filter((x) => x && String(x).trim().length > 0).join(" · ");
  return (
    <button
      type="button"
      onClick={() => onSelect(row)}
      title={`${row.numero} · ${row.productoSecundarioTitulo}`}
      className={`relative flex w-full flex-col text-left ${BODEGA_SLOT_SHELL_CLASS} ${BODEGA_SLOT_ROUNDED} ${BODEGA_SLOT_SHELL_PADDING} transition ${tone.shell}`}
    >
      <span className={`absolute left-2 top-2 z-10 text-xs leading-none ${tone.positionLabel}`}>
        {cornerLabel}
      </span>
      <div className={BODEGA_SLOT_BODY_CLASS}>
        <div className={tone.inner}>
          <div className="flex min-h-0 min-w-0 flex-1 gap-2 overflow-hidden">
            <FiBox
              className={`mt-0.5 h-4 w-4 shrink-0 sm:h-[18px] sm:w-[18px] ${tone.icon}`}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <div
                className={`truncate font-semibold leading-tight text-[clamp(0.65rem,1vw,0.8rem)] ${tone.name}`}
              >
                {row.productoSecundarioTitulo?.trim() || "—"}
              </div>
              <div
                className={`mt-0.5 truncate leading-tight text-[clamp(0.65rem,1.4vw,0.78rem)] ${tone.id}`}
                title={lineaSub}
              >
                {lineaSub}
              </div>
            </div>
          </div>
          <div className="mt-2 flex shrink-0 justify-center">
            <span
              className={`inline-block max-w-full truncate rounded-full px-2 py-0.5 text-[clamp(0.65rem,1.4vw,0.78rem)] font-medium ${procesamientoEstadoBadgeClass(row.estado)}`}
            >
              {row.estado}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

function TarjetaOrdenProcesamientoSlotInner({
  row,
  onSelect,
  cornerLabel,
}: {
  row: SolicitudProcesamiento;
  onSelect: (row: SolicitudProcesamiento) => void;
  /** Índice 1–4 en la fila de cuatro casilleros; si no, se muestra `row.numero`. */
  cornerLabel?: number;
}) {
  const tone = OCCUPIED_MAPA_TONE_PRIMARIO;
  const sub =
    row.productoSecundarioTitulo?.trim() ||
    row.clientName?.trim() ||
    row.clientId ||
    "—";
  return (
    <button
      type="button"
      onClick={() => onSelect(row)}
      className={`relative flex w-full flex-col text-left ${BODEGA_SLOT_SHELL_CLASS} ${BODEGA_SLOT_ROUNDED} ${BODEGA_SLOT_SHELL_PADDING} transition ${tone.shell}`}
    >
      <span className={`absolute left-2 top-2 z-10 text-xs leading-none ${tone.positionLabel}`}>
        {cornerLabel ?? row.numero}
      </span>
      <div className={BODEGA_SLOT_BODY_CLASS}>
        <div className={tone.inner}>
          <div className="flex min-h-0 min-w-0 flex-1 gap-2 overflow-hidden">
            <FiBox
              className={`mt-0.5 h-4 w-4 shrink-0 sm:h-[18px] sm:w-[18px] ${tone.icon}`}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <div
                className={`truncate font-semibold leading-tight text-[clamp(0.65rem,1vw,0.8rem)] ${tone.name}`}
              >
                {row.productoPrimarioTitulo?.trim() || "—"}
              </div>
              <div
                className={`mt-0.5 truncate leading-tight text-[clamp(0.65rem,1.4vw,0.78rem)] ${tone.id}`}
                title={sub}
              >
                {sub}
              </div>
            </div>
          </div>
          <div className="mt-2 flex shrink-0 justify-center">
            <span
              className={`inline-block max-w-full truncate rounded-full px-2 py-0.5 text-[clamp(0.65rem,1.4vw,0.78rem)] font-medium ${procesamientoEstadoBadgeClass(row.estado)}`}
            >
              {row.estado}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

function TarjetaOrdenProcesamientoCarrusel({
  row,
  anchoMedido,
  onSelect,
}: {
  row: SolicitudProcesamiento;
  anchoMedido: number | null;
  onSelect: (row: SolicitudProcesamiento) => void;
}) {
  /** Misma huella visual que `SlotCard` ocupado: el carrusel reserva ancho y centra la caja (~140px). */
  const anchoCelda =
    anchoMedido !== null ? { width: anchoMedido, minWidth: anchoMedido } : { minWidth: 260 };
  return (
    <div
      className="flex shrink-0 snap-start items-start justify-center py-1"
      style={anchoCelda}
    >
      <TarjetaOrdenProcesamientoSlotInner row={row} onSelect={onSelect} />
    </div>
  );
}

/**
 * Misma huella que `SlotCard` en almacenamiento (`BODEGA_SLOT_*` + `tone.shell` / `tone.inner`).
 * Procesado → violeta; sobrante a primario → cielo.
 */
function CajaPendienteMovimientoBodega({
  p,
  cornerLabel,
  puedeCrearOrdenTraslado,
  onCrearOrden,
  onVerDetalle,
}: {
  p: PendienteMovimientoBodega;
  /** Igual que casilleros: índice o código de orden en la esquina. */
  cornerLabel: string | number;
  puedeCrearOrdenTraslado: boolean;
  onCrearOrden: () => void;
  /** Abre el mismo modal de detalle que el mapa (shell «Orden de procesamiento»). */
  onVerDetalle: () => void;
}) {
  const tone = p.kind === "procesado" ? OCCUPIED_MAPA_TONE_PROCESADO : OCCUPIED_MAPA_TONE_PRIMARIO;
  const row = p.row;
  const cuenta = String(row.clientName ?? row.clientId ?? "").trim() || "—";
  const titulo =
    p.kind === "procesado"
      ? (row.productoSecundarioTitulo ?? "").trim() || "Procesado"
      : (row.productoPrimarioTitulo ?? "").trim() || "Primario";
  const subtitulo =
    p.kind === "procesado"
      ? `${row.numero} · ${cuenta}`
      : `${row.numero} · ${cuenta} · ${formatKgDesperdicio(kgSobranteParaDevolucionMapa(row))}`;

  return (
    <div
      className={`relative flex w-full flex-col text-left ${BODEGA_SLOT_SHELL_CLASS} ${BODEGA_SLOT_ROUNDED} ${BODEGA_SLOT_SHELL_PADDING} transition ${tone.shell}`}
    >
      <button
        type="button"
        onClick={onVerDetalle}
        title={`Ver orden ${row.numero}`}
        className="relative w-full text-left outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50 focus-visible:ring-offset-1 rounded-[inherit]"
        aria-label={`Ver detalle de la orden ${row.numero}`}
      >
        <span
          className={`absolute left-2 top-2 z-10 max-w-[calc(100%-4.5rem)] truncate text-left text-xs leading-none ${tone.positionLabel}`}
        >
          {cornerLabel}
        </span>
        <div className={BODEGA_SLOT_BODY_CLASS}>
          <div className={tone.inner}>
            <div className="flex min-h-0 min-w-0 flex-1 gap-2 overflow-hidden">
              <FiBox className={`mt-0.5 h-4 w-4 shrink-0 sm:h-[18px] sm:w-[18px] ${tone.icon}`} aria-hidden />
              <div className="min-w-0 flex-1">
                <div
                  className={`truncate font-semibold leading-tight text-[clamp(0.65rem,1vw,0.8rem)] ${tone.name}`}
                  title={titulo}
                >
                  {titulo}
                </div>
                <div
                  className={`mt-0.5 truncate leading-tight text-[clamp(0.65rem,1.4vw,0.78rem)] ${tone.id}`}
                  title={subtitulo}
                >
                  {subtitulo}
                </div>
              </div>
            </div>
            <div className="mt-2 flex shrink-0 justify-center">
              <span
                className={`inline-block max-w-full truncate rounded-full px-2 py-0.5 text-[clamp(0.65rem,1.4vw,0.78rem)] font-medium ${tone.pill}`}
              >
                {p.kind === "procesado" ? "A bodega" : "Sobrante"}
              </span>
            </div>
          </div>
        </div>
      </button>
      {puedeCrearOrdenTraslado ? (
        <div className="mt-2 flex shrink-0 justify-center border-t border-slate-200/60 pt-2">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onCrearOrden();
            }}
            className="rounded-lg bg-sky-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-sm transition hover:bg-sky-700 sm:text-xs"
          >
            Crear orden
          </button>
        </div>
      ) : null}
    </div>
  );
}

function buildProcesamientoOrigenDesdePendiente(p: PendienteMovimientoBodega): ProcesamientoOrigenOrden {
  const row = p.row;
  const estimadoUnidadesSecundario =
    typeof row.estimadoUnidadesSecundario === "number" && Number.isFinite(row.estimadoUnidadesSecundario)
      ? row.estimadoUnidadesSecundario
      : row.estimadoUnidadesSecundario === null
        ? null
        : undefined;
  const base: Omit<ProcesamientoOrigenOrden, "rolDevolucion" | "unidadPrimarioVisualizacion" | "sobranteKg"> = {
    cuentaClientId: String(row.clientId ?? "").trim(),
    solicitudId: String(row.id ?? "").trim(),
    numero: row.numero,
    productoPrimarioTitulo: row.productoPrimarioTitulo ?? "",
    productoSecundarioTitulo: row.productoSecundarioTitulo ?? "",
    productoPrimarioId: row.productoPrimarioId,
    cantidadPrimario: row.cantidadPrimario,
    estimadoUnidadesSecundario,
  };
  if (p.kind === "desperdicio") {
    return {
      ...base,
      unidadPrimarioVisualizacion: "peso",
      rolDevolucion: "desperdicio",
      sobranteKg: kgSobranteParaDevolucionMapa(row),
    };
  }
  const uv = row.unidadPrimarioVisualizacion;
  return {
    ...base,
    unidadPrimarioVisualizacion: uv === "peso" || uv === "cantidad" ? uv : undefined,
    rolDevolucion: "procesado",
  };
}

/**
 * Órdenes de procesamiento para la bodega interna actual: **Iniciado** y **En curso** en tabla/carrusel.
 * `layout="slots4"`: **En curso** solo celda primario; **procesado** + desperdicio cuando Procesar cierra la orden.
 * `layout="cards"`: carrusel solo **En curso**. `layout="table"`: tabla compacta.
 */
export function ProcesamientoOrdenesActivasBodega({
  clients,
  warehouseCodeCuenta,
  warehouseId = "",
  slots = [],
  variant = "default",
  layout = "table",
  sessionUid,
  sessionRole,
  operariosBodega = [],
  procesadoresBodega = [],
  tareasProcesamientoOperario = [],
  onPushTareaProcesamientoOperario,
  onProcesamientoTerminadoInventario,
  ordenesBodegaPendientes = [],
  availableBodegaTargets = [],
  onCrearOrdenBodega,
  /** Opcional: para mostrar la unidad del catálogo (lonchas, cajas…) cuando el primario va por cantidad. */
  productosCatalogo,
}: {
  clients: Client[];
  warehouseCodeCuenta: string;
  /** Id de bodega interna (`warehouses`); para descontar kg del primario al pasar a **En curso**. */
  warehouseId?: string;
  slots?: Slot[];
  variant?: "default" | "compact";
  layout?: "table" | "cards" | "slots4";
  sessionUid?: string;
  sessionRole?: Role;
  operariosBodega?: Array<{ id: string; name: string; roleLabel?: string }>;
  /** Reasignación en Firestore y cola local al pasar de «Iniciado» a «En curso» (primer procesador de la bodega). */
  procesadoresBodega?: Array<{ id: string; name: string }>;
  tareasProcesamientoOperario?: Array<Record<string, unknown>>;
  onPushTareaProcesamientoOperario?: (tarea: Record<string, unknown>) => void;
  onProcesamientoTerminadoInventario?: (
    nextSlots: Slot[],
    meta: {
      row: SolicitudProcesamiento;
      deductedKg: number;
      warning?: string;
      /** Si false, no se quita la tarea de la cola (solo se actualiza fase al pasar a En curso). */
      quitarTareaDeCola?: boolean;
    },
  ) => void | Promise<void>;
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
  productosCatalogo?: Catalogo[];
}) {
  const [rows, setRows] = React.useState<SolicitudProcesamiento[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [savingId, setSavingId] = React.useState<string | null>(null);
  const [detalle, setDetalle] = React.useState<SolicitudProcesamiento | null>(null);
  /** Si el detalle se abrió desde una tarea «Procesamiento → Almacenamiento» (traslado pendiente). */
  const [detallePendienteMovimiento, setDetallePendienteMovimiento] =
    React.useState<PendienteMovimientoBodega | null>(null);
  const [modalBusy, setModalBusy] = React.useState(false);
  const [asignadoUid, setAsignadoUid] = React.useState("");

  const cerrarDetalleOrden = React.useCallback(() => {
    setDetalle(null);
    setDetallePendienteMovimiento(null);
  }, []);

  React.useEffect(() => {
    if (operariosBodega.length === 0) {
      setAsignadoUid("");
      return;
    }
    setAsignadoUid((prev) =>
      prev && operariosBodega.some((o) => o.id === prev) ? prev : operariosBodega[0].id,
    );
  }, [operariosBodega]);

  const responsableSeleccionado =
    operariosBodega.find((o) => o.id === asignadoUid) ?? operariosBodega[0] ?? null;

  const clientIds = React.useMemo(() => {
    const code = String(warehouseCodeCuenta ?? "").trim();
    if (!code) return [];
    return clients
      .filter((c) => !c.disabled && String(c.code ?? "").trim() === code)
      .map((c) => c.id.trim())
      .filter(Boolean);
  }, [clients, warehouseCodeCuenta]);

  const codeOk = Boolean(String(warehouseCodeCuenta ?? "").trim());

  React.useEffect(() => {
    setError(null);
    return SolicitudProcesamientoService.subscribeParaBodegaInterna(
      clientIds,
      warehouseCodeCuenta,
      setRows,
      () => setError("No se pudieron cargar las solicitudes de procesamiento."),
    );
  }, [clientIds, warehouseCodeCuenta]);

  const [modalDesperdicioRow, setModalDesperdicioRow] = React.useState<SolicitudProcesamiento | null>(null);
  const [modalDesperdicioKg, setModalDesperdicioKg] = React.useState("0");

  const filasActivas = React.useMemo(() => rows.filter(esActivaEnBodega), [rows]);
  const filasSoloIniciado = React.useMemo(
    () => filasActivas.filter((r) => normalizeProcesamientoEstado(r.estado) === "Iniciado"),
    [filasActivas],
  );
  /** Carrusel principal (vista mapa): solo **En curso** — Iniciado va al modal de tareas pendientes. */
  const filasCarruselPrincipal = React.useMemo(
    () => filasActivas.filter((r) => normalizeProcesamientoEstado(r.estado) === "En curso"),
    [filasActivas],
  );
  /**
   * Vista jefe `slots4`: **En curso** (solo ocupa celda primario) + **Pendiente** (cierre del procesador, falta traslado a mapa)
   * y legado «Terminado» con cierre desde procesador mientras no esté todo ubicado en almacenamiento.
   */
  const filasZonaSlots4 = React.useMemo(() => {
    const enCurso = rows
      .filter((r) => normalizeProcesamientoEstado(r.estado) === "En curso")
      .sort((a, b) => createdAtMsRow(b) - createdAtMsRow(a));
    const esperandoMapa = rows
      .filter((r) => {
        const e = normalizeProcesamientoEstado(r.estado);
        if (e === "Pendiente") return true;
        if (e === "Terminado" && r.cierreDesdeProcesador === true) {
          return !procesamientoUbicacionCompletaEnMapa(slots, r);
        }
        return false;
      })
      .sort((a, b) => createdAtMsRow(b) - createdAtMsRow(a))
      .slice(0, 12);
    return [...enCurso, ...esperandoMapa];
  }, [rows, slots]);
  const slotItemsZona = React.useMemo(
    () => slotItemsDesdeFilasZona(filasZonaSlots4, slots),
    [filasZonaSlots4, slots],
  );
  const procSlotsTotalPages = React.useMemo(() => {
    if (layout === "slots4") {
      return Math.max(1, Math.ceil(slotItemsZona.length / 4));
    }
    return Math.max(1, Math.ceil(filasCarruselPrincipal.length / 4));
  }, [layout, slotItemsZona.length, filasCarruselPrincipal.length]);
  const [procSlotsPage, setProcSlotsPage] = React.useState(0);
  React.useEffect(() => {
    const max = Math.max(0, procSlotsTotalPages - 1);
    if (procSlotsPage > max) setProcSlotsPage(max);
  }, [layout, slotItemsZona.length, filasCarruselPrincipal.length, procSlotsPage, procSlotsTotalPages]);

  const cantidadPendientesIniciado = filasSoloIniciado.length;
  const pendientesMovimientoBodega = React.useMemo(
    () => listPendientesMovimientoBodega(rows, slots, ordenesBodegaPendientes),
    [rows, slots, ordenesBodegaPendientes],
  );
  const cantidadTareasPendientesPanel = cantidadPendientesIniciado + pendientesMovimientoBodega.length;
  const [modalPendientesIniciadoAbierto, setModalPendientesIniciadoAbierto] = React.useState(false);
  const puedeAsignar = puedeGestionarAsignaciones(sessionRole);
  const puedeCrearOrdenTraslado = Boolean(onCrearOrdenBodega && puedeAsignar);
  const [movimientoTrasladoPendiente, setMovimientoTrasladoPendiente] =
    React.useState<PendienteMovimientoBodega | null>(null);
  const [targetCasilleroTraslado, setTargetCasilleroTraslado] = React.useState(1);

  const confirmarOrdenTrasladoDesdePendiente = React.useCallback(() => {
    if (!movimientoTrasladoPendiente || !onCrearOrdenBodega) return;
    const po = buildProcesamientoOrigenDesdePendiente(movimientoTrasladoPendiente);
    if (movimientoTrasladoPendiente.kind === "desperdicio") {
      onCrearOrdenBodega({
        destination: "a_bodega",
        sourceZone: "procesamiento",
        sourcePosition: 0,
        procesamientoOrigen: po,
      });
    } else {
      if (!availableBodegaTargets.includes(targetCasilleroTraslado)) return;
      onCrearOrdenBodega({
        destination: "a_bodega",
        sourceZone: "procesamiento",
        sourcePosition: 0,
        targetPosition: targetCasilleroTraslado,
        procesamientoOrigen: po,
      });
    }
    setMovimientoTrasladoPendiente(null);
  }, [movimientoTrasladoPendiente, onCrearOrdenBodega, availableBodegaTargets, targetCasilleroTraslado]);

  React.useEffect(() => {
    if (!movimientoTrasladoPendiente || movimientoTrasladoPendiente.kind !== "procesado") return;
    const first = availableBodegaTargets[0];
    if (first === undefined) return;
    setTargetCasilleroTraslado((t) => (availableBodegaTargets.includes(t) ? t : first));
  }, [movimientoTrasladoPendiente, availableBodegaTargets]);

  React.useEffect(() => {
    if (!movimientoTrasladoPendiente) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setMovimientoTrasladoPendiente(null);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [movimientoTrasladoPendiente]);

  const trasladoPuedeConfirmar = React.useMemo(() => {
    if (!movimientoTrasladoPendiente) return false;
    if (movimientoTrasladoPendiente.kind === "desperdicio") {
      return Boolean(findSlotPrimarioParaDevolverDesperdicio(slots, movimientoTrasladoPendiente.row));
    }
    return availableBodegaTargets.length > 0 && availableBodegaTargets.includes(targetCasilleroTraslado);
  }, [movimientoTrasladoPendiente, slots, availableBodegaTargets, targetCasilleroTraslado]);

  /** Ancho de cada tarjeta en vista carrusel (máx. 3 visibles a la vez). */
  const [anchoTarjetaCarrusel, setAnchoTarjetaCarrusel] = React.useState<number | null>(null);
  const refCarruselProcesamiento = React.useRef<HTMLDivElement>(null);

  React.useLayoutEffect(() => {
    if (layout !== "cards") return;
    const el = refCarruselProcesamiento.current;
    if (!el) return;
    const gapPx = 12;
    const medir = () => {
      const w = el.clientWidth;
      if (w <= 0) return;
      setAnchoTarjetaCarrusel(Math.max(200, Math.floor((w - 2 * gapPx) / 3)));
    };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, [layout, warehouseCodeCuenta, filasCarruselPrincipal.length, codeOk, clientIds.length]);

  React.useEffect(() => {
    if (!modalPendientesIniciadoAbierto && !detalle) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (detalle) {
        cerrarDetalleOrden();
        return;
      }
      if (modalPendientesIniciadoAbierto) setModalPendientesIniciadoAbierto(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modalPendientesIniciadoAbierto, detalle, cerrarDetalleOrden]);

  React.useEffect(() => {
    if (!detalle) setDetallePendienteMovimiento(null);
  }, [detalle]);

  React.useEffect(() => {
    setDetalle((d) => {
      if (!d) return d;
      const found = rows.find((r) => r.clientId === d.clientId && r.id === d.id);
      if (!found) return null;
      return found === d ? d : found;
    });
  }, [rows]);

  const handleEstado = async (row: SolicitudProcesamiento, next: string, desperdicioKgArg?: number) => {
    const nextNorm = normalizeProcesamientoEstado(next);
    if (nextNorm === row.estado) return;
    const prevNorm = normalizeProcesamientoEstado(row.estado);
    if (nextNorm === "Pendiente" && prevNorm === "En curso" && desperdicioKgArg === undefined) {
      setModalDesperdicioRow(row);
      setModalDesperdicioKg(stringKgInicialDesperdicio(desperdicioKgSugeridoDesdeMerma(row)));
      return;
    }
    const key = `${row.clientId}::${row.id}`;
    setError(null);
    setSavingId(key);
    const prev = row.estado;
    setRows((list) =>
      list.map((r) =>
        r.clientId === row.clientId && r.id === row.id
          ? {
              ...r,
              estado: nextNorm,
              ...(nextNorm === "Pendiente" && prevNorm === "En curso"
                ? { desperdicioKg: Number(desperdicioKgArg), cierreDesdeProcesador: false }
                : {}),
            }
          : r,
      ),
    );
    setDetalle((d) =>
      d && d.clientId === row.clientId && d.id === row.id
        ? {
            ...d,
            estado: nextNorm,
            ...(nextNorm === "Pendiente" && prevNorm === "En curso"
              ? { desperdicioKg: Number(desperdicioKgArg), cierreDesdeProcesador: false }
              : {}),
          }
        : d,
    );
    try {
      await SolicitudProcesamientoService.actualizarEstado(
        row.clientId,
        row.id,
        nextNorm,
        nextNorm === "Pendiente" && prevNorm === "En curso"
          ? { desperdicioKg: Number(desperdicioKgArg), cierreDesdeProcesador: false }
          : undefined,
      );
      if (nextNorm === "En curso" && prevNorm === "Iniciado") {
        const proc = procesadoresBodega[0];
        if (proc) {
          await SolicitudProcesamientoService.asignarOperarioBodega(row.clientId, row.id, {
            operarioUid: proc.id,
            operarioNombre: proc.name,
          });
          setRows((list) =>
            list.map((r) =>
              r.clientId === row.clientId && r.id === row.id
                ? { ...r, operarioBodegaUid: proc.id, operarioBodegaNombre: proc.name }
                : r,
            ),
          );
          setDetalle((d) =>
            d && d.clientId === row.clientId && d.id === row.id
              ? { ...d, operarioBodegaUid: proc.id, operarioBodegaNombre: proc.name }
              : d,
          );
          onPushTareaProcesamientoOperario?.({
            tipo: "procesamiento",
            clientId: row.clientId,
            solicitudId: row.id,
            numero: row.numero,
            clientName: row.clientName,
            codeCuenta: row.codeCuenta,
            warehouseId: row.warehouseId,
            productoPrimarioId: row.productoPrimarioId,
            productoPrimarioTitulo: row.productoPrimarioTitulo,
            productoSecundarioId: row.productoSecundarioId,
            productoSecundarioTitulo: row.productoSecundarioTitulo,
            cantidadPrimario: row.cantidadPrimario,
            unidadPrimarioVisualizacion: row.unidadPrimarioVisualizacion,
            estimadoUnidadesSecundario: row.estimadoUnidadesSecundario,
            reglaConversionCantidadPrimario: row.reglaConversionCantidadPrimario,
            reglaConversionUnidadesSecundario: row.reglaConversionUnidadesSecundario,
            perdidaProcesamientoPct: row.perdidaProcesamientoPct,
            operarioUid: proc.id,
            operarioNombre: proc.name,
            faseCola: "en_curso",
          });
        }
      }
      if (
        nextNorm === "En curso" &&
        prevNorm === "Iniciado" &&
        warehouseId.trim() &&
        onProcesamientoTerminadoInventario
      ) {
        const r = deductSlotsAfterProcesamientoTerminado(slots, row, warehouseId);
        await onProcesamientoTerminadoInventario(r.slots, {
          row,
          deductedKg: r.deductedKg,
          warning: r.warning,
          quitarTareaDeCola: false,
        });
        try {
          await SolicitudProcesamientoService.registrarKgPrimarioDescontado(row.clientId, row.id, {
            deductedKg: r.deductedKg,
            cantidadPrimario: row.cantidadPrimario,
            unidadPrimarioVisualizacion: row.unidadPrimarioVisualizacion,
            estimadoUnidadesSecundario: row.estimadoUnidadesSecundario,
            reglaConversionCantidadPrimario: row.reglaConversionCantidadPrimario,
            reglaConversionUnidadesSecundario: row.reglaConversionUnidadesSecundario,
          });
        } catch (regErr) {
          console.error("[ProcesamientoOrdenesActivasBodega] registrarKgPrimarioDescontado:", regErr);
        }
      }
      if (nextNorm === "Pendiente" && prevNorm === "En curso" && onProcesamientoTerminadoInventario) {
        await onProcesamientoTerminadoInventario(slots, {
          row: {
            ...row,
            estado: nextNorm,
            desperdicioKg: Number(desperdicioKgArg),
            cierreDesdeProcesador: false,
          },
          deductedKg: 0,
          quitarTareaDeCola: true,
        });
        const mk = Number(desperdicioKgArg);
        if (Number.isFinite(mk) && mk > 0) {
          void recordMermaProcesamientoKg(String(warehouseId ?? "").trim(), mk);
        }
      }
    } catch (e) {
      setRows((list) =>
        list.map((r) => (r.clientId === row.clientId && r.id === row.id ? { ...r, estado: prev } : r)),
      );
      setDetalle((d) => (d && d.clientId === row.clientId && d.id === row.id ? { ...d, estado: prev } : d));
      const code = e instanceof Error ? e.message : "";
      if (code === "solo_operario_asignado") {
        setError("Solo el responsable asignado (operario o procesador) puede pasar la orden a «En curso».");
      } else if (code === "sin_operario_asignado") {
        setError("Asigná un responsable en bodega antes de pasar a «En curso».");
      } else if (code === "desperdicio_requerido") {
        setError("Indicá la merma en kg (puede ser 0) al pasar a «Pendiente».");
      } else if (code === "en_curso_a_terminado_invalido") {
        setError("Desde «En curso» usá «Pendiente» (declarando merma). «Terminado» se asigna solo al ubicar en almacenamiento.");
      } else {
        setError("No se pudo actualizar el estado.");
      }
    } finally {
      setSavingId(null);
    }
  };

  const asignarOperario = async () => {
    if (!detalle || !responsableSeleccionado || !onPushTareaProcesamientoOperario) return;
    setModalBusy(true);
    setError(null);
    try {
      await SolicitudProcesamientoService.asignarOperarioBodega(detalle.clientId, detalle.id, {
        operarioUid: responsableSeleccionado.id,
        operarioNombre: responsableSeleccionado.name,
      });
      setRows((list) =>
        list.map((r) =>
          r.clientId === detalle.clientId && r.id === detalle.id
            ? {
                ...r,
                operarioBodegaUid: responsableSeleccionado.id,
                operarioBodegaNombre: responsableSeleccionado.name,
              }
            : r,
        ),
      );
      setDetalle((d) =>
        d && d.clientId === detalle.clientId && d.id === detalle.id
          ? {
              ...d,
              operarioBodegaUid: responsableSeleccionado.id,
              operarioBodegaNombre: responsableSeleccionado.name,
            }
          : d,
      );
      onPushTareaProcesamientoOperario({
        tipo: "procesamiento",
        clientId: detalle.clientId,
        solicitudId: detalle.id,
        numero: detalle.numero,
        clientName: detalle.clientName,
        codeCuenta: detalle.codeCuenta,
        warehouseId: detalle.warehouseId,
        productoPrimarioId: detalle.productoPrimarioId,
        productoPrimarioTitulo: detalle.productoPrimarioTitulo,
        productoSecundarioId: detalle.productoSecundarioId,
        productoSecundarioTitulo: detalle.productoSecundarioTitulo,
        cantidadPrimario: detalle.cantidadPrimario,
        unidadPrimarioVisualizacion: detalle.unidadPrimarioVisualizacion,
        estimadoUnidadesSecundario: detalle.estimadoUnidadesSecundario,
        reglaConversionCantidadPrimario: detalle.reglaConversionCantidadPrimario,
        reglaConversionUnidadesSecundario: detalle.reglaConversionUnidadesSecundario,
        perdidaProcesamientoPct: detalle.perdidaProcesamientoPct,
        operarioUid: responsableSeleccionado.id,
        operarioNombre: responsableSeleccionado.name,
        faseCola: "asignado",
      });
    } catch {
      setError("No se pudo asignar el operario.");
    } finally {
      setModalBusy(false);
    }
  };

  const pad =
    variant === "compact" && layout === "table"
      ? "p-0"
      : layout === "cards" || layout === "slots4"
        ? "p-0"
        : "p-1";

  const alerts = (
    <>
      {!codeOk ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Esta bodega no tiene <strong>codeCuenta</strong> asignado: no se puede cruzar con las cuentas. Configurá la
          bodega en el panel del configurador.
        </p>
      ) : clientIds.length === 0 ? (
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
          No hay clientes activos con código <span className="font-mono font-semibold">{warehouseCodeCuenta}</span>.
        </p>
      ) : error ? (
        <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}
    </>
  );

  const estadoSelect = (row: SolicitudProcesamiento, key: string, className: string) => (
    <div className={`relative inline-flex w-full max-w-full align-middle ${className}`}>
      <select
        aria-label={`Estado ${row.numero}`}
        value={row.estado}
        disabled={savingId === key}
        onChange={(e) => {
          const v = e.target.value;
          if (
            normalizeProcesamientoEstado(v) === "Pendiente" &&
            normalizeProcesamientoEstado(row.estado) === "En curso"
          ) {
            setModalDesperdicioRow(row);
            setModalDesperdicioKg(stringKgInicialDesperdicio(desperdicioKgSugeridoDesdeMerma(row)));
            return;
          }
          void handleEstado(row, v);
        }}
        className={`w-full cursor-pointer truncate rounded-lg border border-slate-200/80 bg-white py-1.5 pl-2 pr-7 text-left text-[11px] font-semibold shadow-sm outline-none ring-0 focus-visible:ring-2 focus-visible:ring-sky-400/50 [appearance:none] disabled:opacity-60 ${procesamientoEstadoBadgeClass(row.estado)}`}
      >
        {opcionesEstadoParaSesion(row, sessionUid).map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      <span
        className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-500 opacity-70"
        aria-hidden
      >
        <HiOutlineChevronDown className="h-3.5 w-3.5" strokeWidth={2.25} />
      </span>
    </div>
  );

  const btnAsignarOperarioClass =
    "w-full rounded-lg bg-sky-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50 disabled:opacity-50";

  const esDetalleTrasladoAlmacen = detalle !== null && detallePendienteMovimiento !== null;
  const tituloDetalleOrden = esDetalleTrasladoAlmacen ? "Traslado a almacenamiento" : "Orden de procesamiento";
  const tituloIdDetalleOrden = esDetalleTrasladoAlmacen
    ? "proc-bodega-detalle-traslado-titulo"
    : "proc-bodega-detalle-titulo";
  const detalleEstadoNorm = detalle ? normalizeProcesamientoEstado(detalle.estado) : "";
  const mostrarBloqueAsignarOperario =
    Boolean(detalle) && puedeAsignar && detalleEstadoNorm === "Iniciado" && !esDetalleTrasladoAlmacen;
  const mostrarCrearOrdenTrasladoDesdeDetalle =
    esDetalleTrasladoAlmacen && Boolean(detallePendienteMovimiento) && puedeCrearOrdenTraslado && onCrearOrdenBodega;
  const mostrarAvisoTrasladoSinPermiso =
    esDetalleTrasladoAlmacen && Boolean(onCrearOrdenBodega) && !puedeCrearOrdenTraslado;

  const detalleModal =
    detalle && (layout === "cards" || layout === "slots4") ? (
      <BodegaDetalleModalShell
        open
        onClose={cerrarDetalleOrden}
        titulo={tituloDetalleOrden}
        tituloId={tituloIdDetalleOrden}
        zIndexClass="z-[110]"
        headerIcon={
          esDetalleTrasladoAlmacen ? (
            <HiArrowsRightLeft className="h-7 w-7 text-violet-600" strokeWidth={2} aria-hidden />
          ) : (
            <FiCpu className="h-7 w-7 text-blue-600" strokeWidth={2} aria-hidden />
          )
        }
        footer={
          <div className="space-y-3">
            {mostrarBloqueAsignarOperario ? (
              <div className="space-y-2">
                {(() => {
                  const yaFs = Boolean(String(detalle.operarioBodegaUid ?? "").trim());
                  const yaCola = tareasProcesamientoOperario.some(
                    (t) =>
                      String(t.clientId ?? "") === detalle.clientId && String(t.solicitudId ?? "") === detalle.id,
                  );
                  const asignado = yaFs || yaCola;
                  const puedePulsar =
                    Boolean(responsableSeleccionado) &&
                    !asignado &&
                    !modalBusy &&
                    Boolean(onPushTareaProcesamientoOperario);
                  const variosOperarios = operariosBodega.length > 1;

                  return (
                    <>
                      {operariosBodega.length === 0 ? (
                        <p className="rounded-md border border-amber-100 bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-900">
                          Sin operarios configurados.
                        </p>
                      ) : null}

                      {variosOperarios ? (
                        <select
                          id="proc-asignar-a"
                          aria-label="Operario"
                          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-400/50"
                          value={asignadoUid}
                          onChange={(e) => setAsignadoUid(e.target.value)}
                          disabled={asignado || modalBusy}
                        >
                          {operariosBodega.map((o) => (
                            <option key={o.id} value={o.id}>
                              {(o.name || "Sin nombre").trim()}
                              {o.roleLabel ? ` · ${o.roleLabel}` : ""}
                            </option>
                          ))}
                        </select>
                      ) : null}

                      {operariosBodega.length > 0 ? (
                        <button
                          type="button"
                          title={
                            asignado
                              ? "Ya pasó a la cola del operario o figura responsable en la orden"
                              : !responsableSeleccionado
                                ? "Sin responsable en el sistema"
                                : "Pasar a la cola del operario (retiro desde almacenamiento)"
                          }
                          disabled={!puedePulsar}
                          onClick={() => void asignarOperario()}
                          className={btnAsignarOperarioClass}
                        >
                          {asignado ? "En cola / asignado" : "Asignar a operario"}
                        </button>
                      ) : null}
                    </>
                  );
                })()}
              </div>
            ) : null}
            {mostrarCrearOrdenTrasladoDesdeDetalle && detallePendienteMovimiento ? (
              <div className="space-y-2">
                <p className="text-left text-xs leading-relaxed text-slate-600">
                  Generá la orden para que el operario ubique{" "}
                  {detallePendienteMovimiento.kind === "procesado"
                    ? "el producto procesado"
                    : "el sobrante de primario"}{" "}
                  en el mapa de almacenamiento.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const p = detallePendienteMovimiento;
                    setMovimientoTrasladoPendiente(p);
                    if (p.kind === "procesado") {
                      const first = availableBodegaTargets[0];
                      if (first !== undefined) setTargetCasilleroTraslado(first);
                    }
                    cerrarDetalleOrden();
                  }}
                  className="w-full rounded-lg bg-violet-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50"
                >
                  Crear orden de traslado
                </button>
              </div>
            ) : null}
            {mostrarAvisoTrasladoSinPermiso ? (
              <p className="text-left text-[11px] leading-relaxed text-slate-500">
                Solo jefe o administrador pueden crear la orden de traslado; el operario la ejecuta desde el mapa.
              </p>
            ) : null}
            <button
              type="button"
              onClick={cerrarDetalleOrden}
              className={`w-full py-2 text-sm font-medium text-slate-500 transition hover:text-slate-800 ${
                mostrarBloqueAsignarOperario || mostrarCrearOrdenTrasladoDesdeDetalle || mostrarAvisoTrasladoSinPermiso
                  ? "mt-1"
                  : ""
              }`}
            >
              Cerrar
            </button>
          </div>
        }
      >
        {esDetalleTrasladoAlmacen ? (
          <p className="mb-4 rounded-xl border border-violet-200 bg-violet-50/90 px-3 py-2.5 text-left text-xs leading-relaxed text-violet-950">
            <strong className="font-semibold">Pendiente en planta.</strong> La orden ya no está en{" "}
            <strong>Iniciado</strong>: el botón «Asignar a operario» solo aplica cuando el material sigue en bodega y
            hay que mandarlo a la cola del operario. Acá lo que falta es el <strong>traslado al almacenamiento</strong>{" "}
            (mapa).
          </p>
        ) : null}
        <dl className="space-y-3 text-sm">
          <BodegaDetalleModalFila label="Número" value={<span className="font-mono font-semibold">{detalle.numero}</span>} />
          <BodegaDetalleModalFila
            label="Estado"
            value={
              <span className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold ${procesamientoEstadoBadgeClass(detalle.estado)}`}>
                {detalle.estado}
              </span>
            }
          />
          <BodegaDetalleModalFila
            label="Cliente"
            value={detalle.clientName?.trim() || detalle.clientId || "—"}
          />
          <BodegaDetalleModalFila
            label="Producto primario"
            value={(detalle.productoPrimarioTitulo || "—").trim() || "—"}
          />
          <BodegaDetalleModalFila
            label="Cantidad primario"
            value={cantidadPrimarioProcesamientoTexto(
              detalle,
              primarioCatalogoPorId(productosCatalogo, detalle.productoPrimarioId),
            )}
          />
          <BodegaDetalleModalFila
            label="Producto secundario"
            value={(detalle.productoSecundarioTitulo || "—").trim() || "—"}
          />
          {detalle.estimadoUnidadesSecundario !== undefined &&
          detalle.estimadoUnidadesSecundario !== null &&
          Number.isFinite(Number(detalle.estimadoUnidadesSecundario)) ? (
            <>
              <BodegaDetalleModalFila
                label="Unidades secundario (estimado)"
                value={estimadoUnidadesSecundarioTexto(Number(detalle.estimadoUnidadesSecundario))}
              />
              {(() => {
                const udsMapa = unidadesSecundarioEnterasParaMapa(Number(detalle.estimadoUnidadesSecundario));
                if (udsMapa <= 0) return null;
                return (
                  <BodegaDetalleModalFila
                    label="Unidades en mapa (enteras)"
                    value={`${udsMapa} u.`}
                  />
                );
              })()}
            </>
          ) : null}
          {normalizeProcesamientoEstado(detalle.estado) === "Pendiente" ||
          normalizeProcesamientoEstado(detalle.estado) === "Terminado" ? (
            <BodegaDetalleModalFila label="Merma" value={formatKgDesperdicio(detalle.desperdicioKg)} />
          ) : null}
          {(normalizeProcesamientoEstado(detalle.estado) === "Pendiente" ||
            normalizeProcesamientoEstado(detalle.estado) === "Terminado") &&
          kgSobranteParaDevolucionMapa(detalle) > 0 ? (
            <BodegaDetalleModalFila
              label="Sobrante"
              value={formatKgDesperdicio(kgSobranteParaDevolucionMapa(detalle))}
            />
          ) : null}
          {Boolean(String(detalle.operarioBodegaNombre ?? "").trim() || String(detalle.operarioBodegaUid ?? "").trim()) ? (
            <BodegaDetalleModalFila
              label="Responsable"
              value={detalle.operarioBodegaNombre?.trim() || detalle.operarioBodegaUid || "—"}
            />
          ) : null}
        </dl>
      </BodegaDetalleModalShell>
    ) : null;

  const modalPendientesIniciado =
    (layout === "cards" || layout === "slots4") && modalPendientesIniciadoAbierto ? (
      <div
        className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 p-3 sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-pendientes-iniciado-titulo"
      >
        <button
          type="button"
          className="absolute inset-0 cursor-default"
          aria-label="Cerrar"
          onClick={() => setModalPendientesIniciadoAbierto(false)}
        />
        <div className="relative z-10 flex max-h-[min(92vh,780px)] w-full max-w-5xl flex-col rounded-3xl border border-sky-200/90 bg-white shadow-2xl shadow-sky-900/10 overflow-hidden">
          <div className="shrink-0 border-b border-sky-100 bg-gradient-to-r from-sky-50 via-white to-cyan-50/80 px-5 py-4 sm:px-6 sm:py-5">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700 shadow-inner">
                <MdPendingActions className="h-6 w-6" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <h2
                  id="modal-pendientes-iniciado-titulo"
                  className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl"
                >
                  Tareas pendientes
                </h2>
                <p className="mt-0.5 text-sm text-slate-600">
                  <span className="font-semibold text-sky-800">Almacenamiento → Procesamiento</span>
                  {cantidadPendientesIniciado > 0 ? (
                    <span className="tabular-nums">
                      {" "}
                      · {cantidadPendientesIniciado} orden{cantidadPendientesIniciado === 1 ? "" : "es"}
                    </span>
                  ) : (
                    " · ninguna"
                  )}
                  <span className="mx-1.5 text-slate-300" aria-hidden>
                    |
                  </span>
                  <span className="font-semibold text-sky-800">Procesamiento → Almacenamiento</span>
                  {pendientesMovimientoBodega.length > 0 ? (
                    <span className="tabular-nums">
                      {" "}
                      · {pendientesMovimientoBodega.length} tarea
                      {pendientesMovimientoBodega.length === 1 ? "" : "s"}
                    </span>
                  ) : (
                    " · ninguna"
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalPendientesIniciadoAbierto(false)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                aria-label="Cerrar"
              >
                <HiOutlineXMark className="h-6 w-6" strokeWidth={2} />
              </button>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto bg-white px-4 py-4 sm:px-6 sm:py-5">
            {filasSoloIniciado.length === 0 && pendientesMovimientoBodega.length === 0 ? (
              <div className="flex min-h-[200px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-12 text-center text-sm text-slate-500">
                No hay tareas pendientes en este momento.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-10">
                <section className="min-w-0" aria-labelledby="pendientes-col-almacen-a-proc">
                  <h3
                    id="pendientes-col-almacen-a-proc"
                    className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    Almacenamiento → Procesamiento
                  </h3>
                  
                  {filasSoloIniciado.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-3 py-8 text-center text-xs text-slate-500">
                      Ninguna orden en <strong className="text-slate-700">Iniciado</strong>.
                    </div>
                  ) : (
                    <div
                      className="grid grid-cols-1 gap-3 sm:grid-cols-2"
                      role="list"
                      aria-label="Órdenes de almacenamiento hacia procesamiento"
                    >
                      {filasSoloIniciado.map((row) => (
                        <div key={`${row.clientId}::${row.id}`} role="listitem" className="w-full min-w-0">
                          <TarjetaOrdenProcesamientoSlotInner
                            row={row}
                            onSelect={(r) => {
                              setError(null);
                              setDetallePendienteMovimiento(null);
                              setModalPendientesIniciadoAbierto(false);
                              setDetalle(r);
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section
                  className="min-w-0 border-t border-slate-100 pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0"
                  aria-labelledby="pendientes-col-proc-a-almacen"
                >
                  <h3
                    id="pendientes-col-proc-a-almacen"
                    className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    Procesamiento → Almacenamiento
                  </h3>
                  
                  {pendientesMovimientoBodega.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-3 py-8 text-center text-xs text-slate-500">
                      Ningún movimiento pendiente hacia almacenamiento.
                    </div>
                  ) : (
                    <div
                      className="grid grid-cols-1 gap-3 sm:grid-cols-2"
                      role="list"
                      aria-label="Traslados de procesamiento hacia almacenamiento"
                    >
                      {pendientesMovimientoBodega.map((p) => (
                        <div key={`${p.row.clientId}::${p.row.id}::${p.kind}`} role="listitem" className="w-full min-w-0">
                          <CajaPendienteMovimientoBodega
                            p={p}
                            cornerLabel={p.row.numero}
                            puedeCrearOrdenTraslado={puedeCrearOrdenTraslado}
                            onVerDetalle={() => {
                              setError(null);
                              setDetallePendienteMovimiento(p);
                              setDetalle(p.row);
                            }}
                            onCrearOrden={() => {
                              setMovimientoTrasladoPendiente(p);
                              if (p.kind === "procesado") {
                                const first = availableBodegaTargets[0];
                                if (first !== undefined) setTargetCasilleroTraslado(first);
                              }
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  {pendientesMovimientoBodega.length > 0 && !puedeCrearOrdenTraslado ? (
                    <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
                      {onCrearOrdenBodega
                        ? "Solo jefe o administrador ven «Crear orden»; el operario ejecuta la orden en el mapa."
                        : "En esta vista no está conectada la creación de órdenes de traslado (falta el enlace al flujo del jefe)."}
                    </p>
                  ) : null}
                </section>
              </div>
            )}
          </div>
        </div>
      </div>
    ) : null;

  const modalTrasladoMovimientoBodega =
    movimientoTrasladoPendiente && (layout === "cards" || layout === "slots4") ? (
      <div
        className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/55 p-3 sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="proc-modal-traslado-pend-titulo"
      >
        <button
          type="button"
          className="absolute inset-0 cursor-default"
          aria-label="Cerrar"
          onClick={() => setMovimientoTrasladoPendiente(null)}
        />
        <div
          className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-sky-200/90 bg-white shadow-2xl shadow-sky-900/15 sm:max-w-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="border-b border-sky-100 bg-gradient-to-r from-sky-50 via-white to-cyan-50/80 px-5 py-4 sm:px-6">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700 shadow-inner">
                <HiArrowsRightLeft className="h-6 w-6" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <h2 id="proc-modal-traslado-pend-titulo" className="text-lg font-bold tracking-tight text-slate-900">
                  Traslado a bodega
                </h2>
                <p className="mt-0.5 text-sm text-slate-600">
                  Orden desde <strong className="text-slate-800">procesamiento</strong> hacia almacenamiento para que el
                  operario la ejecute.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMovimientoTrasladoPendiente(null)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                aria-label="Cerrar"
              >
                <HiOutlineXMark className="h-6 w-6" strokeWidth={2} />
              </button>
            </div>
          </div>
          <div className="space-y-4 px-5 py-4 sm:px-6 sm:py-5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Destino de la orden</p>
              <input
                readOnly
                value="Bodega (mapa interno)"
                className="mt-1 w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800"
                tabIndex={-1}
                aria-label="Destino de la orden"
              />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Origen</p>
              <input
                readOnly
                value="Procesamiento (orden pendiente de ubicar en mapa)"
                className="mt-1 w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800"
                tabIndex={-1}
              />
            </div>
            {(() => {
              const row = movimientoTrasladoPendiente.row;
              const sk = kgSobranteParaDevolucionMapa(row);
              const catRow = primarioCatalogoPorId(productosCatalogo, row.productoPrimarioId);
              const insumo = cantidadPrimarioProcesamientoTexto(row, catRow);
              const est = estimadoUnidadesSecundarioTexto(row.estimadoUnidadesSecundario);
              const sec = (row.productoSecundarioTitulo ?? "").trim() || "—";
              if (movimientoTrasladoPendiente.kind === "desperdicio") {
                const slotP = findSlotPrimarioParaDevolverDesperdicio(slots, row);
                return (
                  <>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                        Sobrante (reintegración)
                      </p>
                      <input
                        readOnly
                        value={`Sobrante · ${row.numero} — ${formatKgDesperdicio(sk)} · primario en mapa`}
                        className="mt-1 w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-sm text-slate-800"
                        tabIndex={-1}
                      />
                    </div>
                    {slotP ? (
                      <p className="rounded-lg border border-sky-100 bg-sky-50/80 px-3 py-2 text-xs text-sky-900">
                        Se sumará al casillero del producto primario ya ubicado (p. ej. casillero{" "}
                        <strong>{slotP.position}</strong>).
                      </p>
                    ) : (
                      <p className="rounded-lg border border-amber-200 bg-amber-50/90 px-3 py-2 text-xs text-amber-950">
                        No hay un casillero primario compatible para devolver el sobrante; revisá el mapa antes de
                        crear la orden.
                      </p>
                    )}
                  </>
                );
              }
              return (
                <>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      Orden terminada (procesamiento)
                    </p>
                    <input
                      readOnly
                      value={`Procesado · ${row.numero} — ${insumo} — est. ${est} — ${sec}`}
                      className="mt-1 w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-[13px] text-slate-800"
                      tabIndex={-1}
                    />
                  </div>
                  <p className="rounded-lg border border-sky-100 bg-sky-50/80 px-3 py-2 text-xs text-sky-900">
                    Producto procesado (secundario): elegí un casillero libre; es el destino del resultado del
                    procesamiento.
                  </p>
                  <div>
                    <label
                      htmlFor="proc-traslado-casillero-select"
                      className="text-[10px] font-bold uppercase tracking-wide text-slate-500"
                    >
                      Nueva posición
                    </label>
                    {availableBodegaTargets.length === 0 ? (
                      <p className="mt-2 text-sm text-amber-800">
                        No hay casilleros libres en el mapa. Liberá uno antes de crear la orden.
                      </p>
                    ) : (
                      <select
                        id="proc-traslado-casillero-select"
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
                        value={targetCasilleroTraslado}
                        onChange={(e) => setTargetCasilleroTraslado(Number(e.target.value))}
                      >
                        {availableBodegaTargets.map((pos) => (
                          <option key={pos} value={pos}>
                            Casillero {pos}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
          <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50/80 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
            <button
              type="button"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
              onClick={() => setMovimientoTrasladoPendiente(null)}
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={!trasladoPuedeConfirmar}
              onClick={confirmarOrdenTrasladoDesdePendiente}
              className="rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-45"
            >
              Crear orden
            </button>
          </div>
        </div>
      </div>
    ) : null;

  const modalDesperdicio = modalDesperdicioRow ? (
    <div
      className="fixed inset-0 z-[76] flex items-center justify-center bg-slate-900/50 p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="proc-modal-desperdicio-titulo"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Cerrar"
        onClick={() => setModalDesperdicioRow(null)}
      />
      <div
        className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="proc-modal-desperdicio-titulo" className="text-lg font-bold text-slate-900">
          Merma (kg)
        </h3>
        <p className="mt-1 text-sm text-slate-600">
          Orden <span className="font-mono font-semibold">{modalDesperdicioRow.numero}</span>. La{" "}
          <strong>merma en kg</strong> es lo que <strong>no vuelve al mapa</strong> y queda en el reporte de la bodega.
          Es distinta del <strong>% de pérdida</strong> del catálogo (eso ya bajó el estimado de unidades al crear la
          orden). La sugerencia en kg usa ese % solo como referencia; ajustá si el peso real fue otro. El{" "}
          <strong>sobrante</strong> de primario (decimales del peso descontado y la fracción de unidades de secundario
          que no forman cajas enteras) se calcula al pasar a «En curso» y se devuelve con traslado aparte.
        </p>
        {(() => {
          const sug = desperdicioKgSugeridoDesdeMerma(modalDesperdicioRow);
          const pct = modalDesperdicioRow.perdidaProcesamientoPct;
          if (sug !== null && pct !== undefined && Number(pct) > 0) {
            return (
              <p className="mt-2 text-xs text-slate-500">
                kg primario × {Number(pct).toLocaleString("es-CO", { maximumFractionDigits: 2 })}% pérdida (catálogo)
                →{" "}
                <span className="font-mono font-semibold text-slate-700">{sug}</span> kg.
              </p>
            );
          }
          if (modalDesperdicioRow.unidadPrimarioVisualizacion === "cantidad") {
            return (
              <p className="mt-2 text-xs text-amber-900/85">
                Primario en <strong>unidades</strong>: ingresá la merma en kg a mano (no hay kg en la orden para
                calcular).
              </p>
            );
          }
          return null;
        })()}
        <label className="mt-4 block text-xs font-semibold text-slate-700" htmlFor="proc-desperdicio-kg-input">
          Kilogramos de merma
        </label>
        <input
          id="proc-desperdicio-kg-input"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
          value={modalDesperdicioKg}
          onChange={(e) => setModalDesperdicioKg(e.target.value)}
        />
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
            onClick={() => setModalDesperdicioRow(null)}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"
            onClick={() => {
              const raw = String(modalDesperdicioKg).replace(",", ".").trim();
              const kg = Number(raw);
              if (!Number.isFinite(kg) || kg < 0) {
                window.alert("Ingresá un número de kg mayor o igual a 0.");
                return;
              }
              const r = modalDesperdicioRow;
              setModalDesperdicioRow(null);
              void handleEstado(r, "Pendiente", kg);
            }}
          >
            Confirmar pendiente
          </button>
        </div>
      </div>
    </div>
  ) : null;

  if (layout === "slots4") {
    const pageItems = slotItemsZona.slice(procSlotsPage * 4, procSlotsPage * 4 + 4);
    const procCells: React.ReactNode[] = [];
    const onSel = (r: SolicitudProcesamiento) => {
      setError(null);
      setDetallePendienteMovimiento(null);
      setDetalle(r);
    };
    pageItems.forEach((item, idx) => {
      const cornerLabel = idx + 1;
      if (item.kind === "primario") {
        procCells.push(
          <div
            key={`${item.row.clientId}::${item.row.id}::p-${procSlotsPage}-${idx}`}
            className="min-w-0 flex justify-center"
          >
            <TarjetaSlotProcesamientoPrimario
              row={item.row}
              cornerLabel={cornerLabel}
              onSelect={onSel}
              productosCatalogo={productosCatalogo}
            />
          </div>,
        );
      } else {
        procCells.push(
          <div
            key={`${item.row.clientId}::${item.row.id}::s-${procSlotsPage}-${idx}`}
            className="min-w-0 flex justify-center"
          >
            <TarjetaSlotProcesamientoSecundario row={item.row} cornerLabel={cornerLabel} onSelect={onSel} />
          </div>,
        );
      }
    });
    while (procCells.length < 4) {
      const idx = procCells.length;
      procCells.push(
        <EmptyZonaSlot
          key={`proc-empty-${procSlotsPage}-${idx}`}
          variant="procesamiento"
          label={idx + 1}
        />,
      );
    }

    return (
      <div className={`${pad} flex min-h-0 w-full flex-1 flex-col pb-2 sm:pb-3`}>
        <div className="mb-3 flex shrink-0 flex-wrap items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700 shadow-sm">
            <FiCpu className="h-[18px] w-[18px]" strokeWidth={2} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold tracking-tight text-slate-900">Procesamiento</h3>
          </div>
          <button
            type="button"
            aria-label={`Abrir tareas pendientes (${cantidadTareasPendientesPanel})`}
            title={`Ver tareas pendientes: almacenamiento → procesamiento y procesamiento → almacenamiento (${cantidadTareasPendientesPanel})`}
            onClick={() => setModalPendientesIniciadoAbierto(true)}
            className={
              cantidadTareasPendientesPanel > 0
                ? BODEGA_ZONE_STATUS_PILL_ACTIVE_CLASS
                : BODEGA_ZONE_STATUS_PILL_INACTIVE_CLASS
            }
          >
            <MdPendingActions
              className={
                cantidadTareasPendientesPanel > 0
                  ? BODEGA_ZONE_STATUS_ICON_ACTIVE_CLASS
                  : BODEGA_ZONE_STATUS_ICON_INACTIVE_CLASS
              }
              aria-hidden
            />
            <span
              className={`min-w-[1.125rem] text-center text-[11px] ${
                cantidadTareasPendientesPanel > 0
                  ? BODEGA_ZONE_STATUS_NUM_ACTIVE_CLASS
                  : BODEGA_ZONE_STATUS_NUM_INACTIVE_CLASS
              }`}
              aria-hidden
            >
              {cantidadTareasPendientesPanel}
            </span>
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="min-w-0 space-y-3">
            <div className="space-y-2">{alerts}</div>
            {codeOk && clientIds.length > 0 ? (
              <>
                <ZonaCuatroSlotsRow>{procCells}</ZonaCuatroSlotsRow>
               
                {slotItemsZona.length > 4 ? (
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-700">
                    <button
                      type="button"
                      className="rounded-lg border border-slate-200 px-3 py-1 bg-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() => setProcSlotsPage((p) => Math.max(0, p - 1))}
                      disabled={procSlotsPage === 0}
                    >
                      Anterior
                    </button>
                    <span className="font-semibold">
                      {procSlotsPage + 1} de {procSlotsTotalPages}
                    </span>
                    <button
                      type="button"
                      className="rounded-lg border border-slate-200 px-3 py-1 bg-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() =>
                        setProcSlotsPage((p) => Math.min(procSlotsTotalPages - 1, p + 1))
                      }
                      disabled={procSlotsPage >= procSlotsTotalPages - 1}
                    >
                      Siguiente
                    </button>
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
        </div>
        {modalPendientesIniciado}
        {modalTrasladoMovimientoBodega}
        {detalleModal}
        {modalDesperdicio}
      </div>
    );
  }

  if (layout === "cards") {
    return (
      <div className={pad}>
        <div className="mb-3 flex flex-wrap items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700 shadow-sm">
            <FiCpu className="h-[18px] w-[18px]" strokeWidth={2} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold tracking-tight text-slate-900">Procesamiento</h3>
          </div>
          <button
            type="button"
            aria-label={`Abrir tareas pendientes (${cantidadTareasPendientesPanel})`}
            title={`Ver tareas pendientes: almacenamiento → procesamiento y procesamiento → almacenamiento (${cantidadTareasPendientesPanel})`}
            onClick={() => setModalPendientesIniciadoAbierto(true)}
            className={
              cantidadTareasPendientesPanel > 0
                ? BODEGA_ZONE_STATUS_PILL_ACTIVE_CLASS
                : BODEGA_ZONE_STATUS_PILL_INACTIVE_CLASS
            }
          >
            <MdPendingActions
              className={
                cantidadTareasPendientesPanel > 0
                  ? BODEGA_ZONE_STATUS_ICON_ACTIVE_CLASS
                  : BODEGA_ZONE_STATUS_ICON_INACTIVE_CLASS
              }
              aria-hidden
            />
            <span
              className={`min-w-[1.125rem] text-center text-[11px] ${
                cantidadTareasPendientesPanel > 0
                  ? BODEGA_ZONE_STATUS_NUM_ACTIVE_CLASS
                  : BODEGA_ZONE_STATUS_NUM_INACTIVE_CLASS
              }`}
              aria-hidden
            >
              {cantidadTareasPendientesPanel}
            </span>
          </button>
        </div>
        <div className="mb-3 space-y-2">{alerts}</div>
        {codeOk && clientIds.length > 0 ? (
          <div
            ref={refCarruselProcesamiento}
            className="w-full snap-x snap-mandatory overflow-x-auto px-2 py-3 pb-2 [-webkit-overflow-scrolling:touch] scroll-smooth [scrollbar-width:thin] sm:px-3"
            role="region"
            aria-label="Órdenes en curso"
          >
            <div className="flex w-max min-w-full flex-nowrap gap-2 sm:gap-4">
              {filasCarruselPrincipal.length === 0 ? (
                <div className="w-full min-w-full shrink-0 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-3 py-10 text-center text-sm text-slate-500">
                  {filasActivas.length === 0 ? (
                    "No hay órdenes pendientes de procesamiento."
                  ) : (
                    <>
                      No hay órdenes <strong className="text-slate-700">En curso</strong>.
                    </>
                  )}
                </div>
              ) : (
                filasCarruselPrincipal.map((row) => (
                  <TarjetaOrdenProcesamientoCarrusel
                    key={`${row.clientId}::${row.id}`}
                    row={row}
                    anchoMedido={anchoTarjetaCarrusel}
                    onSelect={(r) => {
                      setError(null);
                      setDetallePendienteMovimiento(null);
                      setDetalle(r);
                    }}
                  />
                ))
              )}
            </div>
          </div>
        ) : null}
        {modalPendientesIniciado}
        {modalTrasladoMovimientoBodega}
        {detalleModal}
        {modalDesperdicio}
      </div>
    );
  }

  return (
    <div className={pad}>
      <p className="mb-3 text-xs leading-relaxed text-slate-600">
        Listado de <strong>Iniciado</strong> y <strong>En curso</strong>. Al pasar a <strong>En curso</strong> se
        descuenta el primario en el mapa y se calcula el <strong>sobrante</strong> (fracción en kg) si aplica. Para
        cerrar el trabajo del procesador hay que declarar la <strong>merma en kg</strong> y pasar a{" "}
        <strong>Pendiente</strong> (no vuelve al mapa; va al reporte). <strong>Terminado</strong> lo asigna el sistema
        cuando el operario ubicó procesado y sobrante en almacenamiento. En la vista de mapa del tablero se muestran
        siempre los cuatro casilleros; las órdenes <strong>En curso</strong> se ven en esos espacios y el resto queda
        vacío hasta que haya tareas. «En curso» solo lo puede elegir quien tenga la orden asignada desde{" "}
        <strong>Iniciado</strong>.
      </p>
      {alerts}
      {codeOk && clientIds.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="max-h-[min(50vh,360px)] overflow-x-auto overflow-y-auto sm:max-h-[min(55vh,420px)]">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="whitespace-nowrap px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Orden
                  </th>
                  <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">Cuenta</th>
                  <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">Primario</th>
                  <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">Secundario</th>
                  <th className="whitespace-nowrap px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Insumo primario
                  </th>
                  <th className="whitespace-nowrap px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Estim. sec.
                  </th>
                  <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">Estado</th>
                  <th className="whitespace-nowrap px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Fecha
                  </th>
                </tr>
              </thead>
              <tbody>
                {filasActivas.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-slate-500">
                      No hay órdenes en Iniciado ni En curso para esta bodega.
                    </td>
                  </tr>
                ) : (
                  filasActivas.map((row) => {
                    const key = `${row.clientId}::${row.id}`;
                    return (
                      <tr key={key} className="border-b border-slate-100">
                        <td className="whitespace-nowrap px-3 py-2 font-mono text-[12px] font-semibold text-slate-900">
                          {row.numero}
                        </td>
                        <td className="max-w-[120px] px-3 py-2 text-slate-800">
                          <span className="line-clamp-2 text-[12px]" title={row.clientName}>
                            {row.clientName || row.clientId}
                          </span>
                        </td>
                        <td className="max-w-[120px] px-3 py-2 text-slate-800">
                          <span className="line-clamp-2 text-[12px]">{row.productoPrimarioTitulo}</span>
                        </td>
                        <td className="max-w-[120px] px-3 py-2 text-slate-800">
                          <span className="line-clamp-2 text-[12px]">{row.productoSecundarioTitulo}</span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 tabular-nums text-slate-900">
                          {cantidadPrimarioProcesamientoTexto(
                            row,
                            primarioCatalogoPorId(productosCatalogo, row.productoPrimarioId),
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 tabular-nums text-slate-800">
                          {estimadoUnidadesSecundarioTexto(row.estimadoUnidadesSecundario)}
                        </td>
                        <td className="px-3 py-2">{estadoSelect(row, key, "")}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-slate-600">{row.fecha || "—"}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
      {modalDesperdicio}
    </div>
  );
}
