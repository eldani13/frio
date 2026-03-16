import type { BodegaOrder, Box, Slot } from "../bodega";

export type RequestsQueueProps = {
  requests: BodegaOrder[];
  canExecute: boolean;
  onExecute: (requestId: string) => void;
  onReport?: (requestId: string) => void;
  slots: Slot[];
  inboundBoxes: Box[];
  outboundBoxes: Box[];
  alertasOperario: Array<{ position: number; [key: string]: unknown }>;
  alertasOperarioSolved: number[];
  llamadasJefe: Array<Record<string, unknown>>;
  onUpdateAlertasOperario: (next: Array<{ position: number; [key: string]: unknown }>) => void;
  onUpdateAlertasOperarioSolved: (next: number[]) => void;
  onUpdateLlamadasJefe: (next: Array<Record<string, unknown>>) => void;
};
