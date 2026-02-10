import type { Slot } from "../bodega";

export type SlotCardProps = {
  slot: Slot;
  isSelected: boolean;
  onSelect: (position: number) => void;
};
