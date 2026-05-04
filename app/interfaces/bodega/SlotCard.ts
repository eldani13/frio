import type { ReactNode } from "react";
import type { Client, Slot } from "../bodega";
import type { SlotCantidadContext } from "@/app/lib/bodegaDisplay";

export type SlotCardProps = {
  slot: Slot;
  isSelected: boolean;
  onSelect: (position: number) => void;
  /** Para etiquetas de cliente y modal de detalle en mapa. */
  clients?: Client[];
  slotCantidadContext?: SlotCantidadContext;
  /** Contenido extra bajo el bloque principal del modal de detalle (p. ej. procesamiento). */
  detalleChildren?: ReactNode;
  /** Sin clic ni modal (p. ej. administrador en «Estado de bodega»). */
  mapaSoloLectura?: boolean;
};
