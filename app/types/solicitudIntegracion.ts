import type { Timestamp } from "firebase/firestore";

export type EstadoSolicitudIntegracion = "activo" | "finalizado";

export type SolicitudIntegracion = {
  id: string;
  bodegaExternaId: string;
  bodegaExternaNombre: string;
  scraping: boolean;
  api: boolean;
  csvPlano: boolean;
  clientId: string;
  clientName: string;
  codeCuenta: string;
  creadoPorNombre: string;
  creadoPorUid: string;
  estado: EstadoSolicitudIntegracion;
  createdAt: Timestamp | null | undefined;
  finalizadaAt?: Timestamp | null;
};

export function etiquetasTipoIntegracionRow(row: {
  scraping: boolean;
  api: boolean;
  csvPlano: boolean;
}): string {
  const parts: string[] = [];
  if (row.scraping) parts.push("Scraping");
  if (row.api) parts.push("API");
  if (row.csvPlano) parts.push("CSV plano");
  return parts.length ? parts.join(" · ") : "—";
}
