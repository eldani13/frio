import type { BodegaOrder, Box, OrderSource, Slot } from "../bodega";

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
  /** Al guardar temperatura desde el flujo de alerta (operario), persistir en slots / ingreso / salida. */
  onPersistTemperatureForAlert?: (
    position: number,
    newTemp: number,
    zone: OrderSource,
  ) => void;
  /**
   * Resolver alerta de temperatura en un solo persist: temperatura en la zona + quitar alerta + solved.
   * Evita que Firestore (merge + snapshot) vuelva a inyectar la alerta antes de quitarse del estado.
   */
  onOperarioResolveTemperatureAlert?: (payload: {
    position: number;
    newTemp: number;
    zone: OrderSource;
    alertIndex: number;
  }) => void;
};
