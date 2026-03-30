"use client";

import React from "react";
import { Inter } from "next/font/google";
import {
  MdShoppingBag,
  MdInventory2,
  MdShowChart,
  MdCalendarMonth,
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
  XAxis,
  YAxis,
} from "recharts";

const inter = Inter({ subsets: ["latin"], weight: ["400", "600", "700"] });

/** Datos estáticos solo para maquetar el diseño (sin lógica de negocio). */
const TOP5_PRODUCTOS = [
  { name: "HAMBURGUESA DE CARNE DE RES 70...", kg: 5600 },
  { name: "BBASHOF FROZEN-HIGH CHOICE BEE", kg: 4200 },
  { name: "RIBEYE PREMIUM IMPORTADO", kg: 3100 },
  { name: "COSTILLA AHUMADA BBQ", kg: 2400 },
  { name: "PULLED PORK CONGELADO", kg: 1800 },
];

const DISTRIBUCION_CATEGORIA = [
  { name: "Otros", value: 38, fill: "#93C5FD" },
  { name: "Tomahawk", value: 16, fill: "#86BC8E" },
  { name: "Chuck", value: 14, fill: "#6B9E72" },
  { name: "Hamburguesas", value: 9, fill: "#F9C8D2" },
  { name: "Steaks Premium", value: 8, fill: "#FDE68A" },
  { name: "Short Loin", value: 5, fill: "#D1D5DB" },
  { name: "Pollo", value: 6, fill: "#E8DCC8" },
  { name: "Cortadillo", value: 4, fill: "#C4B5FD" },
];

const EVOLUCION_MENSUAL = [
  { mes: "Ene", kg: 7200 },
  { mes: "Feb", kg: 9100 },
  { mes: "Mar", kg: 7800 },
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
          <p className={`mt-1.5 text-sm font-medium ${styles.sub}`}>
            {sublabel}
          </p>
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

const Operacion: React.FC = () => {
  return (
    <div
      className={`${inter.className} w-full bg-white px-6 py-8`}
      style={{ color: COLORS.text }}
    >
      {/* —— Inventario Actual (2026) —— */}
      <section className="mb-10">
        <h2
          className="mb-6 text-lg font-bold tracking-tight"
          style={{ color: COLORS.text }}
        >
          Inventario Actual (2026)
        </h2>

        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <KpiCard
            accent="green"
            icon={<MdShoppingBag className="h-5 w-5" aria-hidden />}
            label="Total Kilogramos"
            value="8.215"
            sublabel="kg en bodega"
          />
          <KpiCard
            accent="blue"
            icon={<MdInventory2 className="h-5 w-5" aria-hidden />}
            label="Total Piezas"
            value="323"
            sublabel="unidades"
          />
          <KpiCard
            accent="yellow"
            icon={<MdShowChart className="h-5 w-5" aria-hidden />}
            label="Productos (SKUs)"
            value="10"
            sublabel="variedades"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-[12px] border border-[#E5E7EB] bg-white px-5 py-5">
            <h3
              className="mb-4 text-base font-bold tracking-tight"
              style={{ color: COLORS.text }}
            >
              Top 5 Productos (2026)
            </h3>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={TOP5_PRODUCTOS}
                  margin={{ top: 8, right: 8, left: 0, bottom: 48 }}
                  barCategoryGap="18%"
                >
                  <CartesianGrid
                    strokeDasharray="2 4"
                    vertical={false}
                    stroke={COLORS.grid}
                  />
                  <XAxis
                    dataKey="name"
                    tick={{
                      fontSize: 10,
                      fill: COLORS.muted,
                      fontWeight: 500,
                    }}
                    interval={0}
                    tickFormatter={(v) => String(v).toUpperCase()}
                    axisLine={false}
                    tickLine={false}
                    height={40}
                  />
                  <YAxis
                    domain={[0, 6000]}
                    ticks={[0, 1500, 3000, 4500, 6000]}
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
                    {TOP5_PRODUCTOS.map((_, i) => (
                      <Cell key={i} fill={COLORS.barGreen} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-[12px] border border-[#E5E7EB] bg-white px-5 py-5">
            <h3
              className="mb-2 text-base font-bold tracking-tight"
              style={{ color: COLORS.text }}
            >
              Distribución por Categoría
            </h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 16, right: 56, bottom: 16, left: 56 }}>
                  <Pie
                    data={DISTRIBUCION_CATEGORIA}
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
                    {DISTRIBUCION_CATEGORIA.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} stroke="none" />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>

      {/* —— Inventario Histórico (2025) —— */}
      <section className="mb-10">
        <h2
          className="mb-6 text-lg font-bold tracking-tight"
          style={{ color: COLORS.text }}
        >
          Inventario Histórico (2025)
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <KpiCard
            accent="neutral"
            icon={<MdShoppingBag className="h-5 w-5" aria-hidden />}
            label="Total Kilogramos"
            value="8.697"
            sublabel="kg históricos"
          />
          <KpiCard
            accent="neutral"
            icon={<MdInventory2 className="h-5 w-5" aria-hidden />}
            label="Total Piezas"
            value="1.141"
            sublabel="unidades"
          />
          <KpiCard
            accent="neutral"
            icon={<MdCalendarMonth className="h-5 w-5" aria-hidden />}
            label="Productos (SKUs)"
            value="20"
            sublabel="variedades"
          />
        </div>
      </section>

      {/* —— Evolución Mensual 2026 —— */}
      <section>
        <div className="rounded-[12px] border border-[#E5E7EB] bg-white px-5 py-5">
          <h3
            className="mb-4 text-base font-bold tracking-tight"
            style={{ color: COLORS.text }}
          >
            Evolución Mensual 2026
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={EVOLUCION_MENSUAL}
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
                  domain={[0, 10000]}
                  ticks={[0, 2500, 5000, 7500, 10000]}
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
        </div>
      </section>
    </div>
  );
};

export default Operacion;
