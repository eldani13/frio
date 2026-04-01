import type { Slot } from "../app/interfaces/bodega";

/** Alineado con ingresos / mapa: por encima de 5 °C se considera alerta. */
export const TEMP_ESTABLE_MAX_C = 5;

export type CategoriaTermica = "estable" | "alta" | "sin_dato";

export type FilaInventarioInterno = {
  key: string;
  posicion: number;
  nombre: string;
  cantidadKg: number | null;
  temperatura: number | null;
  estadoTexto: string;
  esAlerta: boolean;
  categoriaTermica: CategoriaTermica;
};

function categoriaTermica(temp: number | null | undefined): CategoriaTermica {
  if (temp === null || temp === undefined || Number.isNaN(Number(temp))) {
    return "sin_dato";
  }
  return Number(temp) > TEMP_ESTABLE_MAX_C ? "alta" : "estable";
}

export function filasInventarioInternoFromSlots(slots: Slot[]): FilaInventarioInterno[] {
  return [...slots]
    .filter((s) => s.autoId?.trim())
    .sort((a, b) => a.position - b.position)
    .map((s) => {
      const cat = categoriaTermica(s.temperature);
      const estadoTexto =
        cat === "sin_dato"
          ? "Sin dato térmico"
          : cat === "alta"
            ? "Alta temperatura"
            : "Temperatura estable";
      const kg =
        typeof s.quantityKg === "number" && Number.isFinite(s.quantityKg)
          ? s.quantityKg
          : null;
      return {
        key: `${s.position}-${s.autoId}`,
        posicion: s.position,
        nombre: s.name?.trim() || "Sin nombre",
        cantidadKg: kg,
        temperatura: s.temperature,
        estadoTexto,
        esAlerta: cat === "alta",
        categoriaTermica: cat,
      };
    });
}

/** Suma de kg en posiciones ocupadas (misma lógica que el pie del listado). */
export function totalKgInternoDesdeSlots(slots: Slot[]): number {
  return filasInventarioInternoFromSlots(slots).reduce(
    (acc, r) => acc + (r.cantidadKg ?? 0),
    0,
  );
}
