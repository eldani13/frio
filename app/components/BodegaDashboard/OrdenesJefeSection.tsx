/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  FiArchive,
  FiBox,
  FiCpu,
  FiGrid,
  FiMapPin,
  FiPackage,
  FiRepeat,
  FiSearch,
  FiAlertTriangle,
  FiClipboard,
  FiX,
} from "react-icons/fi";
import { HiArrowRightOnRectangle } from "react-icons/hi2";

import React, { useState, useMemo } from "react";
import {
  secondaryTitleFromSlot,
  slotLooksLikeProcesamiento,
  type SlotCantidadContext,
} from "@/app/lib/bodegaDisplay";
import type { BodegaOrder, Client, Role, Slot } from "@/app/interfaces/bodega";
import type { SolicitudProcesamiento } from "@/app/types/solicitudProcesamiento";
import type { Catalogo } from "@/app/types/catalogo";
import { kgSobranteParaDevolucionMapa } from "@/app/lib/sobranteKg";
import {
  cantidadPrimarioProcesamientoTexto,
  primarioCatalogoPorId,
} from "@/app/lib/procesamientoDisplay";
import { ProcesamientoOrdenesActivasBodega } from "@/app/components/BodegaDashboard/ProcesamientoOrdenesActivasBodega";
import { AsignarProcesadorProcesamientoModal } from "@/app/components/BodegaDashboard/AsignarProcesadorProcesamientoModal";
import BodegaZonaCajaCard from "../bodega/BodegaZonaCajaCard";
import SlotCard from "../bodega/SlotCard";
import BodegaSlotLegend from "../bodega/BodegaSlotLegend";
import {
  EmptyZonaSlot,
  padToLength,
  ZONA_ENTRADA_SALIDA_SLOTS,
  ZonaCuatroSlotsRow,
} from "../bodega/ZonaCuatroSlotsRow";
import VentasEnCursoMapButton from "../bodega/VentasEnCursoMapButton";
import { BodegaZonaEstadoModalShell } from "../bodega/BodegaZonaEstadoModalShell";
import { RiUserReceivedLine } from "react-icons/ri";
import { temperatureStringFromAnalyzeResponse } from "@/app/lib/imageAnalyzeApi";

const HIGH_TEMP_THRESHOLD = 5;

type JefeModalAccent = "emerald" | "blue" | "orange" | "pink";

const jefeModalAccentClass: Record<
  JefeModalAccent,
  {
    header: string;
    iconWrap: string;
    iconColor: string;
    cardBorder: string;
    primary: string;
    primaryHover: string;
    selectFocus: string;
  }
> = {
  emerald: {
    header: "from-emerald-50 via-white to-slate-50/30",
    iconWrap: "bg-emerald-100",
    iconColor: "text-emerald-600",
    cardBorder: "border-emerald-100",
    primary: "bg-emerald-600",
    primaryHover: "hover:bg-emerald-500",
    selectFocus: "focus:border-emerald-400 focus:ring-emerald-200/60",
  },
  blue: {
    header: "from-blue-50 via-white to-slate-50/30",
    iconWrap: "bg-blue-100",
    iconColor: "text-blue-600",
    cardBorder: "border-blue-100",
    primary: "bg-blue-600",
    primaryHover: "hover:bg-blue-500",
    selectFocus: "focus:border-blue-400 focus:ring-blue-200/60",
  },
  orange: {
    header: "from-orange-50 via-white to-slate-50/30",
    iconWrap: "bg-orange-100",
    iconColor: "text-orange-600",
    cardBorder: "border-orange-100",
    primary: "bg-orange-600",
    primaryHover: "hover:bg-orange-500",
    selectFocus: "focus:border-orange-400 focus:ring-orange-200/60",
  },
  pink: {
    header: "from-pink-50 via-white to-slate-50/30",
    iconWrap: "bg-pink-100",
    iconColor: "text-pink-600",
    cardBorder: "border-pink-100",
    primary: "bg-pink-600",
    primaryHover: "hover:bg-pink-500",
    selectFocus: "focus:border-pink-400 focus:ring-pink-200/60",
  },
};

