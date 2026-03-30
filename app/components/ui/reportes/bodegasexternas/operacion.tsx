"use client";

import React, { useMemo } from "react";
import { Inter } from "next/font/google";
import {
  MdShoppingBag,
  MdInventory2,
  MdShowChart,
} from "react-icons/md";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { FridemInventoryRow } from "@/lib/fridemInventory";

const inter = Inter({ subsets: ["latin"], weight: ["400", "600", "700"] });

export type OperacionExternasProps = {
  items: FridemInventoryRow[];
  loading?: boolean;
  error?: string | null;
};

function rowKg(r: FridemInventoryRow): number {
  const k = r.kilosActual ?? r.kilos;
  return Number.isFinite(k) ? Number(k) : 0;
}

/** Devuelve clave YYYY-MM si se puede interpretar la fecha de ingreso. */
function parseIngresoMonth(fecha: string): string | null {
  if (!fecha?.trim()) return null;
  const t = fecha.trim();
  const d = new Date(t);
  if (!Number.isNaN(d.getTime())) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }
  const m = t.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/);
  if (m) {
    let day = Number(m[1]);
    let month = Number(m[2]);
    let year = Number(m[3]);
    if (year < 100) year += year >= 70 ? 1900 : 2000;
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, "0")}`;
    }
  }
  return null;
}

const MONTH_SHORT = [
  "",
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

function ymToLabel(ym: string): string {
  const [y, mo] = ym.split("-");
  const m = Number(mo);
  if (!y || !m || m < 1 || m > 12) return ym;
  return `${MONTH_SHORT[m]} ${y}`;
}

const PIE_PALETTE = [
  "#93C5FD",
  "#86BC8E",
  "#6B9E72",
  "#F9C8D2",
  "#FDE68A",
  "#D1D5DB",
  "#E8DCC8",
  "#C4B5FD",
];

const COLORS = {
  text: "#1A1C1E",
  muted: "#6B7280",
  greenBg: "#F0FAF0",
  greenBorder: "#4ADE80",
  greenSub: "#166534",
  blueBg: "#EFF6FF",
  blueBorder: "#60A5FA",
  blueSub: "#1E40AF",
  yellowBg: "#FFFBEB",
  yellowBorder: "#FDE047",
  yellowSub: "#854D0E",
  barGreen: "#A7D0B3",
  lineBlue: "#A0C4FF",
  lineDotStroke: "#60A5FA",
  grid: "#E5E7EB",
} as const;

type Accent = "green" | "blue" | "yellow" | "neutral";

function KpiCard({
  accent,
  icon,
  label,
  value,
  sublabel,
}: {
  accent: Accent;
  icon: React.ReactNode;
  label: string;
  value: string;
  sublabel: string;
}) {
  const styles =
    accent === "green"
      ? {
          wrap: "border-[#BBF7D0] bg-[#F0FAF0]",
          iconBox: "bg-[#4ADE80] text-white",
          sub: "text-[#166534]",
        }
      : accent === "blue"
        ? {
            wrap: "border-[#BFDBFE] bg-[#EFF6FF]",
            iconBox: "bg-[#60A5FA] text-white",
            sub: "text-[#1E40AF]",
          }
        : accent === "yellow"
          ? {
              wrap: "border-[#FEF08A] bg-[#FFFBEB]",
              iconBox: "bg-[#FDE047] text-[#1A1C1E]",
              sub: "text-[#854D0E]",
            }
          : {
              wrap: "border-[#E5E7EB] bg-[#F9FAFB]",
              iconBox: "bg-[#9CA3AF] text-white",
              sub: "text-[#6B7280]",
            };

  return (
    <div
      className={`flex flex-col gap-3 rounded-[12px] border px-5 py-5 ${styles.wrap}`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-lg ${styles.iconBox}`}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <p
            className="text-sm font-normal leading-tight"
            style={{ color: COLORS.muted }}
          >
            {label}
          </p>
          <p
            className="mt-1 text-[28px] font-bold leading-none tracking-tight"
            style={{ color: COLORS.text }}
          >
            {value}
          </p>
          <p className={`mt-1.5 text-sm font-medium ${styles.sub}`}>{sublabel}</p>
        </div>
      </div>
    </div>
  );
}

