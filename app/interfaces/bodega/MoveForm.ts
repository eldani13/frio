import type { Slot } from "../bodega";

export type MoveFormProps = {
  slots: Slot[];
  from: number;
  to: number;
  onFromChange: (value: number) => void;
  onToChange: (value: number) => void;
  onSubmit: () => void;
  submitLabel?: string;
  disabled?: boolean;
};
