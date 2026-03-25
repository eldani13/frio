import { db } from "@/lib/firebaseClient";
import { 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  doc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  limit 
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
    } catch (error: any) {
      console.error("Error en getAll:", error.message);
      return [];
    }
  },

  // 2. Correlativo por cliente (subcolección); codeCuenta se mantiene en el documento
  async create(name: string, idCliente: string, codeCuenta: string) {
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
        name: name.trim(),
        codeCuenta: codeCuenta, // Se guarda para que el dueño lo vea
        numericId: nextId,
        code: this.toBase36(nextId),
        createdAt: Date.now()
      };

      return await addDoc(getColRef(idCliente), newProvider);
    } catch (error: any) {
      console.error("Error en create:", error.message);
      throw error;
    }
  },

  async update(idCliente: string, id: string, data: Partial<Provider>) {
    try {
      if (!idCliente?.trim()) throw new Error("idCliente requerido");
      const { name } = data;
      return await updateDoc(getProviderDocRef(idCliente, id), { name });
    } catch (error: any) {
      console.error("Error en update:", error.message);
      throw error;
    }
  },

  async delete(idCliente: string, id: string) {
    try {
      if (!idCliente?.trim()) throw new Error("idCliente requerido");
      return await deleteDoc(getProviderDocRef(idCliente, id));
    } catch (error: any) {
      console.error("Error en delete:", error.message);
      throw error;
    }
  }
};