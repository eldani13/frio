import type { Client, Slot } from "../bodega";

export type SelectedSlotCardProps = {
  slot: Slot | null;
  onClose: () => void;
  onSave: (position: number, name: string, temperature: string) => void;
  canEdit?: boolean;
  clients?: Pick<Client, "id" | "name">[];
};
