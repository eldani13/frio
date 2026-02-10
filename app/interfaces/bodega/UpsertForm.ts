import type { Slot } from "../bodega";

export type UpsertFormProps = {
  slots: Slot[];
  position: number;
  itemId: string;
  temperature: string;
  onPositionChange: (value: number) => void;
  onItemIdChange: (value: string) => void;
  onTemperatureChange: (value: string) => void;
  onSubmit: () => void;
  submitLabel?: string;
  disabled?: boolean;
  helperText?: string;
};
