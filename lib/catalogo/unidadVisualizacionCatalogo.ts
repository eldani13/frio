/**
 * Unidades de visualización persistidas en catálogo (`unidadVisualizacion`).
 * Solo `peso` (y alias kg) afectan la lógica de stock en kg; el resto se trata como conteo discreto.
 */
export const UNIDAD_VIS_CATALOGO_OPCIONES = [
  { value: "cantidad", label: "Cantidad" },
  { value: "peso", label: "Peso (kg)" },
  { value: "unidades", label: "Unidades" },
  { value: "bolsas", label: "Bolsas" },
  { value: "cajitas", label: "Cajitas" },
  { value: "cajas", label: "Cajas" },
  { value: "bandejas", label: "Bandejas" },
  { value: "lonchas", label: "Lonchas" },
  { value: "paquetes", label: "Paquetes" },
  { value: "tiras", label: "Tiras" },
  { value: "bandas", label: "Bandas" },
] as const;

export type UnidadVisualizacionCatalogoValor = (typeof UNIDAD_VIS_CATALOGO_OPCIONES)[number]["value"];

export function etiquetaUnidadVisualizacion(value: string | undefined): string {
  const v = String(value ?? "").trim().toLowerCase();
  const row = UNIDAD_VIS_CATALOGO_OPCIONES.find((o) => o.value === v);
  return row?.label ?? (v || "—");
}

/** Modo para mapa / stock: peso continuo vs cantidad discreta. */
export function unidadVisualizacionStockMode(u: string | undefined): "cantidad" | "peso" {
  const x = String(u ?? "").trim().toLowerCase();
  if (x === "peso" || x === "kg" || x === "kilos" || x.includes("peso")) return "peso";
  return "cantidad";
}
