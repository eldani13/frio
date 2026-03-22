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
import { Camion } from "@/app/types/camion"; // Ajusta la ruta según tu proyecto

const PARENT_COLLECTION = "warehouses";
const PARENT_ID = "GENERAL"; 
const SUB_COLLECTION = "trucks"; // Cambiado a trucks para diferenciar de proveedores

const getColRef = () => collection(db, PARENT_COLLECTION, PARENT_ID, SUB_COLLECTION);

export const TruckService = {
  
  // Transforma número a Base 36 y aplica el relleno de 4 dígitos (Ej: 1 -> 0001)
  toBase36: (num: number): string => {
    return num.toString(36).toUpperCase().padStart(4, '0');
  },

  async getAll(): Promise<Camion[]> {
    try {
      const q = query(getColRef(), orderBy("numericId", "asc"));
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(d => ({ 
        id: d.id, 
        ...d.data() 
      } as Camion));
    } catch (error: any) {
      console.error("Error en TruckService.getAll:", error.message);
      return [];
    }
  },

  async create(data: Omit<Camion, 'id' | 'numericId' | 'code' | 'createdAt'>) {
    try {
      // 1. Buscamos el último ID para el autonumérico
      const qLast = query(getColRef(), orderBy("numericId", "desc"), limit(1));
      const lastSnap = await getDocs(qLast);
      
      let nextId = 1;
      if (!lastSnap.empty) {
        const lastData = lastSnap.docs[0].data() as Camion;
        nextId = (lastData.numericId || 0) + 1;
      }

      // 2. Preparamos el nuevo objeto combinando los datos del formulario con los autogenerados
      const newTruck: Omit<Camion, 'id'> = {
        ...data,
        numericId: nextId,
        code: this.toBase36(nextId),
        createdAt: Date.now()
      };

      return await addDoc(getColRef(), newTruck);
    } catch (error: any) {
      console.error("Error en TruckService.create:", error.message);
      throw error;
    }
  },

  async update(id: string, data: Partial<Omit<Camion, 'id' | 'numericId' | 'code'>>) {
    try {
      const docRef = doc(db, PARENT_COLLECTION, PARENT_ID, SUB_COLLECTION, id);
      
      // Filtramos para evitar sobrescribir el código o el ID numérico por error
      const { ...updateData } = data;
      delete (updateData as any).code;
      delete (updateData as any).numericId;

      return await updateDoc(docRef, updateData);
    } catch (error: any) {
      console.error("Error en TruckService.update:", error.message);
      throw error;
    }
  },

  async delete(id: string) {
    try {
      const docRef = doc(db, PARENT_COLLECTION, PARENT_ID, SUB_COLLECTION, id);
      return await deleteDoc(docRef);
    } catch (error: any) {
      console.error("Error en TruckService.delete:", error.message);
      throw error;
    }
  }
};