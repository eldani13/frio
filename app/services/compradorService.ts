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
import { Comprador } from "@/app/types/comprador";

const PARENT_COLLECTION = "clientes";
const SUB_COLLECTION = "compradores";

const getColRef = (idCliente: string) =>
  collection(db, PARENT_COLLECTION, idCliente, SUB_COLLECTION);

const getCompradorDocRef = (idCliente: string, id: string) =>
  doc(db, PARENT_COLLECTION, idCliente, SUB_COLLECTION, id);

export const CompradorService = {
  
  toBase36: (num: number): string => {
    return num.toString(36).toUpperCase().padStart(4, '0');
  },

  /**
   * Obtiene los compradores filtrados por cuenta.
   * Se quita el orderBy para que funcione sin necesidad de crear índices manuales.
   */
  async getAll(idCliente: string, codeCuenta: string): Promise<Comprador[]> {
    try {
      if (!idCliente?.trim()) return [];
      const q = query(
        getColRef(idCliente),
        where("codeCuenta", "==", codeCuenta)
      );
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(d => ({ 
        id: d.id, 
        ...d.data() 
      } as Comprador));
    } catch (error: unknown) {
      console.error("Error en CompradorService.getAll:", error instanceof Error ? error.message : error);
      return [];
    }
  },

  /** Crea comprador con correlativo por cliente; persiste codeCuenta. */
  async create(name: string, idCliente: string, codeCuenta: string) {
    try {
      if (!idCliente?.trim()) throw new Error("idCliente requerido");
      const qLast = query(getColRef(idCliente), orderBy("numericId", "desc"), limit(1));
      const lastSnap = await getDocs(qLast);
      
      let nextId = 1;
      if (!lastSnap.empty) {
        const lastData = lastSnap.docs[0].data() as Comprador;
        nextId = (lastData.numericId || 0) + 1;
      }

      const newComprador: Omit<Comprador, 'id'> = {
        name: name.trim(),
        codeCuenta: codeCuenta, // Campo de vinculación
        numericId: nextId,
        code: this.toBase36(nextId),
        createdAt: Date.now()
      };

      return await addDoc(getColRef(idCliente), newComprador);
    } catch (error: unknown) {
      console.error("Error en CompradorService.create:", error instanceof Error ? error.message : error);
      throw error;
    }
  },

  /**
   * Actualiza el comprador manteniendo tu lógica original del update.
   */
  async update(idCliente: string, id: string, data: Partial<Comprador>) {
    try {
      if (!idCliente?.trim()) throw new Error("idCliente requerido");
      const updateData: Partial<Comprador> = {};
      if (data.name) updateData.name = data.name.trim();

      return await updateDoc(getCompradorDocRef(idCliente, id), updateData);
    } catch (error: unknown) {
      console.error("Error en CompradorService.update:", error instanceof Error ? error.message : error);
      throw error;
    }
  },

  async delete(idCliente: string, id: string) {
    try {
      if (!idCliente?.trim()) throw new Error("idCliente requerido");
      return await deleteDoc(getCompradorDocRef(idCliente, id));
    } catch (error: unknown) {
      console.error("Error en CompradorService.delete:", error instanceof Error ? error.message : error);
      throw error;
    }
  }
};