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
import type { Box, BodegaOrder, Client, OrderSource, Slot } from "@/app/interfaces/bodega";
import { clientLabelFromList } from "@/app/lib/bodegaDisplay";

const TODOS_CLIENT_ID = "";

type Props = {
  inboundBoxes: Box[];
  outboundBoxes: Box[];
  dispatchedBoxes: Box[];
  slots: Slot[];
  clients: Client[];
  sortByPosition: <T extends { position: number }>(items: T[]) => T[];
};

function orderMatchesClient(
  order: BodegaOrder,
  clientId: string,
  inboundBoxes: Box[],
  outboundBoxes: Box[],
  slots: Slot[],
): boolean {
  if (!clientId) return true;
  if (order.client === clientId) return true;
  const findByZone = (zone: OrderSource, position: number) => {
    if (zone === "ingresos") return inboundBoxes.find((b) => b.position === position);
    if (zone === "salida") return outboundBoxes.find((b) => b.position === position);
    return slots.find((s) => s.position === position);
  };
  const source = findByZone(order.sourceZone, order.sourcePosition);
  if (source?.client === clientId) return true;
  if (order.targetPosition != null) {
    const targetSlot = slots.find((s) => s.position === order.targetPosition);
    if (targetSlot?.client === clientId) return true;
    const targetOut = outboundBoxes.find((b) => b.position === order.targetPosition);
    if (targetOut?.client === clientId) return true;
  }
  return false;
}

