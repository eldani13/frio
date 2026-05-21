import type { FridemInventoryRow } from "@/lib/fridem/fridemInventory";

function rowKg(r: FridemInventoryRow): number {
  const k = r.kilosActual ?? r.kilos;
  return Number.isFinite(k) ? Number(k) : 0;
}

function parseIngresoMonth(fecha: string): string | null {
  if (!fecha?.trim()) return null;
  const t = fecha.trim();
  const d = new Date(t);
  if (!Number.isNaN(d.getTime())) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }
  const m = t.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/);
  if (m) {
    const day = Number(m[1]);
    const month = Number(m[2]);
    let year = Number(m[3]);
    if (year < 100) year += year >= 70 ? 1900 : 2000;
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, "0")}`;
    }
  }
  return null;
}

export type ExternaGraficoMetrics = {
  totalKg: number;
  top5ConKg: boolean;
  pieConKg: boolean;
  evolucionConKg: boolean;
};

/** Mismas reglas que la vista Gráfico (`operacion.tsx`) para saber si hay qué mostrar. */
export function metricasGraficoExterno(items: FridemInventoryRow[]): ExternaGraficoMetrics {
  const year = new Date().getFullYear();
  let totalKg = 0;

  const byDesc = new Map<string, number>();
  const byMarca = new Map<string, number>();
  const byMonth = new Map<string, number>();

  for (const r of items) {
    const kg = rowKg(r);
    totalKg += kg;

    const d = (r.descripcion || "Sin descripción").trim() || "Sin descripción";
    byDesc.set(d, (byDesc.get(d) ?? 0) + kg);

    const m = r.marca?.trim() || "Sin marca";
    byMarca.set(m, (byMarca.get(m) ?? 0) + kg);

    const ym = parseIngresoMonth(r.fechaIngreso);
    if (ym) byMonth.set(ym, (byMonth.get(ym) ?? 0) + kg);
  }

  const top5ConKg = [...byDesc.values()].some((kg) => kg > 0);
  const pieConKg = [...byMarca.values()].some((kg) => kg > 0);

  const allMonths = [...byMonth.keys()].sort();
  const yPrefix = `${year}-`;
  const thisYearMonths = allMonths.filter((k) => k.startsWith(yPrefix));
  const keys =
    thisYearMonths.length >= 1 ? thisYearMonths : allMonths.length ? allMonths.slice(-6) : [];
  const evolucionConKg = keys.some((k) => (byMonth.get(k) ?? 0) > 0);

  return { totalKg, top5ConKg, pieConKg, evolucionConKg };
}

export function graficoExternoVistaTieneDatos(items: FridemInventoryRow[]): boolean {
  if (items.length === 0) return false;
  const m = metricasGraficoExterno(items);
  return m.totalKg > 0 && (m.top5ConKg || m.pieConKg || m.evolucionConKg);
}
