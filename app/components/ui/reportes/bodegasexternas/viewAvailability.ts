import type { FridemInventoryRow } from "@/lib/fridem/fridemInventory";
import { cuentaExternaTieneReporteEmbed } from "./externaReportEmbed";
import { graficoExternoVistaTieneDatos } from "./graficoExternaMetrics";

export type ExternaViewKey = "CA" | "OP" | "REP";

export type ExternaViewsAvailability = {
  listado: boolean;
  grafico: boolean;
  reporte: boolean;
};

/** Listado: tabla con al menos un registro cargado. */
export function listadoExternoTieneDatos(
  items: FridemInventoryRow[],
  loading: boolean,
  error: string | null,
): boolean {
  return !loading && !error && items.length > 0;
}

/** Gráfico: solo si la vista puede dibujar al menos un gráfico con kg (no basta el listado). */
export function graficoExternoTieneDatos(
  items: FridemInventoryRow[],
  loading: boolean,
  error: string | null,
): boolean {
  if (loading || error) return false;
  return graficoExternoVistaTieneDatos(items);
}

/** Reporte: cuenta con URL de Looker Studio configurada (no depende del inventario Fridem). */
export function reporteExternoTieneDatos(codeCuenta?: string | null): boolean {
  return cuentaExternaTieneReporteEmbed(codeCuenta);
}

export function disponibilidadVistasExternas(
  items: FridemInventoryRow[],
  loading: boolean,
  error: string | null,
  codeCuenta?: string | null,
): ExternaViewsAvailability {
  return {
    listado: listadoExternoTieneDatos(items, loading, error),
    grafico: graficoExternoTieneDatos(items, loading, error),
    reporte: reporteExternoTieneDatos(codeCuenta),
  };
}

export function algunaVistaExternaDisponible(availability: ExternaViewsAvailability): boolean {
  return availability.listado || availability.grafico || availability.reporte;
}

export function primeraVistaExternaDisponible(
  availability: ExternaViewsAvailability,
): ExternaViewKey | null {
  if (availability.listado) return "CA";
  if (availability.grafico) return "OP";
  if (availability.reporte) return "REP";
  return null;
}

export function vistaExternaHabilitada(
  view: ExternaViewKey | null,
  availability: ExternaViewsAvailability,
): boolean {
  if (!view) return false;
  if (view === "CA") return availability.listado;
  if (view === "OP") return availability.grafico;
  return availability.reporte;
}
