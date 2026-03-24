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

const PARENT_COLLECTION = "warehouses";
const PARENT_ID = "GENERAL"; 
const SUB_COLLECTION = "providers";

const getColRef = () => collection(db, PARENT_COLLECTION, PARENT_ID, SUB_COLLECTION);

export const ProviderService = {
  toBase36: (num: number): string => {
    return num.toString(36).toUpperCase().padStart(4, '0');
  },

  // 1. Obtener todos filtrados por la cuenta del usuario
  async getAll(codeCuenta: string): Promise<Provider[]> {
    try {
      const q = query(
        getColRef(), 
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

  // 2. Crear con correlativo GLOBAL y guardar codeCuenta
  async create(name: string, codeCuenta: string) {
    try {
      // Correlativo GLOBAL (sin 'where') para que el 0001, 0002 sea único en la DB
      const qLast = query(getColRef(), orderBy("numericId", "desc"), limit(1));
      const lastSnap = await getDocs(qLast);
      
      let nextId = 1;
      if (!lastSnap.empty) {
        const lastData = lastSnap.docs[0].data();
        nextId = (Number(lastData.numericId) || 0) + 1;
      }

      const newProvider: Omit<Provider, 'id'> = {
        name: name.trim(),
        codeCuenta: codeCuenta, // Se guarda para que el dueño lo vea
        numericId: nextId,      // ID global
        code: this.toBase36(nextId),
        createdAt: Date.now()
      };

      return await addDoc(getColRef(), newProvider);
    } catch (error: any) {
      console.error("Error en create:", error.message);
      throw error;
    }
  },

  // 3. Update RESTAURADO (como lo tenías originalmente)
  async update(id: string, data: Partial<Provider>) {
    try {
      const docRef = doc(db, PARENT_COLLECTION, PARENT_ID, SUB_COLLECTION, id);
      // Solo permitimos actualizar el nombre (u otros campos que vengan en data)
      // pero evitamos tocar code o numericId por integridad
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