import { db } from "@/lib/firebaseClient";
import { 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  doc, 
  updateDoc, 
  query, 
  where, // Agregado para el filtro
  orderBy,
  limit
} from "firebase/firestore";
import { Camion } from "@/app/types/camion";

const PARENT_COLLECTION = "warehouses";
const PARENT_ID = "GENERAL"; 
const SUB_COLLECTION = "trucks";

const getColRef = () => collection(db, PARENT_COLLECTION, PARENT_ID, SUB_COLLECTION);

export const TruckService = {
  
  toBase36: (num: number): string => {
    return num.toString(36).toUpperCase().padStart(4, '0');
  },

  /**
   * Obtiene los camiones filtrados por codeCuenta.
   * Sin orderBy para evitar errores de índice compuesto.
   */
  async getAll(codeCuenta: string): Promise<Camion[]> {
    try {
      const q = query(
        getColRef(), 
        where("codeCuenta", "==", codeCuenta)
      );
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

  /**
   * Crea un nuevo camión con correlativo GLOBAL y codeCuenta.
   */
  async create(data: Omit<Camion, 'id' | 'numericId' | 'code' | 'createdAt' | 'codeCuenta'>, codeCuenta: string) {
    try {
      // 1. Buscamos el último ID de forma global (sin where)
      const qLast = query(getColRef(), orderBy("numericId", "desc"), limit(1));
      const lastSnap = await getDocs(qLast);
      
      let nextId = 1;
      if (!lastSnap.empty) {
        const lastData = lastSnap.docs[0].data() as Camion;
        nextId = (lastData.numericId || 0) + 1;
      }

      // 2. Preparamos el objeto incluyendo el codeCuenta de la sesión
      const newTruck: Omit<Camion, 'id'> = {
        ...data,
        codeCuenta: codeCuenta, // Vinculación con la cuenta activa
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

  /**
   * Actualiza los datos del camión (mantiene tu lógica original)
   */
  async update(id: string, data: Partial<Omit<Camion, 'id' | 'numericId' | 'code'>>) {
    try {
      const docRef = doc(db, PARENT_COLLECTION, PARENT_ID, SUB_COLLECTION, id);
      
      // Filtramos para evitar sobrescribir campos protegidos
      const updateData = { ...data };
      delete (updateData as any).code;
      delete (updateData as any).numericId;
      delete (updateData as any).codeCuenta; // También protegemos el codeCuenta

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