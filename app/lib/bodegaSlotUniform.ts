/**
 * Casilleros de bodega: misma altura (y ancho al 100 % de la celda) con o sin contenido.
 * Incluye borde en la altura (`box-border`).
 * Entrada, almacenamiento, procesamiento y salida usan esta misma huella.
 */
export const BODEGA_SLOT_SHELL_CLASS =
  "box-border h-[140px] min-h-[140px] max-h-[140px] w-full max-w-full overflow-hidden";

/** Radio exterior unificado (mapa, entrada, salida, procesamiento). */
export const BODEGA_SLOT_ROUNDED = "rounded-xl";

/** Padding exterior unificado en casilleros ocupados y vacíos. */
export const BODEGA_SLOT_SHELL_PADDING = "p-2";

/**
 * Bloque bajo el número de posición: misma composición que `SlotCard` / `BodegaZonaCajaCard`.
 */
export const BODEGA_SLOT_BODY_CLASS = "relative flex min-h-0 w-full flex-1 flex-col pt-4";

/**
 * Tarjeta interior (ocupada o vacía): **misma altura** en todas las zonas para que no “crezca” el contenido.
 */
export const BODEGA_SLOT_INNER_FIXED_CLASS =
  "flex h-[96px] min-h-[96px] max-h-[96px] w-full min-w-0 flex-col overflow-hidden rounded-lg border bg-white p-2 shadow-sm";

/** Área del símbolo «+» en casilleros vacíos (sin borde propio: solo carcasa + tarjeta interior discontinua). */
export const BODEGA_SLOT_EMPTY_PLUS_AREA_CLASS =
  "flex min-h-0 flex-1 items-center justify-center";

/** Misma rejilla que `SlotsGrid` del mapa de almacenamiento (huella por celda). */
export const BODEGA_SLOTS_GRID_ALMACEN_CLASS =
  "grid w-full min-w-0 grid-cols-2 gap-1.5 sm:grid-cols-3 sm:gap-2 md:grid-cols-4 lg:grid-cols-4 [&>*]:min-w-0";
