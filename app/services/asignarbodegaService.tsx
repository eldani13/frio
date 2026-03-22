import { db } from "@/lib/firebaseClient";
import { 
  collection, 
  getDocs, 
  doc, 
  getDoc,
  updateDoc, 
} from "firebase/firestore";
import { WarehouseMeta } from "@/app/interfaces/bodega";

const WAREHOUSES_COL = "warehouses";
const CLIENTS_COL = "clientes";

export const AsignarBodegaService = {
  
  /**
   * Obtiene bodegas sin codeCuenta
   */
  async getPendingBodegas(): Promise<WarehouseMeta[]> {
    try {
      const colRef = collection(db, WAREHOUSES_COL);
      const snapshot = await getDocs(colRef);
      return snapshot.docs
        .map(d => ({ id: d.id, ...d.data() } as WarehouseMeta))
        .filter(b => !b.codeCuenta || b.codeCuenta.trim() === "");
    } catch (error) {
      console.error("Error getPendingBodegas:", error);
      return [];
    }
  },

  /**
   * Obtiene el campo 'code' de un cliente específico
   */
  async getClienteCode(clientId: string): Promise<string | null> {
    try {
      const docRef = doc(db, CLIENTS_COL, clientId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data().code || null;
      }
      return null;
    } catch (error) {
      console.error("Error al obtener código del cliente:", error);
      return null;
    }
  },

  /**
   * Actualiza el codeCuenta en la bodega
   */
  async assignCodeCuenta(id: string, codeCuenta: string): Promise<void> {
    const docRef = doc(db, WAREHOUSES_COL, id);
    await updateDoc(docRef, { codeCuenta });
  }
};