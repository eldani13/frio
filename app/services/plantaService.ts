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

const PARENT_COLLECTION = "clientes";
const SUB_COLLECTION = "plantas";

const getColRef = (idCliente: string) =>
  collection(db, PARENT_COLLECTION, idCliente, SUB_COLLECTION);

const getPlantaDocRef = (idCliente: string, id: string) =>
  doc(db, PARENT_COLLECTION, idCliente, SUB_COLLECTION, id);

export const PlantaService = {
  toBase36: (num: number): string => {
    return num.toString(36).toUpperCase().padStart(4, '0');
  },

  // 1. Recibe codeCuenta y NO tiene orderBy para evitar el error de índice
  async getAll(idCliente: string, codeCuenta: string): Promise<Planta[]> {
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
      } as Planta));
    } catch (error: unknown) {
      console.error("Error en PlantaService.getAll:", error instanceof Error ? error.message : error);
      return [];
    }
  },

  // 2. Agregamos codeCuenta a los parámetros y al objeto final
  async create(data: Omit<Planta, 'id' | 'numericId' | 'code' | 'createdAt' | 'codeCuenta'>, idCliente: string, codeCuenta: string) {
    try {
      if (!idCliente?.trim()) throw new Error("idCliente requerido");
      const qLast = query(getColRef(idCliente), orderBy("numericId", "desc"), limit(1));
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

      return await addDoc(getColRef(idCliente), newPlanta);
    } catch (error: unknown) {
      console.error("Error en PlantaService.create:", error instanceof Error ? error.message : error);
      throw error;
    }
  },

  async update(idCliente: string, id: string, data: Partial<Planta>) {
    try {
      if (!idCliente?.trim()) throw new Error("idCliente requerido");
      const {
        name,
        plantName,
        location,
        maxPallets,
        tempRange,
        isOperational,
      } = data;

      const updateData = {
        name,
        plantName,
        location,
        maxPallets,
        tempRange,
        isOperational,
      };

      return await updateDoc(getPlantaDocRef(idCliente, id), updateData);
    } catch (error: unknown) {
      console.error("Error en PlantaService.update:", error instanceof Error ? error.message : error);
      throw error;
    }
  },

  async delete(idCliente: string, id: string) {
    try {
      if (!idCliente?.trim()) throw new Error("idCliente requerido");
      return await deleteDoc(getPlantaDocRef(idCliente, id));
    } catch (error: unknown) {
      console.error("Error en PlantaService.delete:", error instanceof Error ? error.message : error);
      throw error;
    }
  }
};