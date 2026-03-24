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

const PARENT_COLLECTION = "warehouses";
const PARENT_ID = "GENERAL"; 
const SUB_COLLECTION = "compradores";

const getColRef = () => collection(db, PARENT_COLLECTION, PARENT_ID, SUB_COLLECTION);

export const CompradorService = {
  
  toBase36: (num: number): string => {
    return num.toString(36).toUpperCase().padStart(4, '0');
  },

  /**
   * Obtiene los compradores filtrados por cuenta.
   * Se quita el orderBy para que funcione sin necesidad de crear índices manuales.
   */
  async getAll(codeCuenta: string): Promise<Comprador[]> {
    try {
      const q = query(
        getColRef(), 
        where("codeCuenta", "==", codeCuenta)
      );
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(d => ({ 
        id: d.id, 
        ...d.data() 
      } as Comprador));
    } catch (error: any) {
      console.error("Error en CompradorService.getAll:", error.message);
      return [];
    }
  },

  /**
   * Crea un comprador con correlativo GLOBAL y guarda el codeCuenta.
   */
  async create(name: string, codeCuenta: string) {
    try {
      // Búsqueda del último ID de forma global (sin where)
      const qLast = query(getColRef(), orderBy("numericId", "desc"), limit(1));
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

      return await addDoc(getColRef(), newComprador);
    } catch (error: any) {
      console.error("Error en CompradorService.create:", error.message);
      throw error;
    }
  },

  /**
   * Actualiza el comprador manteniendo tu lógica original del update.
   */
  async update(id: string, data: Partial<Comprador>) {
    try {
      const docRef = doc(db, PARENT_COLLECTION, PARENT_ID, SUB_COLLECTION, id);
      
      const updateData: Partial<Comprador> = {};
      if (data.name) updateData.name = data.name.trim();

      return await updateDoc(docRef, updateData as any);
    } catch (error: any) {
      console.error("Error en CompradorService.update:", error.message);
      throw error;
    }
  },

  async delete(id: string) {
    try {
      const docRef = doc(db, PARENT_COLLECTION, PARENT_ID, SUB_COLLECTION, id);
      return await deleteDoc(docRef);
    } catch (error: any) {
      console.error("Error en CompradorService.delete:", error.message);
      throw error;
    }
  }
};