function JefeOrderModalShell({
  id,
  title,
  description,
  accent,
  icon,
  onClose,
  children,
  footer,
  contentMaxWidthClass = "max-w-lg",
  bodyMaxHeightClass = "max-h-[min(62vh,480px)]",
}: {
  id: string;
  title: string;
  description?: string;
  accent: JefeModalAccent;
  icon: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
  /** Ancho del panel (p. ej. tablas anchas: `max-w-4xl`). */
  contentMaxWidthClass?: string;
  bodyMaxHeightClass?: string;
}) {
  const a = jefeModalAccentClass[accent];
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-3 backdrop-blur-[2px] sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${id}-title`}
      onClick={onClose}
    >
      <div
        className={`w-full ${contentMaxWidthClass} overflow-hidden rounded-3xl border bg-white shadow-2xl shadow-slate-900/10 ring-1 ring-black/5 ${a.cardBorder}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`relative flex items-start gap-4 border-b border-slate-100/80 bg-linear-to-r px-5 py-5 sm:px-6 ${a.header}`}
        >
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-inner ${a.iconWrap}`}
          >
            <span className={a.iconColor}>{icon}</span>
          </div>
          <div className="min-w-0 flex-1 pr-10">
            <h2
              id={`${id}-title`}
              className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl"
            >
              {title}
            </h2>
            {description ? (
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
            aria-label="Cerrar"
          >
            <FiX className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>
        <div className={`${bodyMaxHeightClass} overflow-y-auto px-5 py-5 sm:px-6`}>
          <div className="flex flex-col gap-5">{children}</div>
        </div>
        <div className="border-t border-slate-100 bg-slate-50/90 px-5 py-4 sm:px-6">{footer}</div>
      </div>
    </div>
  );
}

function JefeModalField({
  label,
  icon,
  hint,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {icon ? (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
            {icon}
          </span>
        ) : null}
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>
      </div>
      {children}
      {hint ? <p className="text-xs leading-relaxed text-slate-500">{hint}</p> : null}
    </div>
  );
}

const jefeNestedShellBorder: Record<JefeModalAccent, string> = {
  emerald: "border-emerald-100",
  blue: "border-blue-100",
  orange: "border-orange-100",
  pink: "border-pink-100",
};

/** Modal secundario encima del modal de orden (z-index mayor). */
function JefeNestedPickerShell({
  title,
  onClose,
  children,
  accent = "blue",
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  accent?: JefeModalAccent;
}) {
  const a = jefeModalAccentClass[accent];
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/55 p-3 backdrop-blur-[2px] sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="jefe-nested-picker-title"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-lg overflow-hidden rounded-2xl border bg-white shadow-2xl ring-1 ring-black/5 ${jefeNestedShellBorder[accent]}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`flex items-center justify-between border-b border-slate-100 bg-linear-to-r px-4 py-3 sm:px-5 ${a.header}`}
        >
          <h3 id="jefe-nested-picker-title" className="text-base font-bold tracking-tight text-slate-900">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
            aria-label="Cerrar"
          >
            <FiX className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>
        <div className="max-h-[min(60vh,520px)] overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">{children}</div>
      </div>
    </div>
  );
}

/** Picker secundario compartido por todos los formularios de orden del jefe. */
type JefeInteractivePicker =
  | null
  | { flow: "traslado"; step: "origen" | "caja" | "posicion" | "procesamiento" }
  | { flow: "ingreso"; step: "caja" | "posicion" }
  | { flow: "revisar"; step: "caja" }
  | { flow: "salida"; step: "caja" };

function jefePickerTitle(p: NonNullable<JefeInteractivePicker>): string {
  if (p.flow === "traslado") {
    switch (p.step) {
      case "origen":
        return "Elegir origen del traslado";
      case "caja":
        return "Elegir caja en bodega";
      case "posicion":
        return "Elegir casillero de destino";
      case "procesamiento":
        return "Elegir orden terminada (procesamiento)";
      default:
        return "Seleccionar";
    }
  }
  if (p.flow === "ingreso") {
    return p.step === "caja" ? "Elegir caja en ingresos" : "Elegir posición en bodega";
  }
  if (p.flow === "revisar") return "Elegir caja a revisar";
  if (p.flow === "salida") return "Elegir caja para salida";
  return "Seleccionar";
}

function jefePickerAccent(p: NonNullable<JefeInteractivePicker>): JefeModalAccent {
  if (p.flow === "traslado") return "blue";
  if (p.flow === "ingreso") return "emerald";
  if (p.flow === "revisar") return "orange";
  return "pink";
}

function jefePickerCardClass(selected: boolean, accent: JefeModalAccent): string {
  const on = {
    emerald: "border-emerald-600 bg-emerald-50",
    blue: "border-blue-600 bg-blue-50",
    orange: "border-orange-600 bg-orange-50",
    pink: "border-pink-600 bg-pink-50",
  }[accent];
  return selected
    ? `border-2 ${on}`
    : "border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50/90";
}

const jefePickerInputHover: Record<JefeModalAccent, string> = {
  emerald: "hover:border-emerald-200",
  blue: "hover:border-blue-200",
  orange: "hover:border-orange-200",
  pink: "hover:border-pink-200",
};

const jefePickerTriggerBtn: Record<JefeModalAccent, string> = {
  emerald: "border-slate-200/80 bg-emerald-50/95 text-emerald-800 hover:bg-emerald-100",
  blue: "border-slate-200/80 bg-blue-50/95 text-blue-700 hover:bg-blue-100",
  orange: "border-slate-200/80 bg-orange-50/95 text-orange-800 hover:bg-orange-100",
  pink: "border-slate-200/80 bg-pink-50/95 text-pink-800 hover:bg-pink-100",
};

function JefeModalEmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5 rounded-xl border border-amber-200/80 bg-amber-50/90 px-3.5 py-2.5 text-xs leading-snug text-amber-950">
      <FiAlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
      <div>{children}</div>
    </div>
  );
}

/** Campo tipo «select» sin desplegable: valor de solo lectura + lupa dentro del input para abrir el picker. */
function JefeOrderPickerTrigger({
  accent,
  value,
  placeholder,
  onOpen,
  disabled,
  "aria-label": ariaLabel = "Abrir selector interactivo",
}: {
  accent: JefeModalAccent;
  value: string;
  placeholder: string;
  onOpen: () => void;
  disabled?: boolean;
  "aria-label"?: string;
}) {
  const ring = jefeModalAccentClass[accent].selectFocus;
  return (
    <div className="relative">
      <input
        type="text"
        readOnly
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onClick={() => {
          if (!disabled) onOpen();
        }}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpen();
          }
        }}
        className={`${jefeSelectClass} pr-11 text-left ${
          disabled
            ? "cursor-not-allowed bg-slate-50 text-slate-400"
            : `cursor-pointer ${jefePickerInputHover[accent]}`
        } ${ring}`}
        aria-readonly="true"
        autoComplete="off"
      />
      <button
        type="button"
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          if (!disabled) onOpen();
        }}
        className={`absolute inset-y-0 right-0 z-10 flex w-11 items-center justify-center rounded-r-xl border-l transition disabled:cursor-not-allowed disabled:opacity-40 ${jefePickerTriggerBtn[accent]}`}
        aria-label={ariaLabel}
        title="Elegir…"
      >
        <FiSearch className="h-4 w-4 shrink-0" strokeWidth={2} />
      </button>
    </div>
  );
}

const jefeSelectClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:outline-none focus:ring-2";

const jefeReadonlyClass =
  "w-full rounded-xl border border-slate-200/90 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-700";

const jefeBtnGhost =
  "inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 sm:w-auto";

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
  clients?: Client[];
  /** Código de cuenta de la bodega interna (Firestore `warehouses.codeCuenta`) para listar procesamiento. */
  warehouseCodeCuenta?: string;
  sessionUid?: string;
  sessionRole?: Role;
  operariosBodega?: Array<{ id: string; name: string; roleLabel?: string }>;
  /** Solo rol `procesador` — para el modal «Procesamiento» del mapa del jefe. */
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
  /** Órdenes de procesamiento en **Terminado** (disponibles para devolver al mapa vía traslado). */
  solicitudesProcesamientoTerminadasDisponibles?: SolicitudProcesamiento[];
  /** Terminadas con sobrante (kg fraccionarios) pendiente de reintegrar al primario en mapa. */
  solicitudesProcesamientoTerminadasDisponiblesDesperdicio?: SolicitudProcesamiento[];
  /** Todas las solicitudes terminadas (suscripción); sirve para mostrar unidades secundario en el mapa aunque no estén persistidas en el slot. */
  solicitudesProcesamientoTerminadas?: SolicitudProcesamiento[];
  ordenesBodegaPendientes?: BodegaOrder[];
  /** Alertas y tareas por zona (mismo modal que el tab Estado del padre). */
  renderStatusButtons?: (zone: "entrada" | "bodega" | "salida") => React.ReactNode;
  /** Catálogo (opcional): unidad del primario en textos de traslado desde procesamiento. */
  productosCatalogo?: Catalogo[];
}) {
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
    solicitudesProcesamientoTerminadasDisponibles = [],
    solicitudesProcesamientoTerminadasDisponiblesDesperdicio = [],
    solicitudesProcesamientoTerminadas = [],
    ordenesBodegaPendientes = [],
    renderStatusButtons,
    productosCatalogo,
  } = props;

  const slotCantidadProcesamientoCtx = useMemo((): SlotCantidadContext | undefined => {
    if (!solicitudesProcesamientoTerminadas.length) return undefined;
    return { solicitudesTerminadas: solicitudesProcesamientoTerminadas };
  }, [solicitudesProcesamientoTerminadas]);

  // Mark optional handler as intentionally unused in this view
  void handleCreateOrderSalida;

  // Estado para loading del modal de editar temperatura
  const [editTempLoading, setEditTempLoading] = React.useState(false);
  const [trasladoBodegaOrigenTipo, setTrasladoBodegaOrigenTipo] = useState<"bodega" | "procesamiento">(
    "bodega",
  );
  const [trasladoProcesamientoKey, setTrasladoProcesamientoKey] = useState("");
  /** Picker secundario (lupa): traslado, ingreso, revisar, salida. */
  const [jefeInteractivePicker, setJefeInteractivePicker] = useState<JefeInteractivePicker>(null);
  const [trasladoCajaSearch, setTrasladoCajaSearch] = useState("");
  const [trasladoProcSearch, setTrasladoProcSearch] = useState("");
  const [ingresoCajaSearch, setIngresoCajaSearch] = useState("");
  const [revisarSearch, setRevisarSearch] = useState("");
  const [salidaCajaSearch, setSalidaCajaSearch] = useState("");

  React.useEffect(() => {
    if (orderModalType === "bodega") {
      setTrasladoBodegaOrigenTipo("bodega");
      setTrasladoProcesamientoKey("");
    }
  }, [orderModalType]);

  React.useEffect(() => {
    setJefeInteractivePicker(null);
    setTrasladoCajaSearch("");
    setTrasladoProcSearch("");
    setIngresoCajaSearch("");
    setRevisarSearch("");
    setSalidaCajaSearch("");
  }, [orderModalType]);

  const trasladoCajasFiltradas = useMemo(() => {
    const list = sortByPosition(availableBodegaForOrders);
    const q = trasladoCajaSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (b) =>
        String(b.position).includes(q) ||
        (b.name || "").toLowerCase().includes(q) ||
        (b.autoId || "").toLowerCase().includes(q) ||
        (b.client || "").toLowerCase().includes(q),
    );
  }, [availableBodegaForOrders, trasladoCajaSearch, sortByPosition]);

  const trasladoProcOpciones = useMemo(() => {
    const out: Array<{
      key: string;
      kind: "procesado" | "desperdicio";
      row: SolicitudProcesamiento;
    }> = [];
    solicitudesProcesamientoTerminadasDisponibles.forEach((row) => {
      out.push({ kind: "procesado", row, key: `${row.clientId}::${row.id}::procesado` });
    });
    solicitudesProcesamientoTerminadasDisponiblesDesperdicio.forEach((row) => {
      out.push({ kind: "desperdicio", row, key: `${row.clientId}::${row.id}::desperdicio` });
    });
    return out;
  }, [solicitudesProcesamientoTerminadasDisponibles, solicitudesProcesamientoTerminadasDisponiblesDesperdicio]);

  const trasladoProcFiltradas = useMemo(() => {
    const q = trasladoProcSearch.trim().toLowerCase();
    if (!q) return trasladoProcOpciones;
    return trasladoProcOpciones.filter(({ row }) => {
      const blob = [
        row.numero,
        row.productoPrimarioTitulo,
        row.productoSecundarioTitulo ?? "",
        row.clientId,
        row.id,
      ]
        .join(" ")
        .toLowerCase();
      return blob.includes(q);
    });
  }, [trasladoProcOpciones, trasladoProcSearch]);

  const trasladoCajaDisplayText = useMemo(() => {
    if (availableBodegaForOrders.length === 0) return "";
    const box = sortByPosition(availableBodegaForOrders).find((b) => b.position === bodegaOrderSourcePosition);
    if (!box) return "";
    return `Casillero ${box.position} — ${box.name} (${box.autoId}) · ${box.client || "—"}`;
  }, [availableBodegaForOrders, bodegaOrderSourcePosition, sortByPosition]);

  const trasladoProcesamientoDisplayText = useMemo(() => {
    if (trasladoProcOpciones.length === 0) return "";
    if (!trasladoProcesamientoKey) return "";
    const opt = trasladoProcOpciones.find((o) => o.key === trasladoProcesamientoKey);
    if (!opt) return "";
    const row = opt.row;
    const pref = opt.kind === "desperdicio" ? "Sobrante · " : "Procesado · ";
    const prim = primarioCatalogoPorId(productosCatalogo, row.productoPrimarioId);
    const qtyLine = cantidadPrimarioProcesamientoTexto(row, prim);
    const title =
      row.productoPrimarioTitulo.length > 48
        ? `${row.productoPrimarioTitulo.slice(0, 48)}…`
        : row.productoPrimarioTitulo;
    return `${pref}${row.numero} — ${qtyLine} · ${title}`;
  }, [trasladoProcOpciones, trasladoProcesamientoKey, productosCatalogo]);

  const trasladoSeleccionado = useMemo(() => {
    if (!trasladoProcesamientoKey) return null;
    return trasladoProcOpciones.find((o) => o.key === trasladoProcesamientoKey) ?? null;
  }, [trasladoProcOpciones, trasladoProcesamientoKey]);

  const ingresoCajaDisplayText = useMemo(() => {
    if (availableInboundForOrders.length === 0) return "";
    const box = sortByPosition(availableInboundForOrders).find((b) => b.position === ingresoOrderSourcePosition);
    if (!box) return "";
    return `Ingreso ${box.position} — ${box.name} (${box.autoId}) · ${box.client || "—"}`;
  }, [availableInboundForOrders, ingresoOrderSourcePosition, sortByPosition]);

  const ingresoCajasFiltradas = useMemo(() => {
    const list = sortByPosition(availableInboundForOrders);
    const q = ingresoCajaSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (b) =>
        String(b.position).includes(q) ||
        (b.name || "").toLowerCase().includes(q) ||
        (b.autoId || "").toLowerCase().includes(q) ||
        (b.client || "").toLowerCase().includes(q),
    );
  }, [availableInboundForOrders, ingresoCajaSearch, sortByPosition]);

  const revisarRows = useMemo(() => {
    const rows: Array<{ zone: string; box: (typeof availableInboundForOrders)[0] }> = [];
    for (const g of [
      { zone: "Ingresos", list: availableInboundForOrders },
      { zone: "Bodega", list: reviewBodegaList },
      { zone: "Salida", list: outboundBoxes },
    ]) {
      sortByPosition(g.list).forEach((box) => rows.push({ zone: g.zone, box }));
    }
    return rows;
  }, [availableInboundForOrders, reviewBodegaList, outboundBoxes, sortByPosition]);

  const revisarFiltradas = useMemo(() => {
    const q = revisarSearch.trim().toLowerCase();
    if (!q) return revisarRows;
    return revisarRows.filter(
      ({ zone, box }) =>
        zone.toLowerCase().includes(q) ||
        String(box.position).includes(q) ||
        (box.name || "").toLowerCase().includes(q) ||
        (box.autoId || "").toLowerCase().includes(q) ||
        (box.client || "").toLowerCase().includes(q),
    );
  }, [revisarRows, revisarSearch]);

  const revisarDisplayText = useMemo(() => {
    for (const g of [
      { zone: "Ingresos", list: availableInboundForOrders },
      { zone: "Bodega", list: reviewBodegaList },
      { zone: "Salida", list: outboundBoxes },
    ]) {
      const box = sortByPosition(g.list).find((b) => b.position === reviewSourcePosition);
      if (box) return `${g.zone} ${box.position} — ${box.name} (${box.autoId}) · ${box.client || "—"}`;
    }
    return "";
  }, [availableInboundForOrders, reviewBodegaList, outboundBoxes, reviewSourcePosition, sortByPosition]);

  const salidaCajaDisplayText = useMemo(() => {
    if (availableBodegaForOrders.length === 0) return "";
    const box = sortByPosition(availableBodegaForOrders).find((b) => b.position === salidaSourcePosition);
    if (!box) return "";
    return `Casillero ${box.position} — ${box.name} (${box.autoId}) · ${box.client || "—"}`;
  }, [availableBodegaForOrders, salidaSourcePosition, sortByPosition]);

  const salidaCajasFiltradas = useMemo(() => {
    const list = sortByPosition(availableBodegaForOrders);
    const q = salidaCajaSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (b) =>
        String(b.position).includes(q) ||
        (b.name || "").toLowerCase().includes(q) ||
        (b.autoId || "").toLowerCase().includes(q) ||
        (b.client || "").toLowerCase().includes(q),
    );
  }, [availableBodegaForOrders, salidaCajaSearch, sortByPosition]);

  React.useEffect(() => {
    if (orderModalType !== "bodega" || trasladoBodegaOrigenTipo !== "procesamiento") return;
    const first = trasladoProcOpciones[0];
    if (!first) {
      setTrasladoProcesamientoKey("");
      return;
    }
    const k = first.key;
    setTrasladoProcesamientoKey((prev) =>
      trasladoProcOpciones.some((o) => o.key === prev) ? prev : k,
    );
  }, [orderModalType, trasladoBodegaOrigenTipo, trasladoProcOpciones]);

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

  const inboundSlotsItems = sortedInboundBoxes.slice(0, ZONA_ENTRADA_SALIDA_SLOTS);
  const outboundSlotsItems = sortedOutboundBoxes.slice(0, ZONA_ENTRADA_SALIDA_SLOTS);

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
  const [modalAsignarProcesadorOpen, setModalAsignarProcesadorOpen] = useState(false);

  return (
    <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
      {isJefe && (
        <div className="col-span-4 mb-8">
          <div className="flex flex-col gap-4 sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
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
            {/* Procesamiento: órdenes ya terminadas (solo consulta) */}
            <button
              type="button"
              className="flex flex-col items-start rounded-xl p-3 shadow-sm bg-white text-slate-900 h-20 border border-slate-200 group transition hover:bg-slate-50"
              onClick={() => setModalAsignarProcesadorOpen(true)}
            >
              <div className="flex items-center gap-1 mb-1">
                <FiCpu className="w-5 h-5 text-slate-500" />
                <span className="text-base font-semibold">Procesamiento</span>
              </div>
              <span className="text-[11px] text-slate-500">Finalizados</span>
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
      {/* Almacenamiento (mapa) para jefe */}
      {isJefe && (
        <div className="col-span-4 mb-8">
          {editTempModal && (
                  <div
                    className="fixed inset-0 z-[110] flex items-center justify-center p-2 bg-black/40 backdrop-blur-sm"
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
                                  "http://localhost:3000/api/image/analyze",
                                  {
                                    method: "POST",
                                    body: formData,
                                  },
                                );
                                const data = await res.json();
                                const tempValue =
                                  temperatureStringFromAnalyzeResponse(data);
                                if (
                                  tempValue !== null &&
                                  Number.isFinite(Number(tempValue))
                                ) {
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
          {/* Mismo criterio que EstadoBodegaSection (admin): grid estira fila al contenido más alto; mapa completo sin recorte */}
          <div className="grid items-stretch gap-6 xl:grid-cols-[1fr_1.8fr_1fr] 2xl:grid-cols-[1fr_2.1fr_1fr]">
            <div className="flex h-full min-h-0 w-full max-w-full flex-col rounded-3xl border border-emerald-200/95 bg-emerald-50/85 p-2 sm:max-w-lg sm:p-4">
              <div className="mb-2 flex min-w-0 shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="flex min-w-0 items-center gap-2 text-[17px] font-bold leading-tight tracking-tight text-emerald-900 sm:text-lg">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                    <FiBox className="h-[18px] w-[18px] sm:h-5 sm:w-5" aria-hidden />
                  </span>
                  Entrada
                </h3>
                {renderStatusButtons ? (
                  <div className="flex shrink-0 flex-wrap items-center gap-2 sm:ml-auto sm:justify-end">
                    {renderStatusButtons("entrada")}
                  </div>
                ) : null}
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
                <BodegaZonaEstadoModalShell
                  titleId="jefe-zona-status-modal-title"
                  label={statusModal.kind === "alertas" ? "Alertas" : "Tareas pendientes"}
                  title={zoneLabels[statusModal.zone]}
                  subtitle={
                    statusModal.kind === "alertas"
                      ? "Detalles de alertas activas en esta zona."
                      : "Tareas pendientes relacionadas con esta zona."
                  }
                  icon={
                    statusModal.kind === "alertas" ? (
                      <FiAlertTriangle className="h-6 w-6 shrink-0" aria-hidden />
                    ) : (
                      <FiClipboard className="h-6 w-6 shrink-0" aria-hidden />
                    )
                  }
                  onClose={() => setStatusModal(null)}
                  zClass="z-50"
                >
                  {(statusModal.kind === "alertas"
                    ? zoneAlertItems[statusModal.zone]
                    : zoneTaskItems[statusModal.zone]
                  ).length === 0 ? (
                    <p className="text-sm leading-relaxed text-slate-600">
                      No hay <strong className="text-slate-800">elementos</strong> para mostrar en esta zona.
                    </p>
                  ) : (
                    <ul className="grid gap-3">
                      {(statusModal.kind === "alertas"
                        ? zoneAlertItems[statusModal.zone]
                        : zoneTaskItems[statusModal.zone]
                      ).map((item) => (
                        <li
                          key={item.id}
                          className="rounded-2xl border border-sky-100 bg-linear-to-br from-white to-sky-50/40 p-4 shadow-sm"
                        >
                          <p className="font-semibold leading-snug text-slate-900">{item.title}</p>
                          <p className="mt-1 text-sm leading-relaxed text-slate-600">{item.description}</p>
                          {item.meta ? (
                            <p className="mt-2 text-xs font-semibold text-slate-500">{item.meta}</p>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </BodegaZonaEstadoModalShell>
              ) : null}
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
                            typeof box.temperature === "number" &&
                            box.temperature > HIGH_TEMP_THRESHOLD
                          }
                          clients={clients}
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
                          key={`jefe-entrada-empty-${idx}`}
                          variant="entrada"
                          label={idx + 1}
                        />
                      ),
                    )}
                  </ZonaCuatroSlotsRow>
                  {sortedInboundBoxes.length === 0 ? (
                    <p className="text-center text-[11px] text-emerald-900/85">No hay cajas en ingreso.</p>
                  ) : null}
                  {sortedInboundBoxes.length > ZONA_ENTRADA_SALIDA_SLOTS ? (
                    <p className="text-center text-[10px] text-emerald-900/80">
                      Mostrando {ZONA_ENTRADA_SALIDA_SLOTS} de {sortedInboundBoxes.length} cajas en ingreso.
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <div className="relative flex w-full shrink-0 flex-col rounded-xl border border-slate-200 bg-white px-4 pb-8 pt-4 shadow-sm sm:px-6 sm:pb-10 sm:pt-5">
              <div className="flex min-w-0 flex-col">
              <div className="mb-5 flex min-w-0 flex-col gap-4 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <h2 className="flex min-w-0 items-center gap-2.5 text-[17px] font-bold leading-tight tracking-tight text-slate-900 sm:text-lg">
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
                      <FiArchive className="h-[18px] w-[18px] sm:h-5 sm:w-5" aria-hidden />
                    </span>
                    <span>Almacenamiento</span>
                  </h2>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:ml-auto sm:justify-end">
                  <button
                    type="button"
                    className={
                      bodegaHighTempAlerts.length === 0
                        ? "inline-flex h-8 shrink-0 items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-100"
                        : "inline-flex h-8 shrink-0 items-center gap-1 rounded-full bg-[#e6003a] px-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#c20030] focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50"
                    }
                    title="Ver alertas de temperatura en bodega"
                    onClick={() => setShowAlertModal(true)}
                  >
                    <FiAlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
                    <span className="text-[11px] font-semibold tabular-nums leading-none">
                      {bodegaHighTempAlerts.length}
                    </span>
                  </button>
                  <button
                    type="button"
                    className={
                      llamadasJefe.length === 0
                        ? "inline-flex h-8 shrink-0 items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-100"
                        : "inline-flex h-8 shrink-0 items-center gap-1 rounded-full bg-yellow-200 px-2.5 text-xs font-semibold text-blue-900 shadow-sm transition hover:bg-yellow-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/60"
                    }
                    title={`Llamados pendientes (${llamadasJefe.length})`}
                    aria-label={`Ver llamados, ${llamadasJefe.length} pendientes`}
                    onClick={() => setShowLlamadosModal(true)}
                  >
                    <RiUserReceivedLine className="h-4 w-4 shrink-0" aria-hidden />
                    <span className="text-[11px] font-semibold tabular-nums leading-none">
                      {llamadasJefe.length}
                    </span>
                  </button>
                  <VentasEnCursoMapButton
                    clients={clients}
                    warehouseCodeCuenta={warehouseCodeCuenta}
                    sessionRole={sessionRole}
                    operariosBodega={operariosBodega}
                    tareasProcesamientoOperario={tareasProcesamientoOperario}
                    onPushTareaProcesamientoOperario={onPushTareaProcesamientoOperario}
                    productosCatalogo={productosCatalogo}
                  />
                </div>
              </div>
              {showLlamadosModal ? (
                <BodegaZonaEstadoModalShell
                  titleId="jefe-llamados-modal-title"
                  label="Llamado al jefe"
                  title="Llamados al jefe"
                  subtitle="Solicitudes de atención desde el piso. Revisá y marcá como resueltas cuando corresponda."
                  icon={<RiUserReceivedLine className="h-6 w-6 shrink-0" aria-hidden />}
                  onClose={() => setShowLlamadosModal(false)}
                  zClass="z-50"
                >
                  {llamadasJefe.length === 0 ? (
                    <p className="text-sm leading-relaxed text-slate-600">
                      No hay <strong className="text-slate-800">llamados activos</strong>. Cuando un operario llame, aparecerá en esta lista.
                    </p>
                  ) : (
                    <ul className="grid gap-3">
                      {llamadasJefe.map((llamado, idx) => (
                        <li
                          key={idx}
                          className="rounded-2xl border border-sky-100 bg-linear-to-br from-white to-sky-50/40 p-4 shadow-sm"
                        >
                          <div className="flex items-start gap-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                              <RiUserReceivedLine className="h-5 w-5" aria-hidden />
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-semibold text-slate-900">
                                  {(llamado as any).message || (llamado as any).titulo || "Llamado"}
                                </span>
                                {(llamado as any).from ? (
                                  <span className="rounded-md border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-900">
                                    {(llamado as any).from}
                                  </span>
                                ) : null}
                              </div>
                              {(llamado as any).descripcion ? (
                                <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-slate-600">
                                  {(llamado as any).descripcion}
                                </p>
                              ) : null}
                              {(llamado as any).timestamp ? (
                                <p className="mt-2 flex items-center gap-1 text-xs font-medium text-slate-500">
                                  <span className="tabular-nums">
                                    {new Date((llamado as any).timestamp as number).toLocaleDateString("es-CL", {
                                      day: "2-digit",
                                      month: "2-digit",
                                      year: "numeric",
                                    })}
                                    ,{" "}
                                    {new Date((llamado as any).timestamp as number).toLocaleTimeString("es-CL", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                </p>
                              ) : null}
                              <div className="mt-3 flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
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
                                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-200"
                                  onClick={() => {
                                    void navigator.clipboard.writeText(
                                      `${(llamado as any).message || (llamado as any).titulo || "Llamado"} - ${(llamado as any).descripcion || ""}`,
                                    );
                                  }}
                                >
                                  Copiar
                                </button>
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </BodegaZonaEstadoModalShell>
              ) : null}
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
                                      zone: "bodega",
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
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 md:gap-4 lg:grid-cols-4 lg:gap-4">
                {slots.slice(0, 12).map((slot) => (
                  <SlotCard
                    key={slot.position}
                    slot={slot}
                    isSelected={false}
                    onSelect={() => undefined}
                    clients={clients}
                    slotCantidadContext={slotCantidadProcesamientoCtx}
                    detalleChildren={
                      slotLooksLikeProcesamiento(slot) ? (
                        <div className="space-y-2 text-sm">
                          <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-2">
                            <span className="shrink-0 font-bold text-slate-700">
                              Producto secundario (procesado):
                            </span>
                            <span className="min-w-0 break-words text-slate-600">
                              {secondaryTitleFromSlot(slot) || "—"}
                            </span>
                          </div>
                        </div>
                      ) : null
                    }
                  />
                ))}
              </div>
              </div>
            </div>
            <div className="mt-3 flex min-h-0 w-full flex-1 flex-col rounded-2xl border border-sky-200 bg-white p-3 shadow-md sm:p-4">
              <ProcesamientoOrdenesActivasBodega
                clients={clients}
                warehouseCodeCuenta={warehouseCodeCuenta}
                warehouseId={warehouseId}
                slots={slots as Slot[]}
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
                onCrearOrdenBodega={handleCreateOrder}
                productosCatalogo={productosCatalogo}
              />
            </div>
            </div>
            <div className="flex h-full min-h-0 w-full max-w-full flex-col rounded-3xl border border-pink-300 bg-pink-100/90 p-4 sm:max-w-lg sm:p-6">
              <div className="mb-2 flex min-w-0 shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="flex min-w-0 shrink-0 items-center gap-2 text-[17px] font-bold leading-tight tracking-tight text-pink-900 sm:text-lg">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-pink-200/90 text-pink-900">
                    <HiArrowRightOnRectangle className="h-[18px] w-[18px] sm:h-5 sm:w-5" aria-hidden />
                  </span>
                  Salida
                </h3>
                {renderStatusButtons ? (
                  <div className="flex shrink-0 flex-wrap items-center gap-2 sm:ml-auto sm:justify-end">
                    {renderStatusButtons("salida")}
                  </div>
                ) : null}
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
                          key={`jefe-salida-empty-${idx}`}
                          variant="salida"
                          label={idx + 1}
                        />
                      ),
                    )}
                  </ZonaCuatroSlotsRow>
                  {sortedOutboundBoxes.length === 0 ? (
                    <p className="text-center text-[11px] text-pink-900/80">No hay cajas en salida.</p>
                  ) : null}
                  {sortedOutboundBoxes.length > ZONA_ENTRADA_SALIDA_SLOTS ? (
                    <p className="text-center text-[10px] text-pink-900/75">
                      Mostrando {ZONA_ENTRADA_SALIDA_SLOTS} de {sortedOutboundBoxes.length} cajas en salida.
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4 flex w-full justify-center rounded-2xl border border-slate-200/80 bg-slate-50/60 px-3 py-2.5 sm:mt-5 sm:px-4">
            <BodegaSlotLegend variant="global" align="center" spacing="none" />
          </div>
        </div>
      )}

      {/* Modals for each action */}
      {isJefe && orderModalType === "ingresos" && (
        <JefeOrderModalShell
          id="jefe-modal-ingresos"
          title="Registrar entrada"
          description="Generar orden de ingreso"
          accent="emerald"
          icon={<FiArchive className="h-6 w-6" strokeWidth={2} />}
          onClose={() => setOrderModalType(null)}
          footer={
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
              <button type="button" onClick={() => setOrderModalType(null)} className={jefeBtnGhost}>
                Cancelar
              </button>
              <button
                type="button"
                disabled={
                  availableInboundForOrders.length === 0 ||
                  availableBodegaTargets.length === 0
                }
                onClick={() =>
                  handleCreateOrder({
                    destination: "a_bodega",
                    sourceZone: "ingresos",
                    sourcePosition: ingresoOrderSourcePosition,
                    targetPosition: ingresoOrderTargetPosition,
                  })
                }
                className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-md transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 sm:w-auto disabled:pointer-events-none disabled:opacity-45 ${jefeModalAccentClass.emerald.primary} ${jefeModalAccentClass.emerald.primaryHover}`}
              >
                Crear ingreso
              </button>
            </div>
          }
        >
          <JefeModalField label="Origen" icon={<FiMapPin className="h-4 w-4" />}>
            <input value="Ingresos" readOnly className={jefeReadonlyClass} tabIndex={-1} />
          </JefeModalField>
          <JefeModalField
            label="Caja en ingresos"
            icon={<FiPackage className="h-4 w-4" />}
            hint="Solo aparecen cajas que aún no tienen una orden pendiente hacia bodega."
          >
            <JefeOrderPickerTrigger
              accent="emerald"
              value={ingresoCajaDisplayText}
              placeholder={
                availableInboundForOrders.length === 0
                  ? "Sin cajas disponibles"
                  : "Tocá o usá la lupa para elegir caja…"
              }
              onOpen={() => {
                setIngresoCajaSearch("");
                setJefeInteractivePicker({ flow: "ingreso", step: "caja" });
              }}
              disabled={availableInboundForOrders.length === 0}
              aria-label="Elegir caja en ingresos"
            />
            {availableInboundForOrders.length === 0 ? (
              <JefeModalEmptyHint>
                No hay cajas en ingreso. Cuando el custodio registre mercancía, vas a poder elegirla acá.
              </JefeModalEmptyHint>
            ) : null}
          </JefeModalField>
          <JefeModalField
            label="Posición en bodega"
            icon={<FiGrid className="h-4 w-4" />}
            hint="El operario ubicará la caja en el casillero que elijas."
          >
            <JefeOrderPickerTrigger
              accent="emerald"
              value={
                availableBodegaTargets.length === 0 ? "" : `Casillero ${ingresoOrderTargetPosition}`
              }
              placeholder={
                availableBodegaTargets.length === 0
                  ? "Sin posiciones libres"
                  : "Tocá o usá la lupa para elegir casillero…"
              }
              onOpen={() => setJefeInteractivePicker({ flow: "ingreso", step: "posicion" })}
              disabled={availableBodegaTargets.length === 0}
              aria-label="Elegir posición en bodega"
            />
            {availableBodegaTargets.length === 0 ? (
              <JefeModalEmptyHint>
                El mapa está lleno o no hay cupos libres. Liberá una posición o revisá la capacidad de la bodega.
              </JefeModalEmptyHint>
            ) : null}
          </JefeModalField>
        </JefeOrderModalShell>
      )}
      {isJefe && orderModalType === "bodega" && (
        <>
        <JefeOrderModalShell
          id="jefe-modal-bodega"
          title="Transferir cajas"
          description="Mové mercancía de un casillero a otro dentro del almacenamiento."
          accent="blue"
          icon={<FiRepeat className="h-6 w-6" strokeWidth={2} />}
          onClose={() => setOrderModalType(null)}
          footer={
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
              <button type="button" onClick={() => setOrderModalType(null)} className={jefeBtnGhost}>
                Cancelar
              </button>
              <button
                type="button"
                disabled={
                  (trasladoBodegaOrigenTipo === "bodega" &&
                    (availableBodegaTargets.length === 0 || availableBodegaForOrders.length === 0)) ||
                  (trasladoBodegaOrigenTipo === "procesamiento" &&
                    (trasladoProcOpciones.length === 0 ||
                      !trasladoProcesamientoKey ||
                      (trasladoSeleccionado?.kind === "procesado" &&
                        (availableBodegaTargets.length === 0 ||
                          !bodegaOrderTargetPosition ||
                          !availableBodegaTargets.includes(bodegaOrderTargetPosition)))))
                }
                onClick={() => {
                  if (trasladoBodegaOrigenTipo === "bodega") {
                    handleCreateOrder({
                      destination: "a_bodega",
                      sourceZone: "bodega",
                      sourcePosition: bodegaOrderSourcePosition,
                      targetPosition: bodegaOrderTargetPosition,
                    });
                  } else {
                    const opt = trasladoSeleccionado;
                    if (!opt) return;
                    const row = opt.row;
                    if (opt.kind === "desperdicio") {
                      const sk = Number(row.sobranteKg) || 0;
                      handleCreateOrder({
                        destination: "a_bodega",
                        sourceZone: "procesamiento",
                        sourcePosition: 0,
                        procesamientoOrigen: {
                          cuentaClientId: row.clientId,
                          solicitudId: row.id,
                          numero: row.numero,
                          productoPrimarioTitulo: row.productoPrimarioTitulo,
                          productoSecundarioTitulo: row.productoSecundarioTitulo,
                          productoPrimarioId: row.productoPrimarioId,
                          cantidadPrimario: row.cantidadPrimario,
                          unidadPrimarioVisualizacion: "peso",
                          estimadoUnidadesSecundario:
                            typeof row.estimadoUnidadesSecundario === "number" &&
                            Number.isFinite(row.estimadoUnidadesSecundario)
                              ? row.estimadoUnidadesSecundario
                              : row.estimadoUnidadesSecundario === null
                                ? null
                                : undefined,
                          rolDevolucion: "desperdicio",
                          sobranteKg: sk,
                        },
                      });
                      return;
                    }
                    const uv = row.unidadPrimarioVisualizacion;
                    handleCreateOrder({
                      destination: "a_bodega",
                      sourceZone: "procesamiento",
                      sourcePosition: 0,
                      targetPosition: bodegaOrderTargetPosition,
                      procesamientoOrigen: {
                        cuentaClientId: row.clientId,
                        solicitudId: row.id,
                        numero: row.numero,
                        productoPrimarioTitulo: row.productoPrimarioTitulo,
                        productoSecundarioTitulo: row.productoSecundarioTitulo,
                        productoPrimarioId: row.productoPrimarioId,
                        cantidadPrimario: row.cantidadPrimario,
                        unidadPrimarioVisualizacion:
                          uv === "peso" || uv === "cantidad" ? uv : undefined,
                        estimadoUnidadesSecundario:
                          typeof row.estimadoUnidadesSecundario === "number" &&
                          Number.isFinite(row.estimadoUnidadesSecundario)
                            ? row.estimadoUnidadesSecundario
                            : row.estimadoUnidadesSecundario === null
                              ? null
                              : undefined,
                        rolDevolucion: "procesado",
                      },
                    });
                  }
                }}
                className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-md transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 sm:w-auto disabled:pointer-events-none disabled:opacity-45 ${jefeModalAccentClass.blue.primary} ${jefeModalAccentClass.blue.primaryHover}`}
              >
                Crear orden
              </button>
            </div>
          }
        >
          <JefeModalField label="Destino de la orden" icon={<FiMapPin className="h-4 w-4" />}>
            <input
              readOnly
              value="Bodega (mapa interno)"
              className={`${jefeReadonlyClass} cursor-not-allowed opacity-90`}
              tabIndex={-1}
              aria-label="Destino de la orden"
            />
          </JefeModalField>
          <JefeModalField label="Origen" icon={<FiBox className="h-4 w-4" />}>
            <JefeOrderPickerTrigger
              accent="blue"
              value={
                trasladoBodegaOrigenTipo === "bodega"
                  ? "Bodega (casillero ocupado)"
                  : "Procesamiento (solo órdenes terminadas)"
              }
              placeholder="Tocá o usá la lupa para elegir origen…"
              onOpen={() => setJefeInteractivePicker({ flow: "traslado", step: "origen" })}
              aria-label="Elegir origen del traslado"
            />
          </JefeModalField>
          {trasladoBodegaOrigenTipo === "bodega" ? (
            <JefeModalField
              label="Caja en bodega"
              icon={<FiPackage className="h-4 w-4" />}
              hint="Cajas ocupadas en el mapa que aún no tienen orden de traslado pendiente."
            >
              <JefeOrderPickerTrigger
                accent="blue"
                value={trasladoCajaDisplayText}
                placeholder={
                  availableBodegaForOrders.length === 0
                    ? "Sin cajas disponibles"
                    : "Tocá o usá la lupa para elegir caja…"
                }
                onOpen={() => {
                  setTrasladoCajaSearch("");
                  setJefeInteractivePicker({ flow: "traslado", step: "caja" });
                }}
                disabled={availableBodegaForOrders.length === 0}
                aria-label="Elegir caja en bodega"
              />
              {availableBodegaForOrders.length === 0 ? (
                <JefeModalEmptyHint>
                  No hay cajas disponibles para trasladar. Verificá el mapa o si ya hay órdenes pendientes.
                </JefeModalEmptyHint>
              ) : null}
            </JefeModalField>
          ) : (
            <JefeModalField
              label="Orden terminada (procesamiento)"
              icon={<FiCpu className="h-4 w-4" />}
              hint="Incluye devolver el procesado (secundario) a un casillero libre o reintegrar sobrante (kg fraccionarios del primario) al mapa."
            >
              <JefeOrderPickerTrigger
                accent="blue"
                value={trasladoProcesamientoDisplayText}
                placeholder={
                  trasladoProcOpciones.length === 0
                    ? "Sin traslados pendientes"
                    : "Tocá o usá la lupa para elegir orden…"
                }
                onOpen={() => {
                  setTrasladoProcSearch("");
                  setJefeInteractivePicker({ flow: "traslado", step: "procesamiento" });
                }}
                disabled={trasladoProcOpciones.length === 0}
                aria-label="Elegir orden de procesamiento terminada"
              />
              {trasladoProcOpciones.length === 0 ? (
                <JefeModalEmptyHint>
                  No hay traslados pendientes (procesado o sobrante), o ya hay una orden creada para esa solicitud.
                </JefeModalEmptyHint>
              ) : null}
              {trasladoSeleccionado ? (
                <p className="mt-2 rounded-xl border border-sky-100 bg-sky-50/90 px-3 py-2 text-xs leading-snug text-sky-950">
                  {trasladoSeleccionado.kind === "desperdicio" ? (
                    <>
                      <span className="font-semibold">Sobrante (kg):</span> al crear la orden, los kg se{" "}
                      <strong>suman automáticamente</strong> al <strong>mismo casillero</strong> donde está el producto
                      primario en el mapa (la app busca la misma posición que usó el inventario al sacar material a
                      proceso). <span className="text-sky-800/90">No elegís casillero.</span> La{" "}
                      <strong>merma</strong> no se devuelve: queda solo en el reporte.
                    </>
                  ) : (
                    <>
                      <span className="font-semibold">Producto procesado (secundario):</span> elegí un{" "}
                      <strong>casillero libre</strong> abajo; es el destino del resultado del procesamiento, no del
                      sobrante.
                    </>
                  )}
                </p>
              ) : trasladoProcOpciones.length > 0 ? (
                <p className="mt-2 text-xs text-slate-500">
                  En la lista hay hasta <strong>dos filas</strong> por la misma orden si falta devolver ambas cosas:
                  una para <strong>sobrante</strong> (kg fraccionarios al primario) y otra para el{" "}
                  <strong>procesado</strong> (casillero libre).
                </p>
              ) : null}
            </JefeModalField>
          )}
          {trasladoBodegaOrigenTipo === "procesamiento" && trasladoSeleccionado?.kind === "desperdicio" ? (
            <JefeModalField label="Destino en mapa" icon={<FiGrid className="h-4 w-4" />}>
              <input
                readOnly
                value="Automático: casillero del producto primario (misma coincidencia que el inventario)"
                className={`${jefeReadonlyClass} cursor-not-allowed opacity-90`}
                tabIndex={-1}
                aria-label="Destino del sobrante"
              />
            </JefeModalField>
          ) : (
          <JefeModalField label="Nueva posición" icon={<FiGrid className="h-4 w-4" />}>
            <JefeOrderPickerTrigger
              accent="blue"
              value={
                availableBodegaTargets.length === 0 ? "" : `Casillero ${bodegaOrderTargetPosition}`
              }
              placeholder={
                availableBodegaTargets.length === 0
                  ? "Sin posiciones libres"
                  : "Tocá o usá la lupa para elegir casillero…"
              }
              onOpen={() => setJefeInteractivePicker({ flow: "traslado", step: "posicion" })}
              disabled={availableBodegaTargets.length === 0}
              aria-label="Elegir casillero de destino"
            />
            {availableBodegaTargets.length === 0 ? (
              <JefeModalEmptyHint>
                No quedan casilleros libres. Liberá uno antes de crear la orden de traslado.
              </JefeModalEmptyHint>
            ) : null}
          </JefeModalField>
          )}
        </JefeOrderModalShell>
        </>
      )}
      {isJefe && orderModalType === "revisar" && (
        <JefeOrderModalShell
          id="jefe-modal-revisar"
          title="Consultar inventario"
          description="Elegí una caja en ingreso, bodega o salida para que el operario la revise en detalle."
          accent="orange"
          icon={<FiSearch className="h-6 w-6" strokeWidth={2} />}
          onClose={() => setOrderModalType(null)}
          footer={
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
              <button type="button" onClick={() => setOrderModalType(null)} className={jefeBtnGhost}>
                Cancelar
              </button>
              <button
                type="button"
                disabled={
                  availableInboundForOrders.length === 0 &&
                  reviewBodegaList.length === 0 &&
                  outboundBoxes.length === 0
                }
                onClick={handleCreateReviewOrder}
                className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-md transition focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 sm:w-auto disabled:pointer-events-none disabled:opacity-45 ${jefeModalAccentClass.orange.primary} ${jefeModalAccentClass.orange.primaryHover}`}
              >
                Crear revisión
              </button>
            </div>
          }
        >
          <JefeModalField
            label="Caja a revisar"
            icon={<FiPackage className="h-4 w-4" />}
            hint="Las opciones se agrupan por zona para ubicarla más rápido."
          >
            <JefeOrderPickerTrigger
              accent="orange"
              value={revisarDisplayText}
              placeholder={
                availableInboundForOrders.length === 0 &&
                reviewBodegaList.length === 0 &&
                outboundBoxes.length === 0
                  ? "Sin cajas en el sistema"
                  : "Tocá o usá la lupa para elegir caja…"
              }
              onOpen={() => {
                setRevisarSearch("");
                setJefeInteractivePicker({ flow: "revisar", step: "caja" });
              }}
              disabled={
                availableInboundForOrders.length === 0 &&
                reviewBodegaList.length === 0 &&
                outboundBoxes.length === 0
              }
              aria-label="Elegir caja a revisar"
            />
            {availableInboundForOrders.length === 0 &&
            reviewBodegaList.length === 0 &&
            outboundBoxes.length === 0 ? (
              <JefeModalEmptyHint>
                No hay mercancía en ninguna zona todavía. Cuando existan cajas, vas a poder pedir una revisión acá.
              </JefeModalEmptyHint>
            ) : null}
          </JefeModalField>
        </JefeOrderModalShell>
      )}
      {isJefe && orderModalType === "salida" && (
        <JefeOrderModalShell
          id="jefe-modal-salida"
          title="Registrar salida"
          description="La caja pasará del almacenamiento a la zona de salida para preparar el despacho."
          accent="pink"
          icon={<FiBox className="h-6 w-6" strokeWidth={2} />}
          onClose={() => setOrderModalType(null)}
          footer={
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
              <button type="button" onClick={() => setOrderModalType(null)} className={jefeBtnGhost}>
                Cancelar
              </button>
              <button
                type="button"
                disabled={availableBodegaForOrders.length === 0}
                onClick={() =>
                  handleCreateOrder({
                    destination: "a_salida",
                    sourceZone: "bodega",
                    sourcePosition: salidaSourcePosition,
                  })
                }
                className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-md transition focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 focus-visible:ring-offset-2 sm:w-auto disabled:pointer-events-none disabled:opacity-45 ${jefeModalAccentClass.pink.primary} ${jefeModalAccentClass.pink.primaryHover}`}
              >
                Crear salida
              </button>
            </div>
          }
        >
          <JefeModalField label="Origen" icon={<FiMapPin className="h-4 w-4" />}>
            <input value="Bodega" readOnly className={jefeReadonlyClass} tabIndex={-1} />
          </JefeModalField>
          <JefeModalField
            label="Caja en bodega"
            icon={<FiPackage className="h-4 w-4" />}
            hint="Solo cajas del almacenamiento sin orden pendiente hacia salida."
          >
            <JefeOrderPickerTrigger
              accent="pink"
              value={salidaCajaDisplayText}
              placeholder={
                availableBodegaForOrders.length === 0
                  ? "Sin cajas disponibles"
                  : "Tocá o usá la lupa para elegir caja…"
              }
              onOpen={() => {
                setSalidaCajaSearch("");
                setJefeInteractivePicker({ flow: "salida", step: "caja" });
              }}
              disabled={availableBodegaForOrders.length === 0}
              aria-label="Elegir caja para salida"
            />
            {availableBodegaForOrders.length === 0 ? (
              <JefeModalEmptyHint>
                No hay cajas en bodega para enviar a salida, o ya tienen una orden asignada.
              </JefeModalEmptyHint>
            ) : null}
          </JefeModalField>
          <JefeModalField
            label="Posición en salida"
            icon={<FiGrid className="h-4 w-4" />}
            hint="Cupos en la columna de salida; se asigna automáticamente según disponibilidad."
          >
            <input
              value={salidaTargetPosition}
              type="number"
              readOnly
              className={`${jefeReadonlyClass} tabular-nums`}
              tabIndex={-1}
            />
          </JefeModalField>
        </JefeOrderModalShell>
      )}
      {jefeInteractivePicker ? (
        <JefeNestedPickerShell
          accent={jefePickerAccent(jefeInteractivePicker)}
          title={jefePickerTitle(jefeInteractivePicker)}
          onClose={() => setJefeInteractivePicker(null)}
        >
          {jefeInteractivePicker.flow === "traslado" && jefeInteractivePicker.step === "origen" ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-slate-600">
                Tocá una opción para definir si el traslado sale de un casillero ocupado o de procesamiento.
              </p>
              <button
                type="button"
                onClick={() => {
                  setTrasladoBodegaOrigenTipo("bodega");
                  setJefeInteractivePicker(null);
                }}
                className={`rounded-2xl border-2 p-4 text-left transition ${
                  trasladoBodegaOrigenTipo === "bodega"
                    ? "border-blue-600 bg-blue-50 shadow-sm"
                    : "border-slate-200 hover:border-blue-300 hover:bg-slate-50/80"
                }`}
              >
                <p className="font-semibold text-slate-900">Bodega (casillero ocupado)</p>
                <p className="mt-1 text-sm text-slate-600">
                  Mové una caja que ya está en el mapa interno de la bodega.
                </p>
              </button>
              <button
                type="button"
                onClick={() => {
                  setTrasladoBodegaOrigenTipo("procesamiento");
                  setJefeInteractivePicker(null);
                }}
                className={`rounded-2xl border-2 p-4 text-left transition ${
                  trasladoBodegaOrigenTipo === "procesamiento"
                    ? "border-blue-600 bg-blue-50 shadow-sm"
                    : "border-slate-200 hover:border-blue-300 hover:bg-slate-50/80"
                }`}
              >
                <p className="font-semibold text-slate-900">Procesamiento (solo órdenes terminadas)</p>
                <p className="mt-1 text-sm text-slate-600">
                  Devolvé al mapa el resultado de una solicitud ya terminada.
                </p>
              </button>
            </div>
          ) : null}
          {jefeInteractivePicker.flow === "traslado" && jefeInteractivePicker.step === "caja" ? (
            <div className="flex flex-col gap-3">
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Buscar
              </label>
              <input
                type="search"
                value={trasladoCajaSearch}
                onChange={(e) => setTrasladoCajaSearch(e.target.value)}
                placeholder="Casillero, nombre, id o cliente…"
                className={`w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm ${jefeModalAccentClass.blue.selectFocus}`}
                autoComplete="off"
              />
              {trasladoCajasFiltradas.length === 0 ? (
                <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-4 text-center text-sm text-slate-600">
                  {availableBodegaForOrders.length === 0
                    ? "No hay cajas disponibles para trasladar."
                    : "Ninguna caja coincide con la búsqueda."}
                </p>
              ) : (
                <ul className="flex max-h-[min(44vh,360px)] flex-col gap-2 overflow-y-auto pr-0.5 [scrollbar-gutter:stable]">
                  {trasladoCajasFiltradas.map((box) => {
                    const selected = bodegaOrderSourcePosition === box.position;
                    return (
                      <li key={box.position}>
                        <button
                          type="button"
                          onClick={() => {
                            setBodegaOrderSourcePosition(box.position);
                            setJefeInteractivePicker(null);
                          }}
                          className={`w-full rounded-xl px-3 py-3 text-left text-sm transition ${jefePickerCardClass(selected, "blue")} ${
                            selected ? "" : "hover:border-blue-300 hover:bg-slate-50/90"
                          }`}
                        >
                          <span className="font-semibold text-slate-900">Casillero {box.position}</span>
                          <span className="mt-0.5 block text-slate-700">{box.name}</span>
                          <span className="mt-1 block font-mono text-xs text-slate-500">
                            {box.autoId} · {box.client || "—"}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ) : null}
          {jefeInteractivePicker.flow === "traslado" && jefeInteractivePicker.step === "posicion" ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-slate-600">
                Elegí un casillero libre del almacenamiento para el destino del traslado.
              </p>
              {availableBodegaTargets.length === 0 ? (
                <p className="rounded-xl border border-amber-200/80 bg-amber-50 px-3 py-4 text-center text-sm text-amber-950">
                  No hay posiciones libres en este momento.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {availableBodegaTargets.map((position) => {
                    const selected = bodegaOrderTargetPosition === position;
                    return (
                      <button
                        key={position}
                        type="button"
                        onClick={() => {
                          setBodegaOrderTargetPosition(position);
                          setJefeInteractivePicker(null);
                        }}
                        className={`rounded-xl px-2 py-3 text-center text-sm font-semibold transition ${
                          selected
                            ? "border-2 border-blue-600 bg-blue-50 text-blue-900"
                            : "border-2 border-slate-200 text-slate-800 hover:border-blue-300 hover:bg-slate-50"
                        }`}
                      >
                        Casillero {position}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}
          {jefeInteractivePicker.flow === "traslado" && jefeInteractivePicker.step === "procesamiento" ? (
            <div className="flex flex-col gap-3">
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Buscar
              </label>
              <input
                type="search"
                value={trasladoProcSearch}
                onChange={(e) => setTrasladoProcSearch(e.target.value)}
                placeholder="Número de orden, producto…"
                className={`w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm ${jefeModalAccentClass.blue.selectFocus}`}
                autoComplete="off"
              />
              {trasladoProcFiltradas.length === 0 ? (
                <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-4 text-center text-sm text-slate-600">
                  {trasladoProcOpciones.length === 0
                    ? "No hay órdenes terminadas con traslado pendiente."
                    : "Ninguna orden coincide con la búsqueda."}
                </p>
              ) : (
                <ul className="flex max-h-[min(44vh,360px)] flex-col gap-2 overflow-y-auto pr-0.5 [scrollbar-gutter:stable]">
                  {trasladoProcFiltradas.map((opt) => {
                    const { row, key, kind } = opt;
                    const prim = primarioCatalogoPorId(productosCatalogo, row.productoPrimarioId);
                    const qtyLine = cantidadPrimarioProcesamientoTexto(row, prim);
                    const selected = trasladoProcesamientoKey === key;
                    const sub =
                      kind === "desperdicio"
                        ? `Sobrante: ${kgSobranteParaDevolucionMapa(row).toLocaleString("es-CO", { maximumFractionDigits: 4 })} kg al primario en mapa`
                        : `Procesado (secundario) → casillero libre`;
                    return (
                      <li key={key}>
                        <button
                          type="button"
                          onClick={() => {
                            setTrasladoProcesamientoKey(key);
                            setJefeInteractivePicker(null);
                          }}
                          className={`w-full rounded-xl px-3 py-3 text-left text-sm transition ${jefePickerCardClass(selected, "blue")} ${
                            selected ? "" : "hover:border-blue-300 hover:bg-slate-50/90"
                          }`}
                        >
                          <span className="font-semibold text-slate-900">{row.numero}</span>
                          <span className="mt-0.5 block text-xs font-medium text-sky-800">{sub}</span>
                          <span className="mt-0.5 block text-slate-700">
                            {qtyLine} · {row.productoPrimarioTitulo}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ) : null}
          {jefeInteractivePicker.flow === "ingreso" && jefeInteractivePicker.step === "caja" ? (
            <div className="flex flex-col gap-3">
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Buscar
              </label>
              <input
                type="search"
                value={ingresoCajaSearch}
                onChange={(e) => setIngresoCajaSearch(e.target.value)}
                placeholder="Posición, nombre, id o cliente…"
                className={`w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm ${jefeModalAccentClass.emerald.selectFocus}`}
                autoComplete="off"
              />
              {ingresoCajasFiltradas.length === 0 ? (
                <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-4 text-center text-sm text-slate-600">
                  {availableInboundForOrders.length === 0
                    ? "No hay cajas en ingresos."
                    : "Ninguna caja coincide con la búsqueda."}
                </p>
              ) : (
                <ul className="flex max-h-[min(44vh,360px)] flex-col gap-2 overflow-y-auto pr-0.5 [scrollbar-gutter:stable]">
                  {ingresoCajasFiltradas.map((box) => {
                    const selected = ingresoOrderSourcePosition === box.position;
                    return (
                      <li key={box.position}>
                        <button
                          type="button"
                          onClick={() => {
                            setIngresoOrderSourcePosition(box.position);
                            setJefeInteractivePicker(null);
                          }}
                          className={`w-full rounded-xl px-3 py-3 text-left text-sm transition ${jefePickerCardClass(selected, "emerald")} ${
                            selected ? "" : "hover:border-emerald-300 hover:bg-slate-50/90"
                          }`}
                        >
                          <span className="font-semibold text-slate-900">Ingreso {box.position}</span>
                          <span className="mt-0.5 block text-slate-700">{box.name}</span>
                          <span className="mt-1 block font-mono text-xs text-slate-500">
                            {box.autoId} · {box.client || "—"}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ) : null}
          {jefeInteractivePicker.flow === "ingreso" && jefeInteractivePicker.step === "posicion" ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-slate-600">
                Elegí el casillero libre en bodega donde el operario ubicará la caja.
              </p>
              {availableBodegaTargets.length === 0 ? (
                <p className="rounded-xl border border-amber-200/80 bg-amber-50 px-3 py-4 text-center text-sm text-amber-950">
                  No hay posiciones libres en este momento.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {availableBodegaTargets.map((position) => {
                    const selected = ingresoOrderTargetPosition === position;
                    return (
                      <button
                        key={position}
                        type="button"
                        onClick={() => {
                          setIngresoOrderTargetPosition(position);
                          setJefeInteractivePicker(null);
                        }}
                        className={`rounded-xl px-2 py-3 text-center text-sm font-semibold transition ${
                          selected
                            ? "border-2 border-emerald-600 bg-emerald-50 text-emerald-900"
                            : "border-2 border-slate-200 text-slate-800 hover:border-emerald-300 hover:bg-slate-50"
                        }`}
                      >
                        Casillero {position}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}
          {jefeInteractivePicker.flow === "revisar" && jefeInteractivePicker.step === "caja" ? (
            <div className="flex flex-col gap-3">
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Buscar
              </label>
              <input
                type="search"
                value={revisarSearch}
                onChange={(e) => setRevisarSearch(e.target.value)}
                placeholder="Zona, casillero, nombre, id…"
                className={`w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm ${jefeModalAccentClass.orange.selectFocus}`}
                autoComplete="off"
              />
              {revisarFiltradas.length === 0 ? (
                <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-4 text-center text-sm text-slate-600">
                  {revisarRows.length === 0
                    ? "No hay cajas en el sistema."
                    : "Ninguna caja coincide con la búsqueda."}
                </p>
              ) : (
                <ul className="flex max-h-[min(44vh,360px)] flex-col gap-2 overflow-y-auto pr-0.5 [scrollbar-gutter:stable]">
                  {revisarFiltradas.map(({ zone, box }) => {
                    const selected = reviewSourcePosition === box.position;
                    return (
                      <li key={`${zone}-${box.position}-${box.autoId}`}>
                        <button
                          type="button"
                          onClick={() => {
                            setReviewSourcePosition(box.position);
                            setJefeInteractivePicker(null);
                          }}
                          className={`w-full rounded-xl px-3 py-3 text-left text-sm transition ${jefePickerCardClass(selected, "orange")} ${
                            selected ? "" : "hover:border-orange-300 hover:bg-slate-50/90"
                          }`}
                        >
                          <span className="inline-block rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-orange-900">
                            {zone}
                          </span>
                          <span className="mt-1 block font-semibold text-slate-900">
                            {zone} {box.position} — {box.name}
                          </span>
                          <span className="mt-1 block font-mono text-xs text-slate-500">
                            {box.autoId} · {box.client || "—"}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ) : null}
          {jefeInteractivePicker.flow === "salida" && jefeInteractivePicker.step === "caja" ? (
            <div className="flex flex-col gap-3">
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Buscar
              </label>
              <input
                type="search"
                value={salidaCajaSearch}
                onChange={(e) => setSalidaCajaSearch(e.target.value)}
                placeholder="Casillero, nombre, id o cliente…"
                className={`w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm ${jefeModalAccentClass.pink.selectFocus}`}
                autoComplete="off"
              />
              {salidaCajasFiltradas.length === 0 ? (
                <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-4 text-center text-sm text-slate-600">
                  {availableBodegaForOrders.length === 0
                    ? "No hay cajas disponibles."
                    : "Ninguna caja coincide con la búsqueda."}
                </p>
              ) : (
                <ul className="flex max-h-[min(44vh,360px)] flex-col gap-2 overflow-y-auto pr-0.5 [scrollbar-gutter:stable]">
                  {salidaCajasFiltradas.map((box) => {
                    const selected = salidaSourcePosition === box.position;
                    return (
                      <li key={box.position}>
                        <button
                          type="button"
                          onClick={() => {
                            setSalidaSourcePosition(box.position);
                            setJefeInteractivePicker(null);
                          }}
                          className={`w-full rounded-xl px-3 py-3 text-left text-sm transition ${jefePickerCardClass(selected, "pink")} ${
                            selected ? "" : "hover:border-pink-300 hover:bg-slate-50/90"
                          }`}
                        >
                          <span className="font-semibold text-slate-900">Casillero {box.position}</span>
                          <span className="mt-0.5 block text-slate-700">{box.name}</span>
                          <span className="mt-1 block font-mono text-xs text-slate-500">
                            {box.autoId} · {box.client || "—"}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ) : null}
        </JefeNestedPickerShell>
      ) : null}
      <AsignarProcesadorProcesamientoModal
        isOpen={modalAsignarProcesadorOpen}
        onClose={() => setModalAsignarProcesadorOpen(false)}
        clients={clients}
        warehouseCodeCuenta={warehouseCodeCuenta}
        slots={slots as Slot[]}
      />
    </section>
  );
}
