"use client";

import React, { useMemo, useState } from "react";
import {
  MdBarChart,
  MdMoveToInbox,
  MdLogout,
  MdInbox,
  MdLocalShipping,
  MdClose,
} from "react-icons/md";
import { IoAlert } from "react-icons/io5";
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
import { useBodegaHistory } from "@/app/components/BodegaDashboard/BodegaHistoryContext";
import type { Box, BodegaOrder, Slot } from "@/app/interfaces/bodega";

const ReportesPage: React.FC = () => {
  // 1. DATA SOURCE: Obtenemos el historial real del contexto
  const { ingresos, salidas, movimientosBodega, alertas } = useBodegaHistory();

  // 2. ESTADOS LOCALES
  const [activeClientId, setActiveClientId] = useState("cliente1");
  const [selectedBoxId, setSelectedBoxId] = useState("");
  const [viewMode, setViewMode] = useState<string | null>("reporte");
  const [reportDetailModal, setReportDetailModal] = useState<{
    type: "ingresos" | "salidas" | "movimientos" | "despachados" | "alertas";
  } | null>(null);

  // 3. DATOS DE SOPORTE INTERNOS (Arrays vacíos por defecto para evitar errores de undefined)
  const inboundBoxes: Box[] = [];
  const outboundBoxes: Box[] = [];
  const dispatchedBoxes: Box[] = [];
  const slots: Slot[] = [];

  const sortByPosition = <T extends { position: number }>(items: T[]) =>
    [...items].sort((a, b) => a.position - b.position);

  const clientOptions = ["cliente1", "cliente2", "cliente3"];

  // 4. LÓGICA DE FILTRADO
  const clientBoxes = useMemo(() => {
    if (!activeClientId) return [];
    const candidates = [...inboundBoxes, ...outboundBoxes, ...dispatchedBoxes, ...slots];
    const seen = new Set<string>();
    return candidates
      .filter((item) => item.client === activeClientId)
      .map((item) => ({
        value: item.autoId || `pos-${item.position}`,
        label: `${item.autoId ?? `Pos ${item.position}`}${item.name ? ` · ${item.name}` : ""}`,
      }))
      .filter((item) => {
        if (!item.value || seen.has(item.value)) return false;
        seen.add(item.value);
        return true;
      });
  }, [activeClientId, inboundBoxes, outboundBoxes, dispatchedBoxes, slots]);

  const clientAutoIds = useMemo(() => {
    const ids = new Set<string>();
    [inboundBoxes, outboundBoxes, dispatchedBoxes, slots].forEach((list) => {
      list.forEach((item) => {
        if (item.client === activeClientId && item.autoId) ids.add(item.autoId);
      });
    });
    return ids;
  }, [activeClientId, inboundBoxes, outboundBoxes, dispatchedBoxes, slots]);

  // 5. FILTRADO DE DATOS REALES
  const filteredIngresos = useMemo(() =>
    ingresos.filter(b => b.client === activeClientId), [ingresos, activeClientId]);

  const filteredSalidas = useMemo(() =>
    salidas.filter(o => o.client === activeClientId), [salidas, activeClientId]);

  const filteredMovimientos = useMemo(() =>
    movimientosBodega.filter(o => o.client === activeClientId), [movimientosBodega, activeClientId]);

  const filteredAlerts = useMemo(() => {
    return alertas.filter((alert) => {
      const haystack = `${alert.id} ${alert.description ?? ""} ${alert.meta ?? ""}`.toLowerCase();
      // Si no hay IDs de cliente específicos, mostramos todas (o ajusta según tu lógica)
      if (clientAutoIds.size === 0) return true;
      return Array.from(clientAutoIds).some(id => haystack.includes(id.toLowerCase()));
    });
  }, [alertas, clientAutoIds]);

  // 6. RECONSTRUCCIÓN DE DATA PARA GRÁFICAS
  const reportData = useMemo(() => [
    { name: "Ingresos", value: filteredIngresos.length, fill: "#10B981" },
    { name: "Salidas", value: filteredSalidas.length, fill: "#F43F5E" },
    { name: "Movimientos", value: filteredMovimientos.length, fill: "#3B82F6" },
    { name: "Despachados", value: dispatchedBoxes.filter(b => b.client === activeClientId).length, fill: "#64748B" },
    { name: "Alertas", value: filteredAlerts.length, fill: "#EF4444" },
  ], [filteredIngresos, filteredSalidas, filteredMovimientos, dispatchedBoxes, filteredAlerts, activeClientId]);

  const pieData = useMemo(() => reportData.filter((item) => item.value > 0), [reportData]);

  const renderPieLabel = ({ name, percent }: any) => `${name.substring(0, 4)} ${(percent * 100).toFixed(0)}%`;

  return (
    <div className="flex flex-col gap-6 w-full animate-fade-in p-4 bg-white">

      {/* ================= ENCABEZADO ================= */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Reportes</h2>
         
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200">
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl shadow-sm">
              <span className="text-[10px] font-black uppercase text-slate-400 border-r pr-2">Cliente</span>
              <select
                value={activeClientId}
                onChange={(e) => setActiveClientId(e.target.value)}
                className="bg-transparent text-sm font-bold text-slate-800 focus:outline-none min-w-[120px]"
              >
                {clientOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt.replace("cliente", "Cliente ")}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl shadow-sm">
              <span className="text-[10px] font-black uppercase text-slate-400 border-r pr-2">Caja</span>
              <select
                value={selectedBoxId}
                onChange={(e) => setSelectedBoxId(e.target.value)}
                className="bg-transparent text-sm font-bold text-slate-800 focus:outline-none min-w-[140px]"
              >
                <option value="">Seleccionar...</option>
                {clientBoxes.map((box) => (
                  <option key={box.value} value={box.value}>{box.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ================= GRÁFICAS ================= */}
      <div className="mt-6 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-3xl border border-slate-200 bg-linear-to-br from-slate-50 to-white p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <MdBarChart size={20} className="text-blue-500" /> Totales por tipo
            </h3>
            <span className="text-xs text-slate-400 font-bold uppercase">Barras</span>
          </div>
          <div className="flex-1 min-h-[220px]">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={reportData} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#64748b", fontWeight: 500 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#64748b", fontWeight: 500 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {reportData.map((entry, index) => <Cell key={index} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-linear-to-br from-slate-50 to-white p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Distribución
            </h3>
            <span className="text-xs text-slate-400 font-bold uppercase">Torta</span>
          </div>
          <div className="flex-1 min-h-[220px]">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Tooltip />
                {pieData.length > 0 && (
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    label={renderPieLabel}
                    labelLine={false}
                  >
                    {pieData.map((entry, index) => <Cell key={index} fill={entry.fill} />)}
                  </Pie>
                )}
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ================= BOTONES DE ACCIÓN (Métricas rápidas) ================= */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        <button
          onClick={() => setReportDetailModal({ type: "ingresos" })}
          className="rounded-2xl border border-slate-100 bg-white p-5 flex flex-col items-center hover:shadow-md transition w-full"
        >
          <MdInbox size={32} className="text-green-500 mb-2" />
          <span className="text-xs font-semibold uppercase text-slate-500">Ingresos</span>
          <span className="mt-1 text-2xl font-bold text-slate-900">{filteredIngresos.length}</span>
        </button>

        <button
          onClick={() => setReportDetailModal({ type: "salidas" })}
          className="rounded-2xl border border-slate-100 bg-white p-5 flex flex-col items-center hover:shadow-md transition w-full"
        >
          <MdLogout size={32} className="text-pink-500 mb-2" />
          <span className="text-xs font-semibold uppercase text-slate-500">Salidas</span>
          <span className="mt-1 text-2xl font-bold text-slate-900">{filteredSalidas.length}</span>
        </button>

        <button
          onClick={() => setReportDetailModal({ type: "movimientos" })}
          className="rounded-2xl border border-slate-100 bg-white p-5 flex flex-col items-center hover:shadow-md transition w-full"
        >
          <MdMoveToInbox size={32} className="text-blue-500 mb-2" />
          <span className="text-xs font-semibold uppercase text-slate-500">Movimientos</span>
          <span className="mt-1 text-2xl font-bold text-slate-900">{filteredMovimientos.length}</span>
        </button>

        <button
          onClick={() => setReportDetailModal({ type: "despachados" })}
          className="rounded-2xl border border-slate-100 bg-white p-5 flex flex-col items-center hover:shadow-md transition w-full"
        >
          <MdLocalShipping size={32} className="text-gray-500 mb-2" />
          <span className="text-xs font-semibold uppercase text-slate-500">Despachados</span>
          <span className="mt-1 text-2xl font-bold text-slate-900">0</span>
        </button>

        <button
          onClick={() => setReportDetailModal({ type: "alertas" })}
          className="rounded-2xl border border-slate-100 bg-white p-5 flex flex-col items-center hover:shadow-md transition w-full col-span-full md:col-span-4"
        >
          <IoAlert size={32} className="text-red-500 mb-2" />
          <span className="text-xs font-semibold uppercase text-slate-500">Alertas</span>
          <span className="mt-1 text-2xl font-bold text-slate-900">{filteredAlerts.length}</span>
        </button>
      </div>

    {/* ================= MODAL DE DETALLE CON ESTILO ORIGINAL ================= */}
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
            background: "linear-gradient(90deg, #e0f2fe 0%, #ffffff 100%)",
            }}
        >
            <span className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-blue-100 shadow mb-2">
            <MdBarChart size={32} className="text-blue-500" />
            </span>
            <h3 className="text-2xl font-extrabold text-blue-700 drop-shadow mb-1 tracking-tight text-center">
            {reportDetailModal.type === "ingresos" ? "Detalle de ingresos" :
            reportDetailModal.type === "salidas" ? "Detalle de salidas" :
            reportDetailModal.type === "movimientos" ? "Detalle de movimientos a bodega" :
            reportDetailModal.type === "alertas" ? "Detalle de alertas" : "Detalle de despachados"}
            </h3>
            <button 
            onClick={() => setReportDetailModal(null)} 
            className="absolute top-4 right-4 text-slate-400 hover:text-blue-500 transition-colors"
            >
            <MdClose size={28} />
            </button>
        </div>

        {/* Cuerpo del modal con fondo semitransparente y scroll personalizado */}
        <div 
            className="max-h-[60vh] overflow-y-auto px-8 py-6 flex flex-col items-center" 
            style={{ background: "rgba(255,255,255,0.88)" }}
        >
            <div className="w-full">
            {/* Aquí va el contenido dinámico (ul/li) según el tipo de modal */}
            </div>
        </div>
        </div>
    </div>
)}
      
      
    </div>
  );
};

export default ReportesPage;