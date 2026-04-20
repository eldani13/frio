"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  MdBarChart,
  MdMoveToInbox,
  MdLogout,
  MdInbox,
  MdLocalShipping,
  MdClose,
  MdGpsFixed,
  MdExpandMore,
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
import {
  buildBoxTrackingTimeline,
  collectKnownBoxIds,
} from "@/app/lib/boxTracking";

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
  const {
    ingresos,
    salidas,
    movimientosBodega,
    alertas,
    despachadosHistorial,
  } = useBodegaHistory();

  const [activeClientId, _setActiveClientId] = useState<string>(TODOS_CLIENT_ID);
  const [_selectedBoxId, _setSelectedBoxId] = useState("");
  const [trackModalOpen, setTrackModalOpen] = useState(false);
  const [trackSelectedId, setTrackSelectedId] = useState("");
  const [trackComboOpen, setTrackComboOpen] = useState(false);
  const [trackComboQuery, setTrackComboQuery] = useState("");
  const trackComboRef = useRef<HTMLDivElement>(null);
  const prevTrackModalOpen = useRef(false);
  const [reportDetailModal, setReportDetailModal] = useState<{
    type: "ingresos" | "salidas" | "movimientos" | "despachados" | "alertas";
  } | null>(null);

  const _clientPickList = useMemo(
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

  const filteredDespachoHistorial = useMemo(
    () =>
      !activeClientId
        ? despachadosHistorial
        : despachadosHistorial.filter((e) => e.box.client === activeClientId),
    [despachadosHistorial, activeClientId],
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

  const _clientBoxes = useMemo(() => {
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
      { name: "Despachados", value: filteredDespachoHistorial.length, fill: "#64748B" },
      { name: "Alertas", value: filteredAlerts.length, fill: "#EF4444" },
    ],
    [
      filteredIngresos.length,
      filteredSalidas.length,
      filteredMovimientos.length,
      filteredDespachoHistorial.length,
      filteredAlerts.length,
    ],
  );

  const trackingPickList = useMemo(
    () =>
      collectKnownBoxIds({
        ingresos,
        movimientosBodega,
        salidas,
        despachadosHistorial,
        inboundBoxes,
        outboundBoxes,
        dispatchedBoxes,
        slots,
      }),
    [
      ingresos,
      movimientosBodega,
      salidas,
      despachadosHistorial,
      inboundBoxes,
      outboundBoxes,
      dispatchedBoxes,
      slots,
    ],
  );

  const trackingTimeline = useMemo(
    () =>
      buildBoxTrackingTimeline(trackSelectedId, {
        ingresos,
        movimientosBodega,
        salidas,
        despachadosHistorial,
        inboundBoxes,
        outboundBoxes,
        dispatchedBoxes,
        slots,
      }),
    [
      trackSelectedId,
      ingresos,
      movimientosBodega,
      salidas,
      despachadosHistorial,
      inboundBoxes,
      outboundBoxes,
      dispatchedBoxes,
      slots,
    ],
  );

  const filteredTrackBoxes = useMemo(() => {
    const q = trackComboQuery.trim().toLowerCase();
    if (!q) return trackingPickList;
    return trackingPickList.filter(
      (o) =>
        o.value.toLowerCase().includes(q) ||
        o.label.toLowerCase().includes(q),
    );
  }, [trackingPickList, trackComboQuery]);

  useEffect(() => {
    if (trackModalOpen && !prevTrackModalOpen.current) {
      setTrackComboQuery("");
      setTrackSelectedId("");
      setTrackComboOpen(false);
    }
    prevTrackModalOpen.current = trackModalOpen;
    if (!trackModalOpen) setTrackComboOpen(false);
  }, [trackModalOpen]);

  useEffect(() => {
    if (!trackComboOpen) return;
    const onDown = (e: MouseEvent) => {
      if (trackComboRef.current?.contains(e.target as Node)) return;
      setTrackComboOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [trackComboOpen]);

  const pieData = useMemo(() => reportData.filter((item) => item.value > 0), [reportData]);

  const renderPieLabel = ({ name, percent }: { name: string; percent: number }) =>
    `${name.substring(0, 4)} ${(percent * 100).toFixed(0)}%`;

  const zoneLabel = (z: OrderSource) =>
    z === "bodega" ? "Bodega" : z === "salida" ? "Salida" : "Ingreso";

  const formatOrderLine = (o: BodegaOrder) => {
    const target = o.targetPosition ?? "—";
    const when = o.completadoAtMs ?? o.createdAtMs;
    return `${o.type} · desde ${zoneLabel(o.sourceZone)} pos. ${o.sourcePosition}${
      o.targetPosition != null ? ` → ${target}` : ""
    } · ${new Date(when).toLocaleString("es-CO")}`;
  };

  const modalRows = useMemo(() => {
    if (!reportDetailModal) return null;
    const t = reportDetailModal.type;
    if (t === "ingresos") {
      return [...filteredIngresos]
        .sort((a, b) => (b.historialAtMs ?? 0) - (a.historialAtMs ?? 0))
        .map((b) => ({
          key: `${b.position}-${b.autoId}-${b.historialAtMs ?? 0}`,
          line: (
            <span>
              <span className="font-semibold text-slate-900">{b.autoId || "—"}</span>
              {" · "}
              {b.name || "Sin nombre"}
              {" · pos. "}
              {b.position}
              {" · "}
              {clientLabelFromList(b.client, clients)}
              {b.historialAtMs ? (
                <>
                  {" · "}
                  <span className="text-slate-500">
                    {new Date(b.historialAtMs).toLocaleString("es-CO")}
                  </span>
                </>
              ) : null}
            </span>
          ),
        }));
    }
    if (t === "salidas") {
      return [...filteredSalidas]
        .sort(
          (a, b) =>
            (b.completadoAtMs ?? b.createdAtMs) - (a.completadoAtMs ?? a.createdAtMs),
        )
        .map((o) => ({
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
      return [...filteredMovimientos]
        .sort(
          (a, b) =>
            (b.completadoAtMs ?? b.createdAtMs) - (a.completadoAtMs ?? a.createdAtMs),
        )
        .map((o) => ({
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
      return [...filteredDespachoHistorial]
        .sort((a, b) => b.atMs - a.atMs)
        .map((d) => ({
          key: d.id,
          line: (
            <span>
              <span className="font-semibold text-slate-900">{d.box.autoId || "—"}</span>
              {" · "}
              {d.box.name || "Sin nombre"}
              {" · salida "}
              {d.fromSalidaPosition}
              {" · "}
              {clientLabelFromList(d.box.client, clients)}
              {" · "}
              <span className="text-slate-500">{new Date(d.atMs).toLocaleString("es-CO")}</span>
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
    filteredDespachoHistorial,
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
            Historial persistente en Firestore; los totales suman todo lo acumulado.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setTrackModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm font-bold text-sky-800 shadow-sm transition hover:bg-sky-100"
          >
            <MdGpsFixed size={20} className="text-sky-600" />
            Rastrear caja
          </button>
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

      <div className="mt-2 grid min-w-0 gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div className="flex min-w-0 flex-col rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-6 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-base font-bold text-slate-800">
              <MdBarChart size={20} className="text-blue-500" /> Totales por tipo
            </h3>
            <span className="text-xs font-bold uppercase text-slate-400">Barras</span>
          </div>
          <div className="min-h-[220px] w-full min-w-0 flex-1">
            <ResponsiveContainer width="100%" height={220} minWidth={0}>
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

        <div className="flex min-w-0 flex-col rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-6 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-base font-bold text-slate-800">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" /> Distribución
            </h3>
            <span className="text-xs font-bold uppercase text-slate-400">Torta</span>
          </div>
          <div className="min-h-[220px] w-full min-w-0 flex-1">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220} minWidth={0}>
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
          <span className="mt-1 text-2xl font-bold text-slate-900">
            {filteredDespachoHistorial.length}
          </span>
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

      {trackModalOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto p-3 pt-8 backdrop-blur-sm sm:p-6 sm:pt-12"
          style={{ background: "rgba(15,23,42,0.35)" }}
          role="dialog"
          aria-modal="true"
          aria-label="Rastrear caja"
          onClick={() => setTrackModalOpen(false)}
        >
          <div
            className="my-auto flex min-h-[min(520px,58vh)] max-h-[min(92vh,900px)] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 bg-slate-50 px-6 py-4">
              <div className="flex items-center gap-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sky-700">
                  <MdGpsFixed size={22} />
                </span>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Rastrear caja</h3>
                  <p className="text-xs text-slate-500">Id + recorrido (historial + mapa actual)</p>
                </div>
              </div>
              <button
                type="button"
                className="rounded-full p-2 text-slate-400 hover:bg-white hover:text-slate-700"
                aria-label="Cerrar"
                onClick={() => setTrackModalOpen(false)}
              >
                <MdClose size={22} />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overflow-x-visible px-6 py-5">
              <div ref={trackComboRef} className="relative">
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Id de caja
                </label>
                <div
                  className="flex rounded-xl border border-slate-200 bg-white shadow-sm ring-sky-200 focus-within:ring-2"
                  role="combobox"
                  aria-expanded={trackComboOpen}
                  aria-controls="track-box-listbox"
                >
                  <input
                    type="text"
                    value={trackComboQuery}
                    onChange={(e) => {
                      setTrackComboQuery(e.target.value);
                      setTrackComboOpen(true);
                    }}
                    onFocus={() => setTrackComboOpen(true)}
                    onBlur={() => {
                      const q = trackComboQuery.trim();
                      if (!q) {
                        setTrackSelectedId("");
                        return;
                      }
                      const match = trackingPickList.find((o) => o.value === q);
                      if (match) setTrackSelectedId(match.value);
                    }}
                    placeholder="Buscar o elegir de la lista…"
                    autoComplete="off"
                    className="min-w-0 flex-1 rounded-l-xl border-0 bg-transparent px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none placeholder:font-normal placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    className="flex shrink-0 items-center rounded-r-xl border-l border-slate-100 px-2 text-slate-500 hover:bg-slate-50"
                    aria-label={trackComboOpen ? "Cerrar lista" : "Ver todas las cajas"}
                    onClick={() => setTrackComboOpen((o) => !o)}
                  >
                    <MdExpandMore
                      size={22}
                      className={`transition-transform ${trackComboOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-slate-400">
                  {trackingPickList.length} caja(s) en mapa + historial
                </p>

                {trackComboOpen ? (
                  <ul
                    id="track-box-listbox"
                    role="listbox"
                    className="absolute z-20 mt-1 max-h-[min(45vh,320px)] w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl"
                  >
                    {filteredTrackBoxes.length === 0 ? (
                      <li
                        className="px-3 py-3 text-center text-sm text-slate-500"
                        role="option"
                        aria-selected={false}
                      >
                        Sin coincidencias
                      </li>
                    ) : (
                      filteredTrackBoxes.map((o) => {
                        const sub =
                          o.label.includes(" · ") ?
                            o.label.split(" · ").slice(1).join(" · ").trim()
                          : "";
                        const selected = trackSelectedId === o.value;
                        return (
                          <li key={o.value} role="none">
                            <button
                              type="button"
                              role="option"
                              aria-selected={selected}
                              className={`flex w-full flex-col gap-0.5 px-3 py-2.5 text-left transition-colors hover:bg-slate-50 ${
                                selected ? "bg-emerald-50/90" : ""
                              }`}
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                setTrackSelectedId(o.value);
                                setTrackComboQuery(o.value);
                                setTrackComboOpen(false);
                              }}
                            >
                              <span className="text-sm font-bold text-slate-900">{o.value}</span>
                              {sub ? (
                                <span className="text-xs text-slate-500">{sub}</span>
                              ) : null}
                            </button>
                          </li>
                        );
                      })
                    )}
                  </ul>
                ) : null}
              </div>

              {trackingTimeline.current ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/90 px-4 py-3.5 text-sm shadow-sm">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                    Ahora
                  </span>
                  <p className="mt-1 text-base font-bold leading-snug text-emerald-950">
                    {trackingTimeline.current.label}
                  </p>
                </div>
              ) : trackSelectedId.trim() && trackingTimeline.steps.length > 0 ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                  No aparece en ingreso, bodega, salida ni despacho del mapa. El último evento del historial
                  indica dónde quedó registrada.
                </div>
              ) : trackSelectedId.trim() ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  Sin eventos para este id. Revisá el código o registrá un ingreso.
                </div>
              ) : null}

              {trackingTimeline.steps.length > 0 ? (
                <div className="relative pl-2">
                  <ul className="space-y-0 border-l-2 border-slate-200 pl-6">
                    {trackingTimeline.steps.map((step) => (
                      <li key={step.id} className="relative pb-8 last:pb-2">
                        <span
                          className="absolute -left-[1.4rem] top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-white bg-sky-500 shadow"
                          aria-hidden
                        />
                        <p className="text-sm font-bold text-slate-900">{step.title}</p>
                        <p className="text-xs text-slate-600">{step.subtitle}</p>
                        <p className="mt-0.5 text-[11px] text-slate-400">
                          {step.atMs
                            ? new Date(step.atMs).toLocaleString("es-CO")
                            : "Sin hora en historial (registro antiguo)"}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
