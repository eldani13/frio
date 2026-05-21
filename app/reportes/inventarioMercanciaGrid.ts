import type { ModuloTipo } from "./inventarioMercanciaTypes";

export type InventarioModuloCardState = {
  id: ModuloTipo;
  label: string;
  kg: number;
  loading: boolean;
  aplica: boolean;
};

/** Texto secundario de la tarjeta: kg, carga o no aplica. */
export function etiquetaKgTarjetaInventario(loading: boolean, kg: number, aplica: boolean): string {
  if (loading && kg === 0) return "(…)";
  if (!aplica) return "No aplica";
  return `(${kg.toLocaleString("es-CO", { maximumFractionDigits: 2 })} Kg)`;
}

export function moduloInventarioPermiteEntrada(state: InventarioModuloCardState): boolean {
  return !state.loading && state.aplica;
}
