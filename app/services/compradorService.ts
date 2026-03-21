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
import { Comprador } from "@/app/types/comprador"; // Asegúrate de que la ruta sea correcta

const PARENT_COLLECTION = "warehouses";
const PARENT_ID = "GENERAL"; 
const SUB_COLLECTION = "compradores"; // Cambiado a compradores

const getColRef = () => collection(db, PARENT_COLLECTION, PARENT_ID, SUB_COLLECTION);

export const CompradorService = {
  
  /**
   * Transforma número a Base 36 y aplica el relleno de 4 dígitos 
   * Ej: 1 -> 0001, 10 -> 000A, 35 -> 000Z, 36 -> 0010
   */
  toBase36: (num: number): string => {
    return num.toString(36).toUpperCase().padStart(4, '0');
  },

  /**
   * Obtiene todos los compradores ordenados por ID numérico
   */
  async getAll(): Promise<Comprador[]> {
    try {
      const q = query(getColRef(), orderBy("numericId", "asc"));
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
   * Crea un nuevo comprador calculando el siguiente ID autonumérico
   */
  async create(name: string) {
    try {
      // 1. Buscamos el último ID para el autonumérico
      const qLast = query(getColRef(), orderBy("numericId", "desc"), limit(1));
      const lastSnap = await getDocs(qLast);
      
      let nextId = 1;
      if (!lastSnap.empty) {
        const lastData = lastSnap.docs[0].data() as Comprador;
        nextId = (lastData.numericId || 0) + 1;
      }

      // 2. Generamos el objeto según la interfaz Comprador
      const newComprador: Omit<Comprador, 'id'> = {
        numericId: nextId,
        code: this.toBase36(nextId),
        name: name.trim(),
        createdAt: Date.now()
      };

      return await addDoc(getColRef(), newComprador);
    } catch (error: any) {
      console.error("Error en CompradorService.create:", error.message);
      throw error;
    }
  },

  /**
   * Actualiza el nombre de un comprador
   */
  async update(id: string, data: Partial<Comprador>) {
    try {
      const docRef = doc(db, PARENT_COLLECTION, PARENT_ID, SUB_COLLECTION, id);
      
      // Solo permitimos actualizar el nombre para no romper la secuencia del código
      const updateData: Partial<Comprador> = {};
      if (data.name) updateData.name = data.name.trim();

      return await updateDoc(docRef, updateData as any);
    } catch (error: any) {
      console.error("Error en CompradorService.update:", error.message);
      throw error;
    }
  },

  /**
   * Elimina un comprador por su ID de documento
   */
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