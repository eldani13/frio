import React from "react";
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

interface ReportesSectionProps {
  reportData: Array<{ name: string; value: number; fill: string }>;
  inboundBoxes: Box[];
  outboundBoxes: Box[];
  dispatchedBoxes: Box[];
  orders: BodegaOrder[];
  slots: Slot[];
  sortByPosition: <T extends { position: number }>(items: T[]) => T[];
  reportDetailModal: { type: "ingresos" | "salidas" } | null;
  setReportDetailModal: (
    modal: { type: "ingresos" | "salidas" } | null,
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
}) => (
  <section className="rounded-2xl bg-white p-6 shadow-sm">
    <h2 className="text-lg font-semibold text-slate-900">Reportes</h2>
    <p className="mt-1 text-sm text-slate-600">
      Aqui podras consultar los reportes de la bodega.
    </p>
    <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
        <h3 className="text-sm font-semibold text-slate-700">
          Totales por tipo
        </h3>
        <div className="mt-4 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={reportData} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {reportData.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
        <h3 className="text-sm font-semibold text-slate-700">Distribucion</h3>
        <div className="mt-4 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip />
              <Pie
                data={reportData}
                dataKey="value"
                nameKey="name"
                innerRadius={45}
                outerRadius={85}
                paddingAngle={3}
              >
                {reportData.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
    <div className="mt-6 grid gap-3 sm:grid-cols-4">
      <div className="rounded-2xl border border-slate-100 bg-white p-4">
        <p className="text-xs font-semibold uppercase text-slate-500">
          MOVIMIENTOS A BODEGA
        </p>
        <p className="mt-2 text-2xl font-semibold text-slate-900">
          {reportData.find((item) => item.name === "Movimientos a bodega")
            ?.value ?? 0}
        </p>
      </div>
      <div className="rounded-2xl border border-slate-100 bg-white p-4">
        <p className="text-xs font-semibold uppercase text-slate-500">
          DESPACHADOS
        </p>
        <p className="mt-2 text-2xl font-semibold text-slate-900">
          {reportData.find((item) => item.name === "Despachados")?.value ?? 0}
        </p>
      </div>
    </div>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <button
        type="button"
        onClick={() => setReportDetailModal({ type: "ingresos" })}
        className="rounded-2xl border border-slate-100 bg-white p-4 text-left hover:shadow-md transition w-full"
      >
        <p className="text-xs font-semibold uppercase text-slate-500">
          Ingresos
        </p>
        <p className="mt-2 text-2xl font-semibold text-slate-900">
          {reportData.find((item) => item.name === "Ingresos")?.value ?? 0}
        </p>
      </button>
      <button
        type="button"
        onClick={() => setReportDetailModal({ type: "salidas" })}
        className="rounded-2xl border border-slate-100 bg-white p-4 text-left hover:shadow-md transition w-full"
      >
        <p className="text-xs font-semibold uppercase text-slate-500">
          Salidas
        </p>
        <p className="mt-2 text-2xl font-semibold text-slate-900">
          {reportData.find((item) => item.name === "Salidas")?.value ?? 0}
        </p>
      </button>
    </div>
    {reportDetailModal && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
        role="dialog"
        aria-modal="true"
        onClick={() => setReportDetailModal(null)}
      >
        <div
          className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-slate-900">
              {reportDetailModal.type === "ingresos"
                ? "Detalle de ingresos"
                : "Detalle de salidas"}
            </h3>
            <button
              type="button"
              onClick={() => setReportDetailModal(null)}
              className="rounded-full border border-slate-200 px-3 py-1 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Cerrar
            </button>
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {reportDetailModal.type === "ingresos"
              ? (() => {
                  if (inboundBoxes.length === 0) {
                    return (
                      <p className="text-sm text-slate-500">
                        No hay ingresos registrados.
                      </p>
                    );
                  }
                  return (
                    <ul className="space-y-2">
                      {sortByPosition(inboundBoxes).map((box, idx) => (
                        <li
                          key={box.autoId || idx}
                          className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                        >
                          <p className="font-semibold">
                            Ingreso {box.position}
                          </p>
                          <p>Nombre: {box.name}</p>
                          <p>Temperatura: {box.temperature} °C</p>
                          <p>Id único: {box.autoId}</p>
                        </li>
                      ))}
                    </ul>
                  );
                })()
              : (() => {
                  const salidasOrders = orders.filter(
                    (order) =>
                      order.type === "a_salida" &&
                      order.sourceZone === "bodega",
                  );
                  if (salidasOrders.length === 0) {
                    return (
                      <p className="text-sm text-slate-500">
                        No hay salidas registradas.
                      </p>
                    );
                  }
                  return (
                    <ul className="space-y-2">
                      {salidasOrders.map((order) => {
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
                            className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                          >
                            <p className="font-semibold">
                              Salida {order.targetPosition ?? "-"}
                            </p>
                            <p>ID orden: {order.id}</p>
                            <p>Registrado por: {order.createdBy}</p>
                            <p>Fecha: {order.createdAt}</p>
                            <p>
                              Posición origen: {order.sourcePosition ?? "-"}
                            </p>
                            <p>
                              Posición destino: {order.targetPosition ?? "-"}
                            </p>
                            {box ? (
                              <>
                                <p>Nombre: {box.name}</p>
                                <p>Temperatura: {box.temperature} °C</p>
                                <p>Id único: {box.autoId}</p>
                              </>
                            ) : (
                              <p className="text-xs text-rose-500 font-bold">
                                Detalles de caja no encontrados en el estado
                                actual.
                              </p>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  );
                })()}
          </div>
        </div>
      </div>
    )}
  </section>
);

export default ReportesSection;
