import React from "react";
import {
  MdBarChart,
  MdMoveToInbox,
  MdLogout,
  MdInbox,
  MdLocalShipping,
  MdClose,
} from "react-icons/md";
import { useBodegaHistory } from "./BodegaHistoryContext";
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
}) => {
  const { ingresos, salidas, movimientosBodega, alertas } = useBodegaHistory();

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
  const globalIngresos = ingresos.length > 0 ? ingresos : inboundBoxes;
  const globalSalidas =
    salidas.length > 0
      ? salidas
      : orders.filter(
          (order) => order.type === "a_salida" && order.sourceZone === "bodega",
        );

  const alertHistory = alertas;

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Reportes</h2>
      <p className="mt-1 text-sm text-slate-600">
        Aqui podras consultar los reportes de la bodega.
      </p>
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
            {reportData.find((item) => item.name === "Ingresos")?.value ?? 0}
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
            {movimientosBodega.length > 0
              ? movimientosBodega.length
              : (reportData.find((item) => item.name === "Movimientos a bodega")
                  ?.value ?? 0)}
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
            {reportData.find((item) => item.name === "Despachados")?.value ?? 0}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setReportDetailModal({ type: "alertas" })}
          className="rounded-2xl border border-slate-100 bg-white p-5 flex flex-col items-center hover:shadow-md transition w-full"
        >
          <IoAlert size={32} className="text-red-500 mb-2" />
          <span className="text-xs font-semibold uppercase text-slate-500">
            Alertas
          </span>
          <span className="mt-1 text-2xl font-bold text-slate-900">
            {reportData.find((item) => item.name === "Alertas")?.value ?? alertHistory.length}
          </span>
        </button>
      </div>
      {reportDetailModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/10 animate-fade-in p-2 sm:p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setReportDetailModal(null)}
        >
          <div
            className="w-full max-w-2xl rounded-3xl border border-blue-100 bg-white/90 shadow-2xl backdrop-blur-lg relative overflow-hidden animate-fade-in-up"
            onClick={(e) => e.stopPropagation()}
            style={{ fontFamily: '"Space Grotesk", "Work Sans", sans-serif' }}
          >
            {/* Header con gradiente y botón cerrar flotante */}
            <div className="flex flex-col items-center justify-center pt-8 pb-4 px-8 border-b border-blue-100 bg-linear-to-r from-blue-50 to-white rounded-t-3xl relative">
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
            <div className="max-h-[60vh] overflow-y-auto px-8 py-6 bg-white/80 flex flex-col items-center">
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
                                {box ? (
                                  <>
                                    <span className="text-xs text-slate-400">
                                      {box.name} | Temp: {box.temperature} °C |
                                      ID: {box.autoId}
                                    </span>
                                  </>
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
                        if (movimientosBodega.length === 0) {
                          return (
                            <p className="text-base text-slate-500 text-center py-8">
                              No hay movimientos registrados.
                            </p>
                          );
                        }
                        return (
                          <ul className="grid gap-3 md:grid-cols-2">
                            {movimientosBodega.map((order) => {
                              const box =
                                slots.find(
                                  (s) => s.position === order.targetPosition,
                                ) ||
                                slots.find(
                                  (s) => s.position === order.sourcePosition,
                                );
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
                                  {box ? (
                                    <>
                                      <span className="text-xs text-slate-400">
                                        {box.name} | Temp: {box.temperature} °C
                                        | ID: {box.autoId}
                                      </span>
                                    </>
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
                                    <span className="text-xs text-slate-400">{alert.meta}</span>
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
    </section>
  );
};

export default ReportesSection;