function PieLabel(props: {
  cx?: number;
  cy?: number;
  midAngle?: number;
  innerRadius?: number;
  outerRadius?: number;
  name?: string;
  fill?: string;
}) {
  const {
    cx = 0,
    cy = 0,
    midAngle = 0,
    innerRadius = 0,
    outerRadius = 0,
    name = "",
    fill = "#000",
  } = props;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 1.22;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  const anchor = x > cx ? "start" : "end";
  return (
    <text
      x={x}
      y={y}
      fill={fill}
      textAnchor={anchor}
      dominantBaseline="central"
      className="text-[11px] font-medium"
      style={{ fontFamily: inter.style.fontFamily }}
    >
      {name}
    </text>
  );
}

function truncateLabel(s: string, max = 36): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 3)}...`;
}

const Operacion: React.FC<OperacionExternasProps> = ({
  items,
  loading = false,
  error = null,
}) => {
  const year = new Date().getFullYear();

  const metrics = useMemo(() => {
    const totalKg = items.reduce((acc, r) => acc + rowKg(r), 0);
    const totalPiezas = items.reduce((acc, r) => {
      const p = r.piezas;
      return acc + (p !== null && Number.isFinite(p) ? p : 0);
    }, 0);

    const variety = new Set<string>();
    for (const r of items) {
      const key = (r.llaveUnica?.trim() || `${r.lote}|${r.descripcion}`).toLowerCase();
      variety.add(key);
    }
    const skuCount = variety.size;

    const byDesc = new Map<string, number>();
    for (const r of items) {
      const d = (r.descripcion || "Sin descripción").trim() || "Sin descripción";
      byDesc.set(d, (byDesc.get(d) ?? 0) + rowKg(r));
    }
    const top5 = [...byDesc.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, kg], index) => {
        const fullLabel = (name || "Sin descripción").trim().toUpperCase();
        return {
          rank: index + 1,
          fullLabel,
          kg,
        };
      });

    const maxBarKg = Math.max(...top5.map((t) => t.kg), 0);
    const barYMax = Math.max(Math.ceil((maxBarKg * 1.1) / 500) * 500, 500);
    const barTicks: number[] = [];
    const step = barYMax <= 3000 ? 500 : barYMax <= 8000 ? 1000 : Math.ceil(barYMax / 5 / 500) * 500;
    for (let v = 0; v <= barYMax; v += step) barTicks.push(v);
    if (barTicks[barTicks.length - 1] !== barYMax) barTicks.push(barYMax);

    const byMarca = new Map<string, number>();
    for (const r of items) {
      const m = r.marca?.trim() || "Sin marca";
      byMarca.set(m, (byMarca.get(m) ?? 0) + rowKg(r));
    }
    const marcaSorted = [...byMarca.entries()].sort((a, b) => b[1] - a[1]);
    const topMarca = marcaSorted.slice(0, 7);
    let otrosKg = 0;
    if (marcaSorted.length > 7) {
      otrosKg = marcaSorted.slice(7).reduce((s, [, k]) => s + k, 0);
    }
    const pieSlices: { name: string; value: number; fill: string }[] = topMarca.map(
      ([name, value], i) => ({
        name: truncateLabel(name, 22),
        value,
        fill: PIE_PALETTE[i % PIE_PALETTE.length],
      }),
    );
    if (otrosKg > 0) {
      pieSlices.push({
        name: "Otros",
        value: otrosKg,
        fill: "#93C5FD",
      });
    }

    const byMonth = new Map<string, number>();
    for (const r of items) {
      const ym = parseIngresoMonth(r.fechaIngreso);
      if (!ym) continue;
      byMonth.set(ym, (byMonth.get(ym) ?? 0) + rowKg(r));
    }
    const allMonths = [...byMonth.keys()].sort();
    const yPrefix = `${year}-`;
    const thisYearMonths = allMonths.filter((k) => k.startsWith(yPrefix));
    const keys =
      thisYearMonths.length >= 1
        ? thisYearMonths
        : allMonths.length
          ? allMonths.slice(-6)
          : [];
    const evolucion = keys.map((k) => ({
      mes: ymToLabel(k),
      kg: byMonth.get(k) ?? 0,
    }));
    const maxLine = Math.max(...evolucion.map((e) => e.kg), 0);
    const lineYMax = Math.max(Math.ceil((maxLine * 1.1) / 500) * 500, 500);
    const lineTicks: number[] = [];
    const lStep =
      lineYMax <= 3000 ? 500 : lineYMax <= 12000 ? 2500 : Math.ceil(lineYMax / 4 / 1000) * 1000;
    for (let v = 0; v <= lineYMax; v += lStep) lineTicks.push(v);
    if (lineTicks[lineTicks.length - 1] !== lineYMax) lineTicks.push(lineYMax);

    return {
      totalKg,
      totalPiezas,
      skuCount,
      top5,
      barYMax,
      barTicks,
      pieSlices,
      evolucion,
      lineYMax,
      lineTicks,
    };
  }, [items, year]);

  const fmtKg = (n: number) =>
    n.toLocaleString("es-CO", { maximumFractionDigits: 2, minimumFractionDigits: 0 });
  const fmtInt = (n: number) => n.toLocaleString("es-CO", { maximumFractionDigits: 0 });

  if (loading) {
    return (
      <div
        className={`${inter.className} w-full animate-pulse bg-white px-6 py-8`}
        style={{ color: COLORS.text }}
      >
        <div className="mb-8 h-7 w-64 rounded bg-slate-200" />
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-[12px] bg-slate-100" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-[280px] rounded-[12px] bg-slate-100" />
          <div className="h-[300px] rounded-[12px] bg-slate-100" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${inter.className} rounded-xl border border-red-100 bg-red-50/80 px-6 py-8 text-sm text-red-800`}>
        {error}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div
        className={`${inter.className} rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-12 text-center text-sm text-slate-600`}
      >
        No hay registros de inventario externo para esta bodega. Revisá la vista Listado o recargá los
        datos.
      </div>
    );
  }

  return (
    <div
      className={`${inter.className} w-full bg-white px-6 py-8`}
      style={{ color: COLORS.text }}
    >
      <section className="mb-10">
        <h2
          className="mb-6 text-lg font-bold tracking-tight"
          style={{ color: COLORS.text }}
        >
          Inventario actual ({year})
        </h2>
        <p className="mb-6 text-xs text-[#6B7280]">
          Métricas calculadas desde el inventario en tiempo real de la bodega externa (FRIDEM / fuente
          configurada).
        </p>

        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <KpiCard
            accent="green"
            icon={<MdShoppingBag className="h-5 w-5" aria-hidden />}
            label="Total Kilogramos"
            value={fmtKg(metrics.totalKg)}
            sublabel="kg en bodega"
          />
          <KpiCard
            accent="blue"
            icon={<MdInventory2 className="h-5 w-5" aria-hidden />}
            label="Total Piezas"
            value={fmtInt(metrics.totalPiezas)}
            sublabel="unidades"
          />
          <KpiCard
            accent="yellow"
            icon={<MdShowChart className="h-5 w-5" aria-hidden />}
            label="Productos (referencia)"
            value={fmtInt(metrics.skuCount)}
            sublabel="lotes / ítems distintos"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-[12px] border border-[#E5E7EB] bg-white px-5 py-5">
            <h3
              className="mb-4 text-base font-bold tracking-tight"
              style={{ color: COLORS.text }}
            >
              Top 5 productos por kg
            </h3>
            {metrics.top5.length === 0 ? (
              <p className="py-8 text-center text-sm text-[#6B7280]">Sin datos para graficar.</p>
            ) : (
              <div className="h-[280px] w-full min-h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={metrics.top5}
                    margin={{ top: 8, right: 12, left: 4, bottom: 12 }}
                    barCategoryGap="22%"
                  >
                    <CartesianGrid
                      strokeDasharray="2 4"
                      vertical={false}
                      stroke={COLORS.grid}
                    />
                    <XAxis dataKey="rank" type="category" hide />
                    <Tooltip
                      cursor={{ fill: "rgba(15, 23, 42, 0.06)" }}
                      formatter={(value: number | string) => [
                        `${fmtKg(Number(value))} kg`,
                        "Cantidad",
                      ]}
                      labelFormatter={(_, payload) => {
                        const row = payload?.[0]?.payload as { fullLabel?: string } | undefined;
                        return row?.fullLabel ?? "";
                      }}
                      contentStyle={{
                        borderRadius: 8,
                        border: "1px solid #E5E7EB",
                        fontSize: 12,
                        maxWidth: 320,
                        whiteSpace: "normal",
                        wordBreak: "break-word",
                      }}
                    />
                    <YAxis
                      domain={[0, metrics.barYMax]}
                      ticks={metrics.barTicks}
                      tick={{
                        fontSize: 11,
                        fill: COLORS.muted,
                        fontWeight: 500,
                      }}
                      axisLine={false}
                      tickLine={false}
                      width={44}
                    />
                    <Bar dataKey="kg" radius={[6, 6, 0, 0]} maxBarSize={48}>
                      {metrics.top5.map((_, i) => (
                        <Cell key={i} fill={COLORS.barGreen} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="rounded-[12px] border border-[#E5E7EB] bg-white px-5 py-5">
            <h3
              className="mb-2 text-base font-bold tracking-tight"
              style={{ color: COLORS.text }}
            >
              Distribución por marca
            </h3>
            <p className="mb-2 text-xs text-[#6B7280]">Participación en kg según campo marca del inventario.</p>
            {metrics.pieSlices.length === 0 ? (
              <p className="py-8 text-center text-sm text-[#6B7280]">Sin datos para graficar.</p>
            ) : (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 16, right: 56, bottom: 16, left: 56 }}>
                    <Pie
                      data={metrics.pieSlices}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={0}
                      outerRadius={88}
                      paddingAngle={1}
                      label={PieLabel}
                      labelLine={false}
                    >
                      {metrics.pieSlices.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} stroke="none" />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mb-6 rounded-lg border border-[#eef1f4] bg-[#F8FAFB] px-4 py-3 text-xs text-[#6B7280]">
        La fuente externa no entrega inventario histórico por año: no se muestra el bloque &quot;histórico
        2025&quot; con datos reales. Los totales de arriba son el estado actual del cargue.
      </section>

      <section>
        <div className="rounded-[12px] border border-[#E5E7EB] bg-white px-5 py-5">
          <h3
            className="mb-1 text-base font-bold tracking-tight"
            style={{ color: COLORS.text }}
          >
            Kg por mes (fecha de ingreso)
          </h3>
          <p className="mb-4 text-xs text-[#6B7280]">
            Suma de kilos agrupada por mes según el campo fecha de ingreso de cada línea (aproximación; no
            es un saldo contable mensual).
          </p>
          {metrics.evolucion.length < 1 ? (
            <p className="py-8 text-center text-sm text-[#6B7280]">
              No hay fechas de ingreso válidas para armar la serie mensual.
            </p>
          ) : (
            <>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={metrics.evolucion}
                    margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
                  >
                    <CartesianGrid
                      strokeDasharray="2 4"
                      vertical={false}
                      stroke={COLORS.grid}
                    />
                    <XAxis
                      dataKey="mes"
                      tick={{
                        fontSize: 12,
                        fill: COLORS.muted,
                        fontWeight: 500,
                      }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, metrics.lineYMax]}
                      ticks={metrics.lineTicks}
                      tick={{
                        fontSize: 11,
                        fill: COLORS.muted,
                        fontWeight: 500,
                      }}
                      axisLine={false}
                      tickLine={false}
                      width={44}
                    />
                    <Line
                      type="monotone"
                      dataKey="kg"
                      name="kg"
                      stroke={COLORS.lineBlue}
                      strokeWidth={2}
                      dot={{
                        r: 5,
                        fill: COLORS.lineBlue,
                        stroke: COLORS.lineDotStroke,
                        strokeWidth: 2,
                      }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 flex justify-center">
                <div className="flex items-center gap-2 text-sm font-medium text-[#1E40AF]">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: COLORS.lineBlue }}
                    aria-hidden
                  />
                  kg
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
};

export default Operacion;
