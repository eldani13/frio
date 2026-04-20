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

const PARENT_COLLECTION = "clientes";
const SUB_COLLECTION = "trucks";

const getColRef = (idCliente: string) =>
  collection(db, PARENT_COLLECTION, idCliente, SUB_COLLECTION);

const getTruckDocRef = (idCliente: string, id: string) =>
  doc(db, PARENT_COLLECTION, idCliente, SUB_COLLECTION, id);

export const TruckService = {
  
  toBase36: (num: number): string => {
    return num.toString(36).toUpperCase().padStart(4, '0');
  },

  /**
   * Obtiene los camiones filtrados por codeCuenta.
   * Sin orderBy para evitar errores de índice compuesto.
   */
  async getAll(idCliente: string, codeCuenta: string): Promise<Camion[]> {
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
      } as Camion));
    } catch (error: unknown) {
      console.error("Error en TruckService.getAll:", error instanceof Error ? error.message : error);
      return [];
    }
  },

  /** Crea camión con correlativo por cliente; persiste codeCuenta en el documento. */
  async create(data: Omit<Camion, 'id' | 'numericId' | 'code' | 'createdAt' | 'codeCuenta'>, idCliente: string, codeCuenta: string) {
    try {
      if (!idCliente?.trim()) throw new Error("idCliente requerido");
      const qLast = query(getColRef(idCliente), orderBy("numericId", "desc"), limit(1));
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

      return await addDoc(getColRef(idCliente), newTruck);
    } catch (error: unknown) {
      console.error("Error en TruckService.create:", error instanceof Error ? error.message : error);
      throw error;
    }
  },

  /**
   * Actualiza los datos del camión (mantiene tu lógica original)
   */
  async update(idCliente: string, id: string, data: Partial<Omit<Camion, 'id' | 'numericId' | 'code'>>) {
    try {
      if (!idCliente?.trim()) throw new Error("idCliente requerido");
      const u: Record<string, unknown> = { ...data };
      for (const k of ["code", "numericId", "codeCuenta"] as const) {
        delete u[k];
      }

      return await updateDoc(getTruckDocRef(idCliente, id), u as Partial<Omit<Camion, "id" | "numericId" | "code">>);
    } catch (error: unknown) {
      console.error("Error en TruckService.update:", error instanceof Error ? error.message : error);
      throw error;
    }
  },

  async delete(idCliente: string, id: string) {
    try {
      if (!idCliente?.trim()) throw new Error("idCliente requerido");
      return await deleteDoc(getTruckDocRef(idCliente, id));
    } catch (error: unknown) {
      console.error("Error en TruckService.delete:", error instanceof Error ? error.message : error);
      throw error;
    }
  }
};