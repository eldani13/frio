import type { BodegaOrder } from "../bodega";

export type RequestsQueueProps = {
  requests: BodegaOrder[];
  canExecute: boolean;
  onExecute: (requestId: string) => void;
  onReport?: (requestId: string) => void;
};
