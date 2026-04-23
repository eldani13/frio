import type { ReactNode } from "react";
import type { Client, Slot } from "../bodega";
import type { SlotCantidadContext } from "@/app/lib/bodegaDisplay";

export type SlotsGridProps = {
  slots: Slot[];
  selectedPosition: number | null;
  onSelect: (position: number) => void;
  /** A la derecha del encabezado, junto a `headerActions` (p. ej. ventas en curso). */
  titleActions?: ReactNode;
  headerActions?: ReactNode;
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  clients?: Client[];
  slotCantidadContext?: SlotCantidadContext;
};
