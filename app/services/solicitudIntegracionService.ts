import { db } from "@/lib/firebaseClient";
import type { SolicitudIntegracion } from "@/app/types/solicitudIntegracion";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  type Timestamp,
} from "firebase/firestore";

const COL = "solicitudesIntegracion";

function createdAtMs(s: SolicitudIntegracion): number {
  const ts = s.createdAt;
  if (ts && typeof ts.toMillis === "function") {
    try {
      return ts.toMillis();
    } catch {
      return 0;
    }
  }
  return 0;
}

function mapDoc(id: string, data: Record<string, unknown>): SolicitudIntegracion {
  const estadoRaw = data.estado;
  const estado =
    estadoRaw === "finalizado" ? "finalizado" : ("activo" as const);
  return {
    id,
    bodegaExternaId: String(data.bodegaExternaId ?? ""),
    bodegaExternaNombre: String(data.bodegaExternaNombre ?? ""),
    scraping: Boolean(data.scraping),
    api: Boolean(data.api),
    csvPlano: Boolean(data.csvPlano),
    clientId: String(data.clientId ?? ""),
    clientName: String(data.clientName ?? ""),
    codeCuenta: String(data.codeCuenta ?? ""),
    creadoPorNombre: String(data.creadoPorNombre ?? ""),
    creadoPorUid: String(data.creadoPorUid ?? ""),
    estado,
    createdAt: data.createdAt as Timestamp | null | undefined,
    finalizadaAt: data.finalizadaAt as Timestamp | null | undefined,
  };
}

export const SolicitudIntegracionService = {
  async crear(payload: {
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
  }) {
    const clientId = String(payload.clientId ?? "").trim();
    if (!clientId) throw new Error("sin_cuenta");
    if (!String(payload.creadoPorUid ?? "").trim()) throw new Error("sin_sesion");

    await addDoc(collection(db, "clientes", clientId, COL), {
      bodegaExternaId: String(payload.bodegaExternaId ?? "").trim(),
      bodegaExternaNombre: String(payload.bodegaExternaNombre ?? "").trim(),
      scraping: Boolean(payload.scraping),
      api: Boolean(payload.api),
      csvPlano: Boolean(payload.csvPlano),
      clientId,
      clientName: String(payload.clientName ?? "").trim(),
      codeCuenta: String(payload.codeCuenta ?? "").trim(),
      creadoPorNombre: String(payload.creadoPorNombre ?? "").trim(),
      creadoPorUid: String(payload.creadoPorUid ?? "").trim(),
      estado: "activo" as const,
      createdAt: serverTimestamp(),
    });
  },

  /** Todas las solicitudes de una cuenta (operador), más recientes primero. */
  subscribePorCliente(
    clientId: string,
    onNext: (items: SolicitudIntegracion[]) => void,
    onErr?: (e: Error) => void,
  ): () => void {
    const cid = String(clientId ?? "").trim();
    if (!cid) {
      onNext([]);
      return () => {};
    }
    const q = query(collection(db, "clientes", cid, COL), orderBy("createdAt", "desc"));
    return onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => mapDoc(d.id, d.data() as Record<string, unknown>));
        onNext(list);
      },
      (e) => onErr?.(e as Error),
    );
  },

  /**
   * Cola del configurador: solo solicitudes con estado activo.
   * Al ejecutar, se pasa a finalizado y desaparece de la cola (y en la cuenta del operador se actualiza solo).
   */
  subscribePendientesConfigurador(
    clientIds: string[],
    onNext: (items: SolicitudIntegracion[]) => void,
    onErr?: (e: Error) => void,
  ): () => void {
    const ids = [...new Set(clientIds.map((id) => String(id ?? "").trim()).filter(Boolean))];
    if (!ids.length) {
      onNext([]);
      return () => {};
    }

    const merged = new Map<string, SolicitudIntegracion>();

    const emit = () => {
      const list = [...merged.values()]
        .filter((s) => s.estado === "activo")
        .sort((a, b) => createdAtMs(a) - createdAtMs(b));
      onNext(list);
    };

    const unsubs = ids.map((clientId) => {
      const q = query(collection(db, "clientes", clientId, COL), orderBy("createdAt", "desc"));
      return onSnapshot(
        q,
        (snap) => {
          const prefix = `${clientId}::`;
          for (const key of [...merged.keys()]) {
            if (key.startsWith(prefix)) merged.delete(key);
          }
          snap.docs.forEach((d) => {
            const s = mapDoc(d.id, d.data() as Record<string, unknown>);
            merged.set(`${clientId}::${d.id}`, s);
          });
          emit();
        },
        (e) => onErr?.(e as Error),
      );
    });

    return () => unsubs.forEach((u) => u());
  },

  /** Cuando el configurador ejecuta la solicitud: pasa a finalizado (la tabla del operador se actualiza en vivo). */
  async ejecutarSolicitudConfigurador(clientId: string, id: string) {
    const cid = String(clientId ?? "").trim();
    if (!cid) throw new Error("sin_cliente");
    await updateDoc(doc(db, "clientes", cid, COL, id), {
      estado: "finalizado",
      finalizadaAt: serverTimestamp(),
    });
  },
};
