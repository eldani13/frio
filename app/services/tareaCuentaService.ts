import { db } from "@/lib/firebaseClient";
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
import type { TareaCuenta } from "@/app/types/tareaCuenta";

const COL = "tareasParaConfigurador";

function createdAtMs(t: TareaCuenta): number {
  const ts = t.createdAt;
  if (ts && typeof ts.toMillis === "function") {
    try {
      return ts.toMillis();
    } catch {
      return 0;
    }
  }
  return 0;
}

function mapDoc(id: string, data: Record<string, unknown>): TareaCuenta {
  return {
    id,
    titulo: String(data.titulo ?? ""),
    detalle: String(data.detalle ?? ""),
    clientId: String(data.clientId ?? ""),
    clientName: String(data.clientName ?? ""),
    creadoPorNombre: String(data.creadoPorNombre ?? ""),
    creadoPorUid: String(data.creadoPorUid ?? ""),
    estado: data.estado === "resuelta" ? "resuelta" : "pendiente",
    createdAt: data.createdAt as Timestamp | null | undefined,
  };
}

export const TareaCuentaService = {
  async crear(payload: {
    titulo: string;
    detalle: string;
    clientId: string;
    clientName: string;
    creadoPorNombre: string;
    creadoPorUid: string;
  }) {
    const docData = {
      titulo: String(payload.titulo ?? "").trim(),
      detalle: String(payload.detalle ?? "").trim(),
      clientId: String(payload.clientId ?? "").trim(),
      clientName: String(payload.clientName ?? "").trim(),
      creadoPorNombre: String(payload.creadoPorNombre ?? "").trim(),
      creadoPorUid: String(payload.creadoPorUid ?? "").trim(),
      estado: "pendiente" as const,
      createdAt: serverTimestamp(),
    };
    if (!docData.clientId) {
      throw new Error("sin_cuenta");
    }
    if (!docData.creadoPorUid) {
      throw new Error("sin_sesion");
    }
    await addDoc(collection(db, "clientes", docData.clientId, COL), docData);
  },

  /**
   * Una suscripción por cuenta (sin collectionGroup): evita el índice compuesto COLLECTION_GROUP
   * que suele faltar y provoca "failed-precondition" al listar tareas.
   */
  subscribePendientes(
    clientIds: string[],
    onNext: (items: TareaCuenta[]) => void,
    onErr?: (e: Error) => void,
  ): () => void {
    const ids = [...new Set(clientIds.map((id) => String(id ?? "").trim()).filter(Boolean))];
    if (!ids.length) {
      onNext([]);
      return () => {};
    }

    const merged = new Map<string, TareaCuenta>();

    const emit = () => {
      const list = [...merged.values()]
        .filter((t) => t.estado === "pendiente")
        .sort((a, b) => createdAtMs(b) - createdAtMs(a));
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
            const t = mapDoc(d.id, d.data() as Record<string, unknown>);
            merged.set(`${clientId}::${d.id}`, t);
          });
          emit();
        },
        (e) => onErr?.(e as Error),
      );
    });

    return () => unsubs.forEach((u) => u());
  },

  async marcarResuelta(clientId: string, id: string) {
    const cid = String(clientId ?? "").trim();
    if (!cid) throw new Error("sin_cliente");
    await updateDoc(doc(db, "clientes", cid, COL, id), {
      estado: "resuelta",
      resueltaAt: serverTimestamp(),
    });
  },
};
