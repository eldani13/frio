import { db } from "@/lib/firebaseClient";
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  deleteDoc,
  doc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
} from "firebase/firestore";
import { Provider } from "@/app/types/provider";

const PARENT_COLLECTION = "clientes";
const SUB_COLLECTION = "providers";

const getColRef = (idCliente: string) =>
  collection(db, PARENT_COLLECTION, idCliente, SUB_COLLECTION);

const getProviderDocRef = (idCliente: string, id: string) =>
  doc(db, PARENT_COLLECTION, idCliente, SUB_COLLECTION, id);

export const ProviderService = {
  toBase36: (num: number): string => {
    return num.toString(36).toUpperCase().padStart(4, '0');
  },

  // 1. Filtrado por codeCuenta en documento; la jerarquía usa idCliente (session.clientId)
  async getAll(idCliente: string, codeCuenta: string): Promise<Provider[]> {
    try {
      if (!idCliente?.trim()) return [];
      const q = query(
        getColRef(idCliente),
        where("codeCuenta", "==", codeCuenta),
      );
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(d => ({ 
        id: d.id, 
        ...d.data() 
      } as Provider));
    } catch (error: unknown) {
      console.error("Error en getAll:", error instanceof Error ? error.message : error);
      return [];
    }
  },

  /** Un proveedor por ID de documento (misma subcolección bajo el cliente). */
  async getById(idCliente: string, id: string): Promise<Provider | null> {
    try {
      if (!idCliente?.trim() || !id?.trim()) return null;
      const snap = await getDoc(getProviderDocRef(idCliente.trim(), id.trim()));
      if (!snap.exists()) return null;
      return { id: snap.id, ...snap.data() } as Provider;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error("ProviderService.getById:", msg);
      return null;
    }
  },

  // 2. Correlativo por cliente (subcolección); codeCuenta se mantiene en el documento
  async create(
    payload: { name: string; nombre?: string; telefono?: string; email?: string },
    idCliente: string,
    codeCuenta: string,
  ) {
    try {
      if (!idCliente?.trim()) throw new Error("idCliente requerido");
      const qLast = query(getColRef(idCliente), orderBy("numericId", "desc"), limit(1));
      const lastSnap = await getDocs(qLast);
      
      let nextId = 1;
      if (!lastSnap.empty) {
        const lastData = lastSnap.docs[0].data();
        nextId = (Number(lastData.numericId) || 0) + 1;
      }

      const newProvider: Omit<Provider, 'id'> = {
        name: payload.name.trim(),
        nombre: payload.nombre?.trim() ?? "",
        telefono: payload.telefono?.trim() ?? "",
        email: payload.email?.trim() ?? "",
        codeCuenta: codeCuenta, // Se guarda para que el dueño lo vea
        numericId: nextId,
        code: this.toBase36(nextId),
        createdAt: Date.now()
      };

      return await addDoc(getColRef(idCliente), newProvider);
    } catch (error: unknown) {
      console.error("Error en create:", error instanceof Error ? error.message : error);
      throw error;
    }
  },

  async update(idCliente: string, id: string, data: Partial<Pick<Provider, "name" | "nombre" | "telefono" | "email">>) {
    try {
      if (!idCliente?.trim()) throw new Error("idCliente requerido");
      const patch: Record<string, string> = {};
      if (data.name !== undefined) patch.name = data.name.trim();
      if (data.nombre !== undefined) patch.nombre = data.nombre.trim();
      if (data.telefono !== undefined) patch.telefono = data.telefono.trim();
      if (data.email !== undefined) patch.email = data.email.trim();
      return await updateDoc(getProviderDocRef(idCliente, id), patch);
    } catch (error: unknown) {
      console.error("Error en update:", error instanceof Error ? error.message : error);
      throw error;
    }
  },

  /**
   * Listado en vivo (misma consulta que `getAll`).
   * @returns función para cancelar la suscripción.
   */
  subscribeByCodeCuenta(
    idCliente: string,
    codeCuenta: string,
    onNext: (rows: Provider[]) => void,
    onError?: (e: Error) => void,
  ): () => void {
    if (!idCliente?.trim()) {
      onNext([]);
      return () => {};
    }
    const q = query(getColRef(idCliente), where("codeCuenta", "==", codeCuenta));
    return onSnapshot(
      q,
      (snap) => {
        onNext(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Provider)));
      },
      (err) => onError?.(err as Error),
    );
  },

  async delete(idCliente: string, id: string) {
    try {
      if (!idCliente?.trim()) throw new Error("idCliente requerido");
      return await deleteDoc(getProviderDocRef(idCliente, id));
    } catch (error: unknown) {
      console.error("Error en delete:", error instanceof Error ? error.message : error);
      throw error;
    }
  }
};