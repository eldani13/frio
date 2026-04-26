"use client";

type Align = "start" | "center" | "end";

const justify: Record<Align, string> = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
};

/** Colores alineados con cada zona: mapa (azul/violeta), entrada (esmeralda), salida (rosa). `global`: una sola leyenda para todo el tablero. */
export type BodegaSlotLegendVariant = "mapa" | "entrada" | "salida" | "global";

const SWATCH: Record<
  BodegaSlotLegendVariant,
  { primario: string; procesado: string; vacia: string; label: string }
> = {
  mapa: {
    primario: "inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-sky-400 sm:h-3 sm:w-3",
    procesado: "inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-violet-400 sm:h-3 sm:w-3",
    vacia:
      "inline-block h-2.5 w-2.5 shrink-0 rounded-md border-2 border-dashed border-slate-400 bg-slate-50 sm:h-3 sm:w-3",
    label: "text-slate-700",
  },
  entrada: {
    primario:
      "inline-block h-2.5 w-3 shrink-0 rounded-sm border border-emerald-500 bg-emerald-200 sm:h-3 sm:w-4",
    procesado:
      "inline-block h-2.5 w-3 shrink-0 rounded-sm border border-emerald-900 bg-emerald-600 sm:h-3 sm:w-4",
    vacia: "inline-block h-2 w-2 shrink-0 rounded-full border border-emerald-400 bg-emerald-100 sm:h-3 sm:w-3",
    label: "text-emerald-900/90",
  },
  salida: {
    primario:
      "inline-block h-2.5 w-3 shrink-0 rounded-sm border border-pink-400 bg-pink-200 sm:h-3 sm:w-4",
    procesado:
      "inline-block h-2.5 w-3 shrink-0 rounded-sm border border-pink-800 bg-pink-600 sm:h-3 sm:w-4",
    vacia:
      "inline-block h-2 w-2 shrink-0 rounded border-2 border-dashed border-pink-400 bg-transparent sm:h-3 sm:w-3",
    label: "text-pink-900/90",
  },
  /** Tonos neutros: más claro = primario, más oscuro = procesado (válido en todas las zonas). */
  global: {
    primario:
      "inline-block h-2.5 w-3 shrink-0 rounded-md border border-slate-400/90 bg-slate-200 sm:h-3 sm:w-4",
    procesado:
      "inline-block h-2.5 w-3 shrink-0 rounded-md border border-slate-700 bg-slate-600 sm:h-3 sm:w-4",
    vacia:
      "inline-block h-2.5 w-2.5 shrink-0 rounded-md border-2 border-dashed border-slate-400 bg-transparent sm:h-3 sm:w-3",
    label: "text-slate-600",
  },
};

type Spacing = "default" | "none";

/**
 * Leyenda de estados de casillero: ocupada primario, ocupada procesado, vacía.
 * Usá `variant` según la división, o `global` para una única leyenda al pie del tablero.
 */
export default function BodegaSlotLegend({
  className = "",
  align = "end",
  variant = "mapa",
  spacing = "default",
}: {
  className?: string;
  align?: Align;
  variant?: BodegaSlotLegendVariant;
  /** `none`: sin margen superior (útil con pie fijo / `mt-auto`). */
  spacing?: Spacing;
}) {
  const tone = SWATCH[variant];
  const marginTop = spacing === "default" ? "mt-2 sm:mt-3" : "";

  return (
    <div
      className={`flex w-full ${justify[align]} ${marginTop} ${className}`}
      role="list"
      aria-label="Leyenda de estados de casillero"
    >
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 sm:gap-x-6">
        <div className="flex items-center gap-2" role="listitem">
          <span className={tone.primario} aria-hidden />
          <span className={`text-base sm:text-xs ${tone.label}`}>Ocupada (primario)</span>
        </div>
        <div className="flex items-center gap-2" role="listitem">
          <span className={tone.procesado} aria-hidden />
          <span className={`text-base sm:text-xs ${tone.label}`}>Ocupada (procesado)</span>
        </div>
        <div className="flex items-center gap-2" role="listitem">
          <span className={tone.vacia} aria-hidden />
          <span className={`text-base sm:text-xs ${tone.label}`}>Vacía</span>
        </div>
      </div>
    </div>
  );
}
