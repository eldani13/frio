import React from "react";
import ProvidersPage from "@/app/proveedores/page"; 
import PlantasPage from "@/app/plantas/page"; 
import CompradoresPage from "@/app/compradores/page"; 
import CatalogosPage from "@/app/catalogos/page"; 
import CamionesPage from "@/app/camiones/page"; 
import {
  MdBarChart,
  MdMoveToInbox,
  MdLogout,
  MdInbox,
  MdLocalShipping,
  MdClose,
  MdAdd,
  MdEdit,
  MdDelete,
  MdBusiness, 
  MdFactory,    
  MdShoppingCart, 
  
} from "react-icons/md";
import { BiBarChartAlt2, BiCollection, BiUserCheck } from "react-icons/bi";
import { FiUsers } from "react-icons/fi";
import { useBodegaHistory } from "./BodegaHistoryContext";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../../lib/firebaseClient";
import { DEFAULT_WAREHOUSE_ID } from "../../../lib/bodegaCloudState";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Box, BodegaOrder, Slot } from "../../interfaces/bodega";
import { IoAlert } from "react-icons/io5";
import { HiOutlineArrowRight,HiOutlineTruck } from "react-icons/hi2";
interface ReportesSectionProps {
  reportData: Array<{ name: string; value: number; fill: string }>;
  inboundBoxes: Box[];
  outboundBoxes: Box[];
  dispatchedBoxes: Box[];
  orders: BodegaOrder[];
  slots: Slot[];
  sortByPosition: <T extends { position: number }>(items: T[]) => T[];
  reportDetailModal: {
    type: "ingresos" | "salidas" | "movimientos" | "despachados" | "alertas";
  } | null;
  setReportDetailModal: (
    modal: {
      type: "ingresos" | "salidas" | "movimientos" | "despachados" | "alertas";
    } | null,
  ) => void;
  isCliente?: boolean;
  clientId?: string;
  clientFilterId?: string;
  onClientChange?: (id: string) => void;
  /** Incrementado desde el Header (cliente) para volver al submenú de vistas */
  menuResetNonce?: number;
}

