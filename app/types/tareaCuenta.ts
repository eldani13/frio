import type { Timestamp } from "firebase/firestore";

export type TareaCuentaEstado = "pendiente" | "resuelta";

export type TareaCuenta = {
  id: string;
  titulo: string;
  detalle: string;
  clientId: string;
  clientName: string;
  creadoPorNombre: string;
  creadoPorUid: string;
  estado: TareaCuentaEstado;
  createdAt?: Timestamp | null;
};
