"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Inter } from "next/font/google";
import {
  MdShoppingBag,
  MdInventory2,
  MdShowChart,
  MdThermostat,
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
import {
  subscribeHistoryState,
  subscribeWarehouseState,
  type CloudWarehouseState,
} from "@/lib/bodegaCloudState";
import {
  buildIngresoRecordByAutoId,
  filasInventarioInternoFromSlots,
  type CategoriaTermica,
  type FilaInventarioInterno,
} from "@/lib/bodegaInternalInventoryRows";

const inter = Inter({ subsets: ["latin"], weight: ["400", "600", "700"] });

const COLORS = {
  text: "#1A1C1E",
  muted: "#6B7280",
  barGreen: "#A7D0B3",
  lineBlue: "#A0C4FF",
  lineDotStroke: "#60A5FA",
  grid: "#E5E7EB",
} as const;

const PIE_BY_TERMICA: Record<
  CategoriaTermica,
  { name: string; fill: string }
> = {
  estable: { name: "Temperatura estable", fill: "#86BC8E" },
  alta: { name: "Alta temperatura", fill: "#F87171" },
  sin_dato: { name: "Sin dato térmico", fill: "#CBD5E1" },
};

function truncLabel(s: string, max = 20) {
  const t = s.trim();
  if (t.length <= max) return t.toUpperCase();
  return `${t.slice(0, max - 1)}…`.toUpperCase();
}

function niceCeil(n: number, fallback = 10) {
  if (!Number.isFinite(n) || n <= 0) return fallback;
  const exp = Math.floor(Math.log10(n));
  const step = 10 ** Math.max(0, exp - 1);
  return Math.ceil(n / step) * step;
}

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

const nfKg = new Intl.NumberFormat("es-CO", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

type Props = { warehouseId?: string; onTotalChange?: (totalKg: number) => void };

const Operacion: React.FC<Props> = ({ warehouseId, onTotalChange }) => {
  const [cloud, setCloud] = useState<CloudWarehouseState | null>(null);
  const [ingresoRows, setIngresoRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = warehouseId?.trim();
    if (!id) {
      setCloud(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = subscribeWarehouseState(id, (s) => {
      setCloud(s);
      setLoading(false);
    });
    return () => unsub();
  }, [warehouseId]);

  useEffect(() => {
    const id = warehouseId?.trim();
    if (!id) {
      setIngresoRows([]);
      return;
    }
    const unsub = subscribeHistoryState(id, (h) => {
      setIngresoRows((h.ingresos ?? []) as Record<string, unknown>[]);
    });
    return () => unsub();
  }, [warehouseId]);

  const ingresoRecordsByAutoId = useMemo(
    () => buildIngresoRecordByAutoId(ingresoRows),
    [ingresoRows],
  );

  const filas = useMemo(
    () =>
      filasInventarioInternoFromSlots(cloud?.slots ?? [], {
        ingresoRecordsByAutoId,
      }),
    [cloud?.slots, ingresoRecordsByAutoId],
  );

  const totalKg = useMemo(
    () => filas.reduce((acc: number, r: FilaInventarioInterno) => acc + (r.cantidadKg ?? 0), 0),
    [filas],
  );

  useEffect(() => {
    if (typeof onTotalChange !== "function") return;
    if (!warehouseId?.trim()) {
      onTotalChange(0);
      return;
    }
    onTotalChange(totalKg);
  }, [warehouseId, totalKg, onTotalChange]);

  const posicionesConKg = useMemo(
    () =>
      filas.filter((r: FilaInventarioInterno) => r.cantidadKg != null && r.cantidadKg > 0).length,
    [filas],
  );

  const productosDistintos = useMemo(() => {
    return new Set(filas.map((r: FilaInventarioInterno) => r.nombre)).size;
  }, [filas]);

  const tieneKg = useMemo(
    () => filas.some((r: FilaInventarioInterno) => r.cantidadKg != null && r.cantidadKg > 0),
    [filas],
  );

  const top5Bar = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of filas) {
      const add = tieneKg ? (r.cantidadKg ?? 0) : 1;
      map.set(r.nombre, (map.get(r.nombre) ?? 0) + add);
    }
    const rows = [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([nombre, value]) => ({
        name: truncLabel(nombre, 18),
        nombreCompleto: nombre,
        kg: value,
      }));
    return { rows };
  }, [filas, tieneKg]);

  const maxBar = useMemo(
    () => niceCeil(Math.max(0, ...top5Bar.rows.map((r) => r.kg)), 10),
    [top5Bar.rows],
  );

  const pieDistribucionTermica = useMemo(() => {
    const counts: Record<CategoriaTermica, number> = {
      estable: 0,
      alta: 0,
      sin_dato: 0,
    };
    for (const r of filas) {
      counts[r.categoriaTermica] += 1;
    }
    return (["estable", "alta", "sin_dato"] as const)
      .filter((k) => counts[k] > 0)
      .map((k) => ({
        name: PIE_BY_TERMICA[k].name,
        value: counts[k],
        fill: PIE_BY_TERMICA[k].fill,
      }));
  }, [filas]);

  const lineTemperatura = useMemo(() => {
    return filas
      .filter(
        (r: FilaInventarioInterno) =>
          r.temperatura !== null &&
          r.temperatura !== undefined &&
          Number.isFinite(Number(r.temperatura)),
      )
      .map((r: FilaInventarioInterno) => ({
        pos: r.posicion,
        temp: Number(r.temperatura),
      }))
      .sort((a: { pos: number; temp: number }, b: { pos: number; temp: number }) => a.pos - b.pos);
  }, [filas]);

  const tempDomain = useMemo(() => {
    if (lineTemperatura.length === 0) return [0, 10] as [number, number];
    const vals = lineTemperatura.map((d: { temp: number }) => d.temp);
    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    const pad = Math.max(0.5, (hi - lo) * 0.15 || 1);
    return [Math.floor(lo - pad), Math.ceil(hi + pad)] as [number, number];
  }, [lineTemperatura]);

  if (!warehouseId?.trim()) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Elegí una bodega en el paso anterior para ver los gráficos del inventario.
      </div>
    );
  }

  if (loading && !cloud) {
    return (
      <p className="py-12 text-center text-sm italic text-slate-500">
        Cargando datos del mapa…
      </p>
    );
  }

  if (filas.length === 0) {
    return (
      <div
        className={`${inter.className} rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center text-slate-600`}
      >
        <p className="text-sm font-medium">
          No hay posiciones ocupadas en el mapa de esta bodega. Los gráficos se mostrarán cuando
          exista inventario en el listado.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`${inter.className} w-full rounded-2xl border border-slate-100 bg-white px-4 py-8 shadow-sm sm:px-6`}
      style={{ color: COLORS.text }}
    >
      <header className="mb-8 border-b border-slate-100 pb-5">
        <h2 className="text-lg font-bold tracking-tight" style={{ color: COLORS.text }}>
          Resumen gráfico — bodega interna
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Misma fuente que el listado: mapa en vivo ({filas.length}{" "}
          {filas.length === 1 ? "registro" : "registros"}).
        </p>
      </header>

      <section className="mb-10">
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <KpiCard
            accent="green"
            icon={<MdShoppingBag className="h-5 w-5" aria-hidden />}
            label="Total cantidad (kg)"
            value={totalKg > 0 ? nfKg.format(totalKg) : "0"}
            sublabel={totalKg > 0 ? "suma en bodega" : "sin kg registrados en cajas"}
          />
          <KpiCard
            accent="blue"
            icon={<MdInventory2 className="h-5 w-5" aria-hidden />}
            label="Posiciones ocupadas"
            value={String(filas.length)}
            sublabel={
              posicionesConKg > 0
                ? `${posicionesConKg} con kg declarado`
                : "registros en el mapa"
            }
          />
          <KpiCard
            accent="yellow"
            icon={<MdShowChart className="h-5 w-5" aria-hidden />}
            label="Nombres distintos"
            value={String(productosDistintos)}
            sublabel="productos en mapa"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-[12px] border border-[#E5E7EB] bg-white px-4 py-5 sm:px-5">
            <h3 className="mb-1 text-base font-bold tracking-tight" style={{ color: COLORS.text }}>
              Top 5 — {tieneKg ? "por kilogramos" : "por posiciones"}
            </h3>
            <p className="mb-4 text-xs text-slate-500">
              {tieneKg
                ? "Suma de kg por nombre de producto (como en la tabla)."
                : "No hay kg en las cajas; se cuenta cuántas posiciones usan cada nombre."}
            </p>
            {top5Bar.rows.length === 0 ? (
              <p className="py-16 text-center text-sm text-slate-500">Sin datos para graficar.</p>
            ) : (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={top5Bar.rows}
                    margin={{ top: 8, right: 8, left: 0, bottom: 52 }}
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
                        fontSize: 9,
                        fill: COLORS.muted,
                        fontWeight: 500,
                      }}
                      interval={0}
                      axisLine={false}
                      tickLine={false}
                      height={48}
                    />
                    <YAxis
                      domain={[0, maxBar]}
                      tick={{
                        fontSize: 11,
                        fill: COLORS.muted,
                        fontWeight: 500,
                      }}
                      axisLine={false}
                      tickLine={false}
                      width={44}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(148, 163, 184, 0.12)" }}
                      contentStyle={{
                        fontFamily: inter.style.fontFamily,
                        fontSize: 12,
                        borderRadius: 12,
                        border: "1px solid #E5E7EB",
                      }}
                      formatter={(value: number) =>
                        tieneKg ? [`${nfKg.format(value)} kg`, "Total"] : [String(value), "Posiciones"]
                      }
                      labelFormatter={(_, payload) => {
                        const p = payload?.[0]?.payload as { nombreCompleto?: string } | undefined;
                        return p?.nombreCompleto ?? "";
                      }}
                    />
                    <Bar dataKey="kg" radius={[6, 6, 0, 0]} maxBarSize={48}>
                      {top5Bar.rows.map((_, i) => (
                        <Cell key={i} fill={COLORS.barGreen} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="rounded-[12px] border border-[#E5E7EB] bg-white px-4 py-5 sm:px-5">
            <h3 className="mb-1 text-base font-bold tracking-tight" style={{ color: COLORS.text }}>
              Posiciones por estado térmico
            </h3>
            <p className="mb-4 text-xs text-slate-500">
              Regla &gt; 5 °C = alta temperatura (igual que el listado y el mapa).
            </p>
            {pieDistribucionTermica.length === 0 ? (
              <p className="py-16 text-center text-sm text-slate-500">Sin datos.</p>
            ) : (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 16, right: 48, bottom: 16, left: 48 }}>
                    <Pie
                      data={pieDistribucionTermica}
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
                      {pieDistribucionTermica.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        fontFamily: inter.style.fontFamily,
                        fontSize: 12,
                        borderRadius: 12,
                        border: "1px solid #E5E7EB",
                      }}
                      formatter={(value: number) => [
                        `${value} ${value === 1 ? "posición" : "posiciones"}`,
                        "Cantidad",
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </section>

      <section>
        <div className="rounded-[12px] border border-[#E5E7EB] bg-white px-4 py-5 sm:px-5">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <MdThermostat className="h-5 w-5 text-slate-500" aria-hidden />
            <h3 className="text-base font-bold tracking-tight" style={{ color: COLORS.text }}>
              Temperatura por posición
            </h3>
          </div>
          <p className="mb-4 text-xs text-slate-500">
            Solo posiciones con lectura numérica en el mapa ({lineTemperatura.length} de{" "}
            {filas.length}).
          </p>
          {lineTemperatura.length === 0 ? (
            <p className="py-16 text-center text-sm text-slate-500">
              No hay temperaturas registradas en las cajas de este mapa.
            </p>
          ) : (
            <>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={lineTemperatura}
                    margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
                  >
                    <CartesianGrid
                      strokeDasharray="2 4"
                      vertical={false}
                      stroke={COLORS.grid}
                    />
                    <XAxis
                      dataKey="pos"
                      tick={{
                        fontSize: 11,
                        fill: COLORS.muted,
                        fontWeight: 500,
                      }}
                      axisLine={false}
                      tickLine={false}
                      label={{
                        value: "Posición",
                        position: "insideBottom",
                        offset: -4,
                        fill: COLORS.muted,
                        fontSize: 11,
                      }}
                    />
                    <YAxis
                      domain={tempDomain}
                      tick={{
                        fontSize: 11,
                        fill: COLORS.muted,
                        fontWeight: 500,
                      }}
                      axisLine={false}
                      tickLine={false}
                      width={44}
                      label={{
                        value: "°C",
                        angle: -90,
                        position: "insideLeft",
                        fill: COLORS.muted,
                        fontSize: 11,
                      }}
                    />
                    <Tooltip
                      contentStyle={{
                        fontFamily: inter.style.fontFamily,
                        fontSize: 12,
                        borderRadius: 12,
                        border: "1px solid #E5E7EB",
                      }}
                      formatter={(v: number) => [`${v} °C`, "Temperatura"]}
                      labelFormatter={(pos) => `Posición ${pos}`}
                    />
                    <Line
                      type="monotone"
                      dataKey="temp"
                      name="°C"
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
                  Temperatura (°C)
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