const ReportesSection: React.FC<ReportesSectionProps> = ({
  reportData,
  inboundBoxes,
  outboundBoxes,
  dispatchedBoxes,
  orders,
  slots,
  sortByPosition,
  reportDetailModal,
  setReportDetailModal,
  isCliente = false,
  clientId,
  clientFilterId,
  onClientChange,
  menuResetNonce,
}) => {
  const { ingresos, salidas, movimientosBodega, alertas } = useBodegaHistory();

  const [viewMode, setViewMode] = React.useState<"reporte" | "catalogo" |
   "proveedores" | "plantas" | "compradores" | "asignarBodegas" | "camiones"  | null>(
    isCliente ? null : "reporte",
  );
  const [selectedBoxId, setSelectedBoxId] = React.useState<string>("");
  const [boxHistoryModalOpen, setBoxHistoryModalOpen] = React.useState(false);  
  const [editingItemId, setEditingItemId] = React.useState<string | null>(null);
  const warehouseId = DEFAULT_WAREHOUSE_ID;
  const boxHistoryContentRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    setViewMode(isCliente ? null : "reporte");
    setSelectedBoxId("");
    setBoxHistoryModalOpen(false);
  }, [isCliente]);

  const prevMenuNonce = React.useRef<number | null>(null);
  React.useEffect(() => {
    if (!isCliente || menuResetNonce === undefined) return;
    if (prevMenuNonce.current === null) {
      prevMenuNonce.current = menuResetNonce;
      return;
    }
    if (prevMenuNonce.current === menuResetNonce) return;
    prevMenuNonce.current = menuResetNonce;
    setViewMode(null);
    setSelectedBoxId("");
    setBoxHistoryModalOpen(false);
    setReportDetailModal(null);
  }, [isCliente, menuResetNonce, setReportDetailModal]);

  
  const activeClientId = isCliente ? clientFilterId || clientId : clientId;
  const clientOptions = ["cliente1", "cliente2", "cliente3"];

  const clientAutoIds = React.useMemo(() => {
    if (!isCliente || !activeClientId) return new Set<string>();
    const ids = new Set<string>();
    [inboundBoxes, outboundBoxes, dispatchedBoxes, slots].forEach((list) => {
      list.forEach((item) => {
        if (item.client === activeClientId && item.autoId) ids.add(item.autoId);
      });
    });
    return ids;
  }, [
    activeClientId,
    dispatchedBoxes,
    inboundBoxes,
    isCliente,
    outboundBoxes,
    slots,
  ]);

  const filterBoxes = (items: Box[]) =>
    isCliente && activeClientId
      ? items.filter((item) => item.client === activeClientId)
      : items;

  const clientBoxes = React.useMemo(() => {
    if (!isCliente || !activeClientId)
      return [] as Array<{ value: string; label: string }>;
    const candidates = [
      ...inboundBoxes,
      ...outboundBoxes,
      ...dispatchedBoxes,
      ...slots,
    ];
    const seen = new Set<string>();
    return candidates
      .filter((item) => item.client === activeClientId)
      .map((item) => {
        const value = item.autoId || `pos-${item.position}`;
        const label = `${item.autoId ?? `Pos ${item.position}`}${item.name ? ` · ${item.name}` : ""}`;
        return { value, label };
      })
      .filter((item) => {
        if (seen.has(item.value)) return false;
        seen.add(item.value);
        return true;
      });
  }, [
    activeClientId,
    dispatchedBoxes,
    inboundBoxes,
    isCliente,
    outboundBoxes,
    slots,
  ]);

  const selectedBoxInfo = React.useMemo(() => {
    if (!selectedBoxId) return null;
    if (selectedBoxId.startsWith("pos-")) {
      const pos = Number(selectedBoxId.replace("pos-", ""));
      return { position: Number.isNaN(pos) ? undefined : pos } as const;
    }
    return { autoId: selectedBoxId } as const;
  }, [selectedBoxId]);

  const handleExportPdf = async () => {
    if (!boxHistoryModalOpen || !boxHistoryContentRef.current) return;
    if (typeof window === "undefined") return;

    const sanitizeColors = (root: HTMLElement) => {
      const snapshots: Array<{ el: HTMLElement; styleAttr: string | null }> =
        [];
      const hasUnsupported = (value?: string | null) =>
        Boolean(
          value &&
          (value.includes("lab(") ||
            value.includes("oklab") ||
            value.includes("color(")),
        );

      const apply = (el: HTMLElement) => {
        snapshots.push({ el, styleAttr: el.getAttribute("style") });
        const cs = window.getComputedStyle(el);

        // Force safe colors if any unsupported functions appear
        if (
          hasUnsupported(cs.backgroundImage) ||
          cs.backgroundImage !== "none"
        ) {
          el.style.backgroundImage = "none";
        }
        if (hasUnsupported(cs.backgroundColor)) {
          el.style.backgroundColor = "rgba(255,255,255,1)";
        }
        if (hasUnsupported(cs.color)) {
          el.style.color = "rgba(15,23,42,1)";
        }
        if (hasUnsupported(cs.borderColor)) {
          el.style.borderColor = "rgba(219,234,254,1)";
        }
        if (hasUnsupported(cs.boxShadow)) {
          el.style.boxShadow = "none";
        }
        if (hasUnsupported(cs.textShadow)) {
          el.style.textShadow = "none";
        }
        // Also normalize outlines just in case
        if (hasUnsupported(cs.outlineColor)) {
          el.style.outlineColor = "transparent";
        }
      };

      apply(root);
      root.querySelectorAll<HTMLElement>("*").forEach(apply);

      return () => {
        snapshots.forEach(({ el, styleAttr }) => {
          if (styleAttr === null) el.removeAttribute("style");
          else el.setAttribute("style", styleAttr);
        });
      };
    };

    try {
      const [{ default: html2canvas }, jsPDFLib] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);

      const JsPDF = jsPDFLib.jsPDF || jsPDFLib.default;
      if (!JsPDF) {
        throw new Error("jsPDF no disponible");
      }

      const node = boxHistoryContentRef.current;
      const restoreColors = sanitizeColors(node);

      const canvas = await html2canvas(node, { scale: 2 });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new JsPDF({
        orientation: "p",
        unit: "px",
        format: [canvas.width, canvas.height],
      });
      pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
      pdf.save("historial-caja.pdf");

      restoreColors();
    } catch (error) {
      console.error("Error al exportar PDF", error);
      alert("No se pudo exportar el PDF. Reintenta o revisa la consola.");
    }
  };

  const orderMatchesClient = (order: BodegaOrder) => {
    if (!isCliente || !activeClientId) return true;
    if (order.client) return order.client === activeClientId;
    const findByZone = (
      zone: "ingresos" | "bodega" | "salida",
      position: number,
    ) => {
      if (zone === "ingresos")
        return inboundBoxes.find((b) => b.position === position);
      if (zone === "salida")
        return outboundBoxes.find((b) => b.position === position);
      return slots.find((s) => s.position === position);
    };
    const source = findByZone(order.sourceZone, order.sourcePosition);
    if (source?.client === activeClientId) return true;
    if (order.targetPosition) {
      const targetSlot = slots.find((s) => s.position === order.targetPosition);
      if (targetSlot?.client === activeClientId) return true;
      const targetOut = outboundBoxes.find(
        (b) => b.position === order.targetPosition,
      );
      if (targetOut?.client === activeClientId) return true;
    }
    return false;
  };

  const pieData = reportData.filter((item) => item.value > 0);
  const RADIAN = Math.PI / 180;
  const shortNames: Record<string, string> = {
    Ingresos: "Ing",
    Salidas: "Sal",
    "Movimientos a bodega": "Mov",
    Despachados: "Desp",
    Alertas: "Alertas",
  };

  const renderPieLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
    name,
  }: {
    cx: number;
    cy: number;
    midAngle: number;
    innerRadius: number;
    outerRadius: number;
    percent: number;
    name: string;
  }) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.65;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    const label = `${shortNames[name] ?? name} ${(percent * 100).toFixed(0)}%`;
    return (
      <text
        x={x}
        y={y}
        fill="#ffffff"
        stroke="#0f172a"
        strokeWidth={0.75}
        paintOrder="stroke"
        fontSize={11}
        fontWeight={700}
        textAnchor="middle"
        dominantBaseline="central"
      >
        {label}
      </text>
    );
  };

  // Para mantener compatibilidad, si el historial está vacío, usar los props locales
  const filteredIngresosHistory = filterBoxes(ingresos);
  const filteredSalidasHistory = isCliente
    ? salidas.filter(orderMatchesClient)
    : salidas;
  const filteredMovimientosHistory = isCliente
    ? movimientosBodega.filter(orderMatchesClient)
    : movimientosBodega;
  const filteredAlertHistory = isCliente
    ? alertas.filter((alert) => {
        if (!activeClientId || clientAutoIds.size === 0) return false;
        const haystack = `${alert.id} ${alert.description ?? ""} ${alert.meta ?? ""}`;
        for (const id of clientAutoIds) {
          if (haystack.includes(id)) return true;
        }
        return false;
      })
    : alertas;

  const globalIngresos =
    filteredIngresosHistory.length > 0 ? filteredIngresosHistory : inboundBoxes;
  const globalSalidas =
    filteredSalidasHistory.length > 0
      ? filteredSalidasHistory
      : orders.filter(
          (order) => order.type === "a_salida" && order.sourceZone === "bodega",
        );

  const alertHistory = filteredAlertHistory;

  type BoxEventType =
    | "ingreso"
    | "movimiento"
    | "revision"
    | "salida"
    | "despacho"
    | "alerta";
  type BoxTimelineItem = {
    type: BoxEventType;
    title: string;
    detail?: string;
    whenMs: number;
    whenLabel?: string;
  };

  const timelineTypeStyles: Record<
    BoxEventType,
    { label: string; color: string }
  > = {
    ingreso: { label: "Ingreso", color: "text-green-600" },
    movimiento: { label: "Movimiento", color: "text-blue-600" },
    revision: { label: "Revision", color: "text-amber-600" },
    salida: { label: "Salida", color: "text-rose-600" },
    despacho: { label: "Despacho", color: "text-teal-600" },
    alerta: { label: "Alerta", color: "text-red-600" },
  };

  const selectedBoxLabel = React.useMemo(
    () =>
      clientBoxes.find((item) => item.value === selectedBoxId)?.label ??
      selectedBoxId,
    [clientBoxes, selectedBoxId],
  );

  const boxTimeline = React.useMemo(() => {
    if (!selectedBoxInfo) return [] as BoxTimelineItem[];

    const events: BoxTimelineItem[] = [];

    const matchesBox = (autoId?: string, position?: number) => {
      if (selectedBoxInfo.autoId && autoId)
        return autoId === selectedBoxInfo.autoId;
      if (selectedBoxInfo.position !== undefined && position !== undefined)
        return position === selectedBoxInfo.position;
      if (selectedBoxInfo.autoId && position !== undefined)
        return `pos-${position}` === selectedBoxId;
      if (selectedBoxInfo.position !== undefined && autoId)
        return autoId === selectedBoxId;
      return false;
    };

    ingresos.forEach((box) => {
      if (!matchesBox(box.autoId, box.position)) return;
      events.push({
        type: "ingreso",
        title: `Ingreso en posición ${box.position}`,
        detail: `Temp: ${box.temperature} °C · Cliente: ${box.client || "—"}`,
        whenMs: -1,
        whenLabel: "Sin fecha",
      });
    });

    movimientosBodega.forEach((order) => {
      if (
        !matchesBox(order.autoId, order.targetPosition ?? order.sourcePosition)
      )
        return;
      const isRevision = order.type === "revisar";
      events.push({
        type: isRevision ? "revision" : "movimiento",
        title: isRevision
          ? "Revisión de caja"
          : `Movimiento ${order.sourceZone} ${order.sourcePosition} → ${order.targetPosition ?? "-"}`,
        detail: `Por: ${order.createdBy}`,
        whenMs: order.createdAtMs ?? 0,
        whenLabel: order.createdAt,
      });
    });

    salidas.forEach((order) => {
      if (
        !matchesBox(order.autoId, order.targetPosition ?? order.sourcePosition)
      )
        return;
      const isRevision = order.type === "revisar";
      events.push({
        type: isRevision ? "revision" : "salida",
        title: isRevision
          ? "Revisión de caja"
          : `Salida ${order.sourcePosition ?? "-"} → ${order.targetPosition ?? "-"}`,
        detail: `Por: ${order.createdBy}`,
        whenMs: order.createdAtMs ?? 0,
        whenLabel: order.createdAt,
      });
    });

    dispatchedBoxes.forEach((box) => {
      if (!matchesBox(box.autoId, box.position)) return;
      events.push({
        type: "despacho",
        title: `Despachado desde posición ${box.position}`,
        detail: `Cliente: ${box.client || "—"}`,
        whenMs: -1,
        whenLabel: "Sin fecha",
      });
    });

    alertHistory.forEach((alert) => {
      const haystack = `${alert.id} ${alert.title} ${alert.description ?? ""} ${alert.meta ?? ""}`;
      const matches = selectedBoxInfo.autoId
        ? haystack.includes(selectedBoxInfo.autoId)
        : selectedBoxInfo.position !== undefined
          ? haystack.includes(`pos-${selectedBoxInfo.position}`)
          : false;
      if (!matches) return;
      events.push({
        type: "alerta",
        title: alert.title,
        detail: alert.description,
        whenMs: alert.createdAtMs ?? 0,
        whenLabel: alert.createdAt,
      });
    });

    return events.sort((a, b) => (b.whenMs ?? -1) - (a.whenMs ?? -1));
  }, [
    alertHistory,
    dispatchedBoxes,
    ingresos,
    movimientosBodega,
    salidas,
    selectedBoxId,
    selectedBoxInfo,
  ]);

  if (isCliente && viewMode === null) {
    return (
      <section className="rounded-2xl bg-white p-8 shadow-sm border border-slate-200">
        
        <div className="flex flex-col items-center text-center gap-6 w-full px-4">
          
          {/* Contenedor principal ajustado a columna única */}
          <div className="flex flex-col w-full max-w-4xl gap-3">
            
            {/* Botón Reporte */}
            <button
              type="button"
              onClick={() => setViewMode("reporte")}
              className="group w-full rounded-2xl bg-[#b8d1f6] p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none flex items-center justify-between cursor-pointer active:scale-95"
            >
              <div className="flex items-center gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/50 text-slate-800 shadow-sm">
                  <BiBarChartAlt2 size={24} />
                </span>
                <p className="text-lg font-bold text-slate-900">Reporte</p>
              </div>
              <span className="h-8 w-8 flex items-center justify-center rounded-full bg-black/5 group-hover:bg-black/10 transition-colors">
                <HiOutlineArrowRight size={18} />
              </span>
            </button>

            {/* Botón Catálogo */}
            <button
              type="button"
              onClick={() => setViewMode("catalogo")}
              className="group w-full rounded-2xl bg-[#f8edb1] p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none flex items-center justify-between cursor-pointer active:scale-95"
            >
              <div className="flex items-center gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/50 text-slate-800 shadow-sm">
                  <BiCollection size={24} />
                </span>
                <p className="text-lg font-bold text-slate-900">Catálogo</p>
              </div>
              <span className="h-8 w-8 flex items-center justify-center rounded-full bg-black/5 group-hover:bg-black/10 transition-colors">
                <HiOutlineArrowRight size={18} />
              </span>
            </button>

            {/* Botón Asignar bodegas*/}
            <button
              type="button"
              onClick={() => setViewMode("asignarBodegas")}
              className="group w-full rounded-2xl bg-[#b0d6c3] p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none flex items-center justify-between cursor-pointer active:scale-95"
            >
              <div className="flex items-center gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/50 text-slate-800 shadow-sm">
                  <BiUserCheck size={24} />
                </span>
                <p className="text-lg font-bold text-slate-900">Asignar Bodegas</p>
              </div>
              <span className="h-8 w-8 flex items-center justify-center rounded-full bg-black/5 group-hover:bg-black/10 transition-colors">
                <HiOutlineArrowRight size={18} />
              </span>
            </button>

            {/* Botón Proveedores */}
            <button
              type="button"
              onClick={() => setViewMode("proveedores")}
              className="group w-full rounded-2xl bg-[#e2d5f3] p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none flex items-center justify-between cursor-pointer active:scale-95"
            >
              <div className="flex items-center gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/50 text-slate-800 shadow-sm">
                  <MdBusiness size={24} />
                </span>
                <p className="text-lg font-bold text-slate-900">Proveedores</p>
              </div>
              <span className="h-8 w-8 flex items-center justify-center rounded-full bg-black/5 group-hover:bg-black/10 transition-colors">
                <HiOutlineArrowRight size={18} />
              </span>
            </button>

            {/* Botón Plantas */}
            <button
            onClick={() => setViewMode("plantas")}
            className="group w-full rounded-2xl bg-[#e2d5f3] p-4 transition-all hover:-translate-y-0.5 hover:shadow-md flex items-center justify-between cursor-pointer active:scale-95"
          >
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/40 text-slate-800 shadow-sm">
                <MdFactory size={24} />
              </span>
              <p className="text-lg font-bold text-slate-900">Plantas</p>
            </div>
            <HiOutlineArrowRight size={20} className="text-slate-500 group-hover:translate-x-1 transition-transform" />
            </button>

            {/* Botón Compradores */}
            <button
              onClick={() => setViewMode("compradores")}
              className="group w-full rounded-2xl bg-[#d1f2fb] p-4 transition-all hover:-translate-y-0.5 hover:shadow-md flex items-center justify-between cursor-pointer active:scale-95"
            >
              <div className="flex items-center gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/40 text-slate-800 shadow-sm">
                  <MdShoppingCart size={24} />
                </span>
                <p className="text-lg font-bold text-slate-900">Compradores</p>
              </div>
              <HiOutlineArrowRight size={20} className="text-slate-500 group-hover:translate-x-1 transition-transform" />
            </button> 

            {/* Botón Camiones */}
            <button
              onClick={() => setViewMode("camiones")}
              className="group w-full rounded-2xl bg-[#d1f2fb] p-4 transition-all hover:-translate-y-0.5 hover:shadow-md flex items-center justify-between cursor-pointer active:scale-95"
            >
              <div className="flex items-center gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/40 text-slate-800 shadow-sm">
                  <HiOutlineTruck size={24} />
                </span>
                <p className="text-lg font-bold text-slate-900">Camiones</p>
              </div>
              <HiOutlineArrowRight size={20} className="text-slate-500 group-hover:translate-x-1 transition-transform" />
            </button>
          
          
          </div>
        </div>


      </section>
    );
  }

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Reportes</h2>
          <p className="mt-1 text-sm text-slate-600">
            Aqui podras consultar los reportes de la bodega.
          </p>
        </div>
        {isCliente ? (
          <div className="flex items-center gap-3">
            {viewMode !== null ? (
              <button
                type="button"
                onClick={() => {
                  setViewMode(null);
                  setSelectedBoxId("");
                  setBoxHistoryModalOpen(false);
                }}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100"
              >
                ← Elegir vista
              </button>
            ) : null}
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-2 shadow-inner">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Cliente
              </span>
              <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-1 shadow-sm ring-1 ring-slate-200">
                <select
                  value={activeClientId ?? "cliente1"}
                  onChange={(event) => {
                    onClientChange?.(event.target.value);
                    setSelectedBoxId("");
                    setBoxHistoryModalOpen(false);
                  }}
                  className="cursor-pointer bg-transparent text-sm font-semibold text-slate-800 focus:outline-none px-3 py-1 w-45 min-w-45 max-w-45 whitespace-nowrap"
                >
                  {clientOptions.map((option) => (
                    <option key={option} value={option}>
                      {option.replace("cliente", "Cliente ")}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedBoxId}
                  onChange={(event) => {
                    const value = event.target.value;
                    setSelectedBoxId(value);
                    setBoxHistoryModalOpen(Boolean(value));
                  }}
                  disabled={!activeClientId || clientBoxes.length === 0}
                  className="cursor-pointer bg-transparent text-sm font-semibold text-slate-800 focus:outline-none border-l border-slate-200 pl-4 pr-3 py-1 w-[180px] min-w-[180px] max-w-[180px] whitespace-nowrap"
                >
                  <option value="">Cajas</option>
                  {clientBoxes.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        ) : null}
      </div>


      {viewMode === "reporte" && (
        <>
          <div className="mt-6 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
            <div className="rounded-3xl border border-slate-200 bg-linear-to-br from-slate-50 to-white p-6 shadow-sm flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <MdBarChart size={20} className="text-blue-500" />
                  Totales por tipo
                </h3>
                <span className="text-xs text-slate-400">Barras</span>
              </div>
              <div className="flex-1 flex items-center justify-center">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={reportData} barSize={32}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#E5E7EB"
                    />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 13, fill: "#64748b", fontWeight: 500 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 13, fill: "#64748b", fontWeight: 500 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        background: "#fff",
                        border: "1px solid #e5e7eb",
                        color: "#334155",
                      }}
                      cursor={{ fill: "#6366f11a" }}
                    />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                      {reportData.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-linear-to-br from-slate-50 to-white p-6 shadow-sm flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <svg width="20" height="20" fill="none" viewBox="0 0 20 20">
                    <circle cx="10" cy="10" r="10" fill="#10B981" />
                    <path
                      d="M10 4v6l5 3"
                      stroke="#fff"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                  Distribución
                </h3>
                <span className="text-xs text-slate-400">Torta</span>
              </div>
              <div className="flex-1 flex items-center justify-center">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        background: "#fff",
                        border: "1px solid #e5e7eb",
                        color: "#334155",
                      }}
                    />
                    {pieData.length === 0 ? null : (
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={55}
                        outerRadius={90}
                        paddingAngle={3}
                        label={renderPieLabel}
                        labelLine={false}
                      >
                        {pieData.map((entry) => (
                          <Cell key={entry.name} fill={entry.fill} />
                        ))}
                      </Pie>
                    )}
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {boxHistoryModalOpen && selectedBoxInfo ? (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm animate-fade-in p-2 sm:p-4"
              role="dialog"
              aria-modal="true"
              onClick={() => setBoxHistoryModalOpen(false)}
              style={{ background: "rgba(0,0,0,0.1)" }}
            >
              <div
                className="w-full max-w-xl rounded-3xl shadow-2xl relative overflow-hidden animate-fade-in-up"
                onClick={(e) => e.stopPropagation()}
                style={{
                  fontFamily: '"Space Grotesk", "Work Sans", sans-serif',
                  background: "rgba(255,255,255,0.92)",
                  border: "1px solid #dbeafe",
                  backdropFilter: "blur(8px)",
                }}
                ref={boxHistoryContentRef}
              >
                <div
                  className="flex flex-col items-center justify-center pt-8 pb-4 px-8 border-b border-blue-100 rounded-t-3xl relative"
                  style={{
                    background:
                      "linear-gradient(90deg, #e0f2fe 0%, #ffffff 100%)",
                  }}
                >
                  <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 shadow mb-2">
                    <MdMoveToInbox size={26} className="text-blue-500" />
                  </span>
                  <h3 className="text-xl font-extrabold text-blue-700 drop-shadow mb-1 tracking-tight text-center">
                    Historial de caja
                  </h3>
                  <p className="text-sm text-slate-600 text-center">
                    {selectedBoxLabel || "Caja"}
                  </p>
                  <div className="absolute top-4 left-4 flex gap-2">
                    <button
                      type="button"
                      onClick={handleExportPdf}
                      className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
                    >
                      Exportar PDF
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBoxHistoryModalOpen(false)}
                    className="absolute top-4 right-4 text-slate-400 hover:text-blue-500 text-2xl font-bold focus:outline-none transition-colors"
                    aria-label="Cerrar"
                  >
                    <MdClose />
                  </button>
                </div>
                <div
                  className="max-h-[60vh] overflow-y-auto px-8 py-6 flex flex-col gap-3"
                  style={{ background: "rgba(255,255,255,0.88)" }}
                >
                  {boxTimeline.length === 0 ? (
                    <p className="text-base text-slate-500 text-center py-8">
                      No hay eventos registrados para esta caja.
                    </p>
                  ) : (
                    <ul className="w-full space-y-3">
                      {boxTimeline.map((item, idx) => {
                        const meta = timelineTypeStyles[item.type];
                        return (
                          <li
                            key={`${item.type}-${idx}-${item.whenMs}`}
                            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <span
                                className={`text-xs font-bold uppercase tracking-wide ${meta.color}`}
                              >
                                {meta.label}
                              </span>
                              <span className="text-xs text-slate-500">
                                {item.whenLabel ?? "Sin fecha"}
                              </span>
                            </div>
                            <p className="mt-1 text-sm font-semibold text-slate-900">
                              {item.title}
                            </p>
                            {item.detail ? (
                              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                                {item.detail}
                              </p>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          <div className="mt-8 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            <button
              type="button"
              onClick={() => setReportDetailModal({ type: "ingresos" })}
              className="rounded-2xl border border-slate-100 bg-white p-5 flex flex-col items-center hover:shadow-md transition w-full"
            >
              <MdInbox size={32} className="text-green-500 mb-2" />
              <span className="text-xs font-semibold uppercase text-slate-500">
                Ingresos
              </span>
              <span className="mt-1 text-2xl font-bold text-slate-900">
                {reportData.find((item) => item.name === "Ingresos")?.value ??
                  0}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setReportDetailModal({ type: "salidas" })}
              className="rounded-2xl border border-slate-100 bg-white p-5 flex flex-col items-center hover:shadow-md transition w-full"
            >
              <MdLogout size={32} className="text-pink-500 mb-2" />
              <span className="text-xs font-semibold uppercase text-slate-500">
                Salidas
              </span>
              <span className="mt-1 text-2xl font-bold text-slate-900">
                {reportData.find((item) => item.name === "Salidas")?.value ?? 0}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setReportDetailModal({ type: "movimientos" })}
              className="rounded-2xl border border-slate-100 bg-white p-5 flex flex-col items-center hover:shadow-md transition w-full"
            >
              <MdMoveToInbox size={32} className="text-blue-500 mb-2" />
              <span className="text-xs font-semibold uppercase text-slate-500">
                Movimientos a bodega
              </span>
              <span className="mt-1 text-2xl font-bold text-slate-900">
                {filteredMovimientosHistory.length > 0
                  ? filteredMovimientosHistory.length
                  : (reportData.find(
                      (item) => item.name === "Movimientos a bodega",
                    )?.value ?? 0)}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setReportDetailModal({ type: "despachados" })}
              className="rounded-2xl border border-slate-100 bg-white p-5 flex flex-col items-center hover:shadow-md transition w-full"
            >
              <MdLocalShipping size={32} className="text-gray-500 mb-2" />
              <span className="text-xs font-semibold uppercase text-slate-500">
                Despachados
              </span>
              <span className="mt-1 text-2xl font-bold text-slate-900">
                {reportData.find((item) => item.name === "Despachados")
                  ?.value ?? 0}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setReportDetailModal({ type: "alertas" })}
              className="rounded-2xl border border-slate-100 bg-white p-5 flex flex-col items-center hover:shadow-md transition w-full col-span-full md:col-span-4"
            >
              <IoAlert size={32} className="text-red-500 mb-2" />
              <span className="text-xs font-semibold uppercase text-slate-500">
                Alertas
              </span>
              <span className="mt-1 text-2xl font-bold text-slate-900">
                {reportData.find((item) => item.name === "Alertas")?.value ??
                  alertHistory.length}
              </span>
            </button>
          </div>

          {reportDetailModal && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm animate-fade-in p-2 sm:p-4"
              role="dialog"
              aria-modal="true"
              onClick={() => setReportDetailModal(null)}
              style={{ background: "rgba(0,0,0,0.1)" }}
            >
              <div
                className="w-full max-w-2xl rounded-3xl shadow-2xl relative overflow-hidden animate-fade-in-up"
                onClick={(e) => e.stopPropagation()}
                style={{
                  fontFamily: '"Space Grotesk", "Work Sans", sans-serif',
                  background: "rgba(255,255,255,0.92)",
                  border: "1px solid #dbeafe",
                  backdropFilter: "blur(8px)",
                }}
              >
                {/* Header con gradiente y botón cerrar flotante */}
                <div
                  className="flex flex-col items-center justify-center pt-8 pb-4 px-8 border-b border-blue-100 rounded-t-3xl relative"
                  style={{
                    background:
                      "linear-gradient(90deg, #e0f2fe 0%, #ffffff 100%)",
                  }}
                >
                  <span className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-blue-100 shadow mb-2">
                    <MdBarChart size={32} className="text-blue-500" />
                  </span>
                  <h3 className="text-2xl font-extrabold text-blue-700 drop-shadow mb-1 tracking-tight">
                    {reportDetailModal.type === "ingresos"
                      ? "Detalle de ingresos"
                      : reportDetailModal.type === "salidas"
                        ? "Detalle de salidas"
                        : reportDetailModal.type === "movimientos"
                          ? "Detalle de movimientos a bodega"
                          : reportDetailModal.type === "alertas"
                            ? "Detalle de alertas"
                            : "Detalle de despachados"}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setReportDetailModal(null)}
                    className="absolute top-4 right-4 text-slate-400 hover:text-blue-500 text-2xl font-bold focus:outline-none transition-colors"
                    aria-label="Cerrar"
                  >
                    <svg
                      width="28"
                      height="28"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M18 6 6 18"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
                {/* Lista de detalles */}
                <div
                  className="max-h-[60vh] overflow-y-auto px-8 py-6 flex flex-col items-center"
                  style={{ background: "rgba(255,255,255,0.88)" }}
                >
                  {reportDetailModal.type === "ingresos"
                    ? (() => {
                        if (globalIngresos.length === 0) {
                          return (
                            <p className="text-base text-slate-500 text-center py-8">
                              No hay ingresos registrados.
                            </p>
                          );
                        }
                        return (
                          <ul className="grid gap-3 md:grid-cols-2">
                            {sortByPosition(globalIngresos).map((box, idx) => (
                              <li
                                key={box.autoId || idx}
                                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col gap-1"
                              >
                                <span className="font-semibold text-indigo-600 text-sm mb-1">
                                  Ingreso {box.position}
                                </span>
                                <span className="text-slate-900 font-medium">
                                  {box.name}
                                </span>
                                <span className="text-xs text-slate-500">
                                  Cliente: {box.client || "—"}
                                </span>
                                <span className="text-xs text-slate-500">
                                  Temp: {box.temperature} °C
                                </span>
                                <span className="text-xs text-slate-400">
                                  ID: {box.autoId}
                                </span>
                              </li>
                            ))}
                          </ul>
                        );
                      })()
                    : reportDetailModal.type === "salidas"
                      ? (() => {
                          if (globalSalidas.length === 0) {
                            return (
                              <p className="text-base text-slate-500 text-center py-8">
                                No hay salidas registradas.
                              </p>
                            );
                          }
                          return (
                            <ul className="grid gap-3 md:grid-cols-2">
                              {globalSalidas.map((order) => {
                                const box =
                                  outboundBoxes.find(
                                    (b) => b.position === order.targetPosition,
                                  ) ||
                                  slots.find(
                                    (s) => s.position === order.targetPosition,
                                  ) ||
                                  slots.find(
                                    (s) => s.position === order.sourcePosition,
                                  );

                                const detailName =
                                  box?.name ?? order.boxName ?? "";
                                const detailClient =
                                  box?.client ?? order.client ?? "";
                                const detailAutoId =
                                  box?.autoId ?? order.autoId ?? "";
                                const detailTemp = box?.temperature;
                                return (
                                  <li
                                    key={order.id}
                                    className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col gap-1"
                                  >
                                    <span className="font-semibold text-rose-600 text-sm mb-1">
                                      Salida {order.targetPosition ?? "-"}
                                    </span>
                                    <span className="text-slate-900 font-medium">
                                      ID orden: {order.id}
                                    </span>
                                    <span className="text-xs text-slate-500">
                                      Por: {order.createdBy}
                                    </span>
                                    <span className="text-xs text-slate-500">
                                      Fecha: {order.createdAt}
                                    </span>
                                    <span className="text-xs text-slate-500">
                                      Origen: {order.sourcePosition ?? "-"}
                                    </span>
                                    <span className="text-xs text-slate-500">
                                      Destino: {order.targetPosition ?? "-"}
                                    </span>
                                    {detailName ||
                                    detailClient ||
                                    detailAutoId ? (
                                      <span className="text-xs text-slate-400">
                                        {detailName || "Caja"} | Cliente:{" "}
                                        {detailClient || "—"}
                                        {detailTemp !== undefined &&
                                        detailTemp !== null
                                          ? ` | Temp: ${detailTemp} °C`
                                          : ""}
                                        {detailAutoId
                                          ? ` | ID: ${detailAutoId}`
                                          : ""}
                                      </span>
                                    ) : (
                                      <span className="text-xs text-rose-500 font-bold">
                                        Detalles de caja no encontrados.
                                      </span>
                                    )}
                                  </li>
                                );
                              })}
                            </ul>
                          );
                        })()
                      : reportDetailModal.type === "movimientos"
                        ? (() => {
                            if (filteredMovimientosHistory.length === 0) {
                              return (
                                <p className="text-base text-slate-500 text-center py-8">
                                  No hay movimientos registrados.
                                </p>
                              );
                            }
                            return (
                              <ul className="grid gap-3 md:grid-cols-2">
                                {filteredMovimientosHistory.map((order) => {
                                  const box =
                                    slots.find(
                                      (s) =>
                                        s.position === order.targetPosition,
                                    ) ||
                                    slots.find(
                                      (s) =>
                                        s.position === order.sourcePosition,
                                    );

                                  const detailName =
                                    box?.name ?? order.boxName ?? "";
                                  const detailClient =
                                    box?.client ?? order.client ?? "";
                                  const detailAutoId =
                                    box?.autoId ?? order.autoId ?? "";
                                  const detailTemp = box?.temperature;
                                  return (
                                    <li
                                      key={order.id}
                                      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col gap-1"
                                    >
                                      <span className="font-semibold text-amber-600 text-sm mb-1">
                                        Movimiento a bodega{" "}
                                        {order.targetPosition ?? "-"}
                                      </span>
                                      <span className="text-slate-900 font-medium">
                                        ID orden: {order.id}
                                      </span>
                                      <span className="text-xs text-slate-500">
                                        Por: {order.createdBy}
                                      </span>
                                      <span className="text-xs text-slate-500">
                                        Fecha: {order.createdAt}
                                      </span>
                                      <span className="text-xs text-slate-500">
                                        Origen: {order.sourcePosition ?? "-"}
                                      </span>
                                      <span className="text-xs text-slate-500">
                                        Destino: {order.targetPosition ?? "-"}
                                      </span>
                                      {detailName ||
                                      detailClient ||
                                      detailAutoId ? (
                                        <span className="text-xs text-slate-400">
                                          {detailName || "Caja"} | Cliente:{" "}
                                          {detailClient || "—"}
                                          {detailTemp !== undefined &&
                                          detailTemp !== null
                                            ? ` | Temp: ${detailTemp} °C`
                                            : ""}
                                          {detailAutoId
                                            ? ` | ID: ${detailAutoId}`
                                            : ""}
                                        </span>
                                      ) : (
                                        <span className="text-xs text-rose-500 font-bold">
                                          Detalles de caja no encontrados.
                                        </span>
                                      )}
                                    </li>
                                  );
                                })}
                              </ul>
                            );
                          })()
                        : reportDetailModal.type === "alertas"
                          ? (() => {
                              if (alertHistory.length === 0) {
                                return (
                                  <p className="text-base text-slate-500 text-center py-8">
                                    No hay alertas registradas.
                                  </p>
                                );
                              }
                              const sorted = [...alertHistory].sort(
                                (a, b) => b.createdAtMs - a.createdAtMs,
                              );
                              return (
                                <ul className="grid gap-3 md:grid-cols-2 w-full">
                                  {sorted.map((alert) => (
                                    <li
                                      key={`${alert.id}-${alert.createdAtMs}`}
                                      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col gap-1"
                                    >
                                      <span className="font-semibold text-rose-600 text-sm mb-1">
                                        {alert.title}
                                      </span>
                                      <span className="text-slate-900 font-medium">
                                        {alert.description}
                                      </span>
                                      <span className="text-xs text-slate-500">
                                        Fecha: {alert.createdAt}
                                      </span>
                                      {alert.meta ? (
                                        <span className="text-xs text-slate-400">
                                          {alert.meta}
                                        </span>
                                      ) : null}
                                    </li>
                                  ))}
                                </ul>
                              );
                            })()
                          : (() => {
                              if (dispatchedBoxes.length === 0) {
                                return (
                                  <p className="text-base text-slate-500 text-center py-8">
                                    No hay despachados registrados.
                                  </p>
                                );
                              }
                              return (
                                <ul className="grid gap-3 md:grid-cols-2">
                                  {dispatchedBoxes.map((box, idx) => (
                                    <li
                                      key={box.autoId || idx}
                                      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col gap-1"
                                    >
                                      <span className="font-semibold text-green-600 text-sm mb-1">
                                        Despachado {box.position}
                                      </span>
                                      <span className="text-slate-900 font-medium">
                                        {box.name}
                                      </span>
                                      <span className="text-xs text-slate-500">
                                        Cliente: {box.client || "—"}
                                      </span>
                                      <span className="text-xs text-slate-500">
                                        Temp: {box.temperature} °C
                                      </span>
                                      <span className="text-xs text-slate-400">
                                        ID: {box.autoId}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              );
                            })()}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {viewMode === "catalogo" && (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 text-slate-700 shadow-sm">         
          <div className="text-sm text-slate-600">
          <CatalogosPage />
          </div>
        </div>
      )}

      {viewMode === "proveedores" && (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 text-slate-700 shadow-sm">       
          <div className="text-sm text-slate-600">
          <ProvidersPage />
          </div>
        </div>
      )}

      {viewMode === "plantas" && (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 text-slate-700 shadow-sm">          
          <div className="text-sm text-slate-600">
          <PlantasPage />
          </div>
        </div>
      )}

      {viewMode === "compradores" && (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 text-slate-700 shadow-sm">          
          <div className="text-sm text-slate-600">
          <CompradoresPage />
          </div>
        </div>
      )}
      
      {viewMode === "camiones" && (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 text-slate-700 shadow-sm">          
          <div className="text-sm text-slate-600">
          <CamionesPage />
          </div>
        </div>
      )}
      

    </section>
  );

  
};

export default ReportesSection;
