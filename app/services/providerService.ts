import { db } from "@/lib/firebaseClient";
import { 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  doc, 
  updateDoc, 
  query, 
  orderBy,
  limit
} from "firebase/firestore";
import { Provider } from "@/app/types/provider";

const PARENT_COLLECTION = "warehouses";
const PARENT_ID = "GENERAL"; 
const SUB_COLLECTION = "providers";

const getColRef = () => collection(db, PARENT_COLLECTION, PARENT_ID, SUB_COLLECTION);

export const ProviderService = {
  // Transforma número a Base 36 y aplica el relleno de 4 dígitos (Ej: 1 -> 0001, 10 -> 000A)
  toBase36: (num: number): string => {
    return num.toString(36).toUpperCase().padStart(4, '0');
  },

  async getAll(): Promise<Provider[]> {
    try {
      const q = query(getColRef(), orderBy("numericId", "asc"));
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

  async create(name: string) {
    try {
      // 1. Buscamos el último ID para el autonumérico
      const qLast = query(getColRef(), orderBy("numericId", "desc"), limit(1));
      const lastSnap = await getDocs(qLast);
      
      let nextId = 1;
      if (!lastSnap.empty) {
        const lastData = lastSnap.docs[0].data() as Provider;
        nextId = (lastData.numericId || 0) + 1;
      }

      // 2. Generamos el objeto con el código ya formateado
      const newProvider: Omit<Provider, 'id'> = {
        numericId: nextId,
        code: this.toBase36(nextId), // Aquí se aplica el 0000
        name: name.trim(),
        createdAt: Date.now()
      };

      return await addDoc(getColRef(), newProvider);
    } catch (error: any) {
      console.error("Error en create:", error.message);
      throw error;
    }
  },

  async update(id: string, data: Partial<Provider>) {
    try {
      const docRef = doc(db, PARENT_COLLECTION, PARENT_ID, SUB_COLLECTION, id);
      // Ojo: No permitimos actualizar 'code' ni 'numericId' para mantener integridad
      const { name } = data; 
      return await updateDoc(docRef, { name });
    } catch (error: any) {
      console.error("Error en update:", error.message);
      throw error;
    }
  },

  async delete(id: string) {
    try {
      const docRef = doc(db, PARENT_COLLECTION, PARENT_ID, SUB_COLLECTION, id);
      return await deleteDoc(docRef);
    } catch (error: any) {
      console.error("Error en delete:", error.message);
      throw error;
    }
  }
};