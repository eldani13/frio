import { db } from "@/lib/firebaseClient";
import { 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  doc, 
  updateDoc, 
  query, 
  where, // Agregado para filtrar
  orderBy,
  limit
} from "firebase/firestore";
import { Planta } from "@/app/types/planta";

const PARENT_COLLECTION = "warehouses";
const PARENT_ID = "GENERAL"; 
const SUB_COLLECTION = "plantas";

const getColRef = () => collection(db, PARENT_COLLECTION, PARENT_ID, SUB_COLLECTION);

export const PlantaService = {
  toBase36: (num: number): string => {
    return num.toString(36).toUpperCase().padStart(4, '0');
  },

  // 1. Recibe codeCuenta y NO tiene orderBy para evitar el error de índice
  async getAll(codeCuenta: string): Promise<Planta[]> {
    try {
      const q = query(
        getColRef(), 
        where("codeCuenta", "==", codeCuenta)
      );
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(d => ({ 
        id: d.id, 
        ...d.data() 
      } as Planta));
    } catch (error: any) {
      console.error("Error en PlantaService.getAll:", error.message);
      return [];
    }
  },

  // 2. Agregamos codeCuenta a los parámetros y al objeto final
  async create(data: Omit<Planta, 'id' | 'numericId' | 'code' | 'createdAt' | 'codeCuenta'>, codeCuenta: string) {
    try {
      // Búsqueda GLOBAL del correlativo (sin where)
      const qLast = query(getColRef(), orderBy("numericId", "desc"), limit(1));
      const lastSnap = await getDocs(qLast);
      
      let nextId = 1;
      if (!lastSnap.empty) {
        const lastData = lastSnap.docs[0].data() as Planta;
        nextId = (lastData.numericId || 0) + 1;
      }

      const newPlanta: Omit<Planta, 'id'> = {
        ...data,
        codeCuenta: codeCuenta, // Guardamos la cuenta del usuario
        numericId: nextId,
        code: this.toBase36(nextId),
        createdAt: Date.now()
      };

      return await addDoc(getColRef(), newPlanta);
    } catch (error: any) {
      console.error("Error en PlantaService.create:", error.message);
      throw error;
    }
  },

  async update(id: string, data: Partial<Planta>) {
    try {
      const docRef = doc(db, PARENT_COLLECTION, PARENT_ID, SUB_COLLECTION, id);
      
      const { 
        name, 
        plantName, 
        location, 
        maxPallets, 
        tempRange, 
        isOperational 
      } = data;

      const updateData = { 
        name, 
        plantName, 
        location, 
        maxPallets, 
        tempRange, 
        isOperational 
      };

      return await updateDoc(docRef, updateData);
    } catch (error: any) {
      console.error("Error en PlantaService.update:", error.message);
      throw error;
    }
  },

  async delete(id: string) {
    try {
      const docRef = doc(db, PARENT_COLLECTION, PARENT_ID, SUB_COLLECTION, id);
      return await deleteDoc(docRef);
    } catch (error: any) {
      console.error("Error en PlantaService.delete:", error.message);
      throw error;
    }
  }
};