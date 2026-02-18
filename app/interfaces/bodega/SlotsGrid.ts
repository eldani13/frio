import type { ReactNode } from "react";
import type { Slot } from "../bodega";

export type SlotsGridProps = {
  slots: Slot[];
  selectedPosition: number | null;
  onSelect: (position: number) => void;
  headerActions?: ReactNode;
};
