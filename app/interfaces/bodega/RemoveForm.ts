import type { Slot } from "../bodega";

export type RemoveFormProps = {
  slots: Slot[];
  position: number;
  onPositionChange: (value: number) => void;
  onSubmit: () => void;
  submitLabel?: string;
  disabled?: boolean;
};