export default function AdminBodegaReportes({
  inboundBoxes,
  outboundBoxes,
  dispatchedBoxes,
  slots,
  clients,
  sortByPosition,
}: Props) {
  const { ingresos, salidas, movimientosBodega, alertas } = useBodegaHistory();

  const [activeClientId, setActiveClientId] = useState<string>(TODOS_CLIENT_ID);
  const [selectedBoxId, setSelectedBoxId] = useState("");
  const [reportDetailModal, setReportDetailModal] = useState<{
    type: "ingresos" | "salidas" | "movimientos" | "despachados" | "alertas";
  } | null>(null);

  const clientPickList = useMemo(
    () => clients.filter((c) => !c.disabled),
    [clients],
  );

  const filterBoxLike = <T extends { client?: string }>(list: T[]) => {
    if (!activeClientId) return list;
    return list.filter((item) => item.client === activeClientId);
  };

  const filteredIngresos = useMemo(
    () => filterBoxLike(ingresos),
    [ingresos, activeClientId],
  );

  const filteredSalidas = useMemo(
    () =>
      salidas.filter((o) =>
        orderMatchesClient(o, activeClientId, inboundBoxes, outboundBoxes, slots),
      ),
    [salidas, activeClientId, inboundBoxes, outboundBoxes, slots],
  );

  const filteredMovimientos = useMemo(
    () =>
      movimientosBodega.filter((o) =>
        orderMatchesClient(o, activeClientId, inboundBoxes, outboundBoxes, slots),
      ),
    [movimientosBodega, activeClientId, inboundBoxes, outboundBoxes, slots],
  );

  const dispatchedFiltered = useMemo(
    () => filterBoxLike(dispatchedBoxes),
    [dispatchedBoxes, activeClientId],
  );

  const clientAutoIds = useMemo(() => {
    const ids = new Set<string>();
    if (!activeClientId) return ids;
    [...inboundBoxes, ...outboundBoxes, ...dispatchedBoxes, ...slots].forEach((item) => {
      if (item.client === activeClientId && item.autoId) ids.add(item.autoId);
    });
    return ids;
  }, [activeClientId, inboundBoxes, outboundBoxes, dispatchedBoxes, slots]);

  const filteredAlerts = useMemo(() => {
    if (!activeClientId) return alertas;
    if (clientAutoIds.size === 0) return alertas;
    return alertas.filter((alert) => {
      const haystack = `${alert.id} ${alert.description ?? ""} ${alert.meta ?? ""}`.toLowerCase();
      return Array.from(clientAutoIds).some((id) => haystack.includes(id.toLowerCase()));
    });
  }, [alertas, activeClientId, clientAutoIds]);

  const clientBoxes = useMemo(() => {
    const candidates = [...inboundBoxes, ...outboundBoxes, ...dispatchedFiltered, ...slots];
    const seen = new Set<string>();
    return candidates
      .filter((item) => !activeClientId || item.client === activeClientId)
      .map((item) => ({
        value: item.autoId || `pos-${item.position}`,
        label: `${item.autoId ?? `Pos ${item.position}`}${item.name ? ` · ${item.name}` : ""}`,
      }))
      .filter((item) => {
        if (!item.value || seen.has(item.value)) return false;
        seen.add(item.value);
        return true;
      });
  }, [inboundBoxes, outboundBoxes, dispatchedFiltered, slots, activeClientId]);

  const reportData = useMemo(
    () => [
      { name: "Ingresos", value: filteredIngresos.length, fill: "#10B981" },
      { name: "Salidas", value: filteredSalidas.length, fill: "#F43F5E" },
      { name: "Movimientos", value: filteredMovimientos.length, fill: "#3B82F6" },
      { name: "Despachados", value: dispatchedFiltered.length, fill: "#64748B" },
      { name: "Alertas", value: filteredAlerts.length, fill: "#EF4444" },
    ],
    [
      filteredIngresos.length,
      filteredSalidas.length,
      filteredMovimientos.length,
      dispatchedFiltered.length,
      filteredAlerts.length,
    ],
  );

  const pieData = useMemo(() => reportData.filter((item) => item.value > 0), [reportData]);

  const renderPieLabel = ({ name, percent }: { name: string; percent: number }) =>
    `${name.substring(0, 4)} ${(percent * 100).toFixed(0)}%`;

  const zoneLabel = (z: OrderSource) =>
    z === "bodega" ? "Bodega" : z === "salida" ? "Salida" : "Ingreso";

  const formatOrderLine = (o: BodegaOrder) => {
    const target = o.targetPosition ?? "—";
    return `${o.type} · desde ${zoneLabel(o.sourceZone)} pos. ${o.sourcePosition}${
      o.targetPosition != null ? ` → ${target}` : ""
    } · ${new Date(o.createdAtMs).toLocaleString("es-CO")}`;
  };

  const modalRows = useMemo(() => {
    if (!reportDetailModal) return null;
    const t = reportDetailModal.type;
    if (t === "ingresos") {
      return sortByPosition([...filteredIngresos]).map((b) => ({
        key: `${b.position}-${b.autoId}`,
        line: (
          <span>
            <span className="font-semibold text-slate-900">{b.autoId || "—"}</span>
            {" · "}
            {b.name || "Sin nombre"}
            {" · pos. "}
            {b.position}
            {" · "}
            {clientLabelFromList(b.client, clients)}
          </span>
        ),
      }));
    }
    if (t === "salidas") {
      return filteredSalidas.map((o) => ({
        key: o.id,
        line: (
          <span>
            <span className="font-semibold text-slate-900">{formatOrderLine(o)}</span>
            {o.client ? (
              <>
                {" · "}
                {clientLabelFromList(o.client, clients)}
              </>
            ) : null}
          </span>
        ),
      }));
    }
    if (t === "movimientos") {
      return filteredMovimientos.map((o) => ({
        key: o.id,
        line: (
          <span>
            <span className="font-semibold text-slate-900">{formatOrderLine(o)}</span>
            {o.client ? (
              <>
                {" · "}
                {clientLabelFromList(o.client, clients)}
              </>
            ) : null}
          </span>
        ),
      }));
    }
    if (t === "despachados") {
      return sortByPosition([...dispatchedFiltered]).map((b) => ({
        key: `${b.position}-${b.autoId}`,
        line: (
          <span>
            <span className="font-semibold text-slate-900">{b.autoId || "—"}</span>
            {" · "}
            {b.name || "Sin nombre"}
            {" · "}
            {clientLabelFromList(b.client, clients)}
          </span>
        ),
      }));
    }
    return filteredAlerts.map((a) => ({
      key: a.id,
      line: (
        <span>
          <span className="font-semibold text-slate-900">{a.title}</span>
          {" · "}
          {a.description}
          {" · "}
          {new Date(a.createdAtMs).toLocaleString("es-CO")}
        </span>
      ),
    }));
  }, [
    reportDetailModal,
    filteredIngresos,
    filteredSalidas,
    filteredMovimientos,
    dispatchedFiltered,
    filteredAlerts,
    clients,
    sortByPosition,
  ]);

  return (
    <div className="flex w-full flex-col gap-6 bg-white p-4 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Reportes</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Actividad de la bodega seleccionada (historial y existencias en mapa).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-100/80 p-1.5">
            {/* <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-1.5 shadow-sm">
              <span className="border-r pr-2 text-[10px] font-black uppercase text-slate-400">
                Cliente
              </span>
              <select
                value={activeClientId}
                onChange={(e) => {
                  setActiveClientId(e.target.value);
                  setSelectedBoxId("");
                }}
                className="min-w-[140px] bg-transparent text-sm font-bold text-slate-800 focus:outline-none"
              >
                <option value={TODOS_CLIENT_ID}>Todos los clientes</option>
                {clientPickList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name?.trim() || c.id}
                  </option>
                ))}
              </select>
            </div> */}

            {/* <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-1.5 shadow-sm">
              <span className="border-r pr-2 text-[10px] font-black uppercase text-slate-400">Caja</span>
              <select
                value={selectedBoxId}
                onChange={(e) => setSelectedBoxId(e.target.value)}
                className="min-w-[160px] bg-transparent text-sm font-bold text-slate-800 focus:outline-none"
              >
                <option value="">Todas las cajas</option>
                {clientBoxes.map((box) => (
                  <option key={box.value} value={box.value}>
                    {box.label}
                  </option>
                ))}
              </select>
            </div> */}
          </div>
        </div>
      </div>

      <div className="mt-2 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-col rounded-3xl border border-slate-200 bg-linear-to-br from-slate-50 to-white p-6 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-base font-bold text-slate-800">
              <MdBarChart size={20} className="text-blue-500" /> Totales por tipo
            </h3>
            <span className="text-xs font-bold uppercase text-slate-400">Barras</span>
          </div>
          <div className="min-h-[220px] flex-1">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={reportData} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "#64748b", fontWeight: 500 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 12, fill: "#64748b", fontWeight: 500 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "none",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  }}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {reportData.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="flex flex-col rounded-3xl border border-slate-200 bg-linear-to-br from-slate-50 to-white p-6 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-base font-bold text-slate-800">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" /> Distribución
            </h3>
            <span className="text-xs font-bold uppercase text-slate-400">Torta</span>
          </div>
          <div className="min-h-[220px] flex-1">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Tooltip />
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
                    {pieData.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[220px] items-center justify-center text-sm text-slate-400">
                Sin datos para mostrar
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        <button
          type="button"
          onClick={() => setReportDetailModal({ type: "ingresos" })}
          className="flex w-full flex-col items-center rounded-2xl border border-slate-100 bg-white p-5 transition hover:shadow-md"
        >
          <MdInbox size={32} className="mb-2 text-green-500" />
          <span className="text-xs font-semibold uppercase text-slate-500">Ingresos</span>
          <span className="mt-1 text-2xl font-bold text-slate-900">{filteredIngresos.length}</span>
        </button>

        <button
          type="button"
          onClick={() => setReportDetailModal({ type: "salidas" })}
          className="flex w-full flex-col items-center rounded-2xl border border-slate-100 bg-white p-5 transition hover:shadow-md"
        >
          <MdLogout size={32} className="mb-2 text-pink-500" />
          <span className="text-xs font-semibold uppercase text-slate-500">Salidas</span>
          <span className="mt-1 text-2xl font-bold text-slate-900">{filteredSalidas.length}</span>
        </button>

        <button
          type="button"
          onClick={() => setReportDetailModal({ type: "movimientos" })}
          className="flex w-full flex-col items-center rounded-2xl border border-slate-100 bg-white p-5 transition hover:shadow-md"
        >
          <MdMoveToInbox size={32} className="mb-2 text-blue-500" />
          <span className="text-xs font-semibold uppercase text-slate-500">Movimientos</span>
          <span className="mt-1 text-2xl font-bold text-slate-900">{filteredMovimientos.length}</span>
        </button>

        <button
          type="button"
          onClick={() => setReportDetailModal({ type: "despachados" })}
          className="flex w-full flex-col items-center rounded-2xl border border-slate-100 bg-white p-5 transition hover:shadow-md"
        >
          <MdLocalShipping size={32} className="mb-2 text-gray-500" />
          <span className="text-xs font-semibold uppercase text-slate-500">Despachados</span>
          <span className="mt-1 text-2xl font-bold text-slate-900">{dispatchedFiltered.length}</span>
        </button>

        <button
          type="button"
          onClick={() => setReportDetailModal({ type: "alertas" })}
          className="col-span-full flex w-full flex-col items-center rounded-2xl border border-slate-100 bg-white p-5 transition hover:shadow-md md:col-span-4"
        >
          <IoAlert size={32} className="mb-2 text-red-500" />
          <span className="text-xs font-semibold uppercase text-slate-500">Alertas (historial)</span>
          <span className="mt-1 text-2xl font-bold text-slate-900">{filteredAlerts.length}</span>
        </button>
      </div>

      {reportDetailModal ? (
        <div
          className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center p-2 backdrop-blur-sm sm:p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setReportDetailModal(null)}
          style={{ background: "rgba(0,0,0,0.1)" }}
        >
          <div
            className="relative w-full max-w-2xl animate-fade-in-up overflow-hidden rounded-3xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            style={{
              fontFamily: '"Space Grotesk", "Work Sans", sans-serif',
              background: "rgba(255,255,255,0.92)",
              border: "1px solid #dbeafe",
              backdropFilter: "blur(8px)",
            }}
          >
            <div
              className="relative flex flex-col items-center justify-center rounded-t-3xl border-b border-blue-100 px-8 pb-4 pt-8"
              style={{
                background: "linear-gradient(90deg, #e0f2fe 0%, #ffffff 100%)",
              }}
            >
              <span className="mb-2 inline-flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 shadow">
                <MdBarChart size={32} className="text-blue-500" />
              </span>
              <h3 className="mb-1 text-center text-2xl font-extrabold tracking-tight text-blue-700 drop-shadow">
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
                className="absolute right-4 top-4 text-slate-400 transition-colors hover:text-blue-500"
                aria-label="Cerrar"
              >
                <MdClose size={28} />
              </button>
            </div>

            <div
              className="max-h-[60vh] overflow-y-auto px-8 py-6"
              style={{ background: "rgba(255,255,255,0.88)" }}
            >
              {modalRows && modalRows.length > 0 ? (
                <ul className="flex flex-col gap-3 text-sm text-slate-700">
                  {modalRows.map((row) => (
                    <li
                      key={row.key}
                      className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3 leading-snug"
                    >
                      {row.line}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-center text-sm text-slate-500">No hay registros para este filtro.</p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
