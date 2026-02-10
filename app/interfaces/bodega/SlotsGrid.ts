import type { Slot } from "../bodega";

export type SlotsGridProps = {
  slots: Slot[];
  selectedPosition: number | null;
  onSelect: (position: number) => void;
};
