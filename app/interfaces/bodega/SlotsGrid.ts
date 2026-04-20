import type { ReactNode } from "react";
import type { Slot } from "../bodega";

export type SlotsGridProps = {
  slots: Slot[];
  selectedPosition: number | null;
  onSelect: (position: number) => void;
  /** Junto al título «Mapa de Bodega» (p. ej. acceso a órdenes de compra). */
  titleActions?: ReactNode;
  headerActions?: ReactNode;
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
};
