import { db } from "@/lib/firebaseClient";
import { 
  collection, 
  getDocs, 
  doc, 
  getDoc,
  updateDoc, 
  query,     // <--- Añade esto
  where      // <--- Añade esto
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
   * Actualiza el codeCuenta en la bodega
   */
  async assignCodeCuenta(id: string, codeCuenta: string): Promise<void> {
    const docRef = doc(db, WAREHOUSES_COL, id);
    await updateDoc(docRef, { codeCuenta });
  },

/**
   * Obtiene el nombre de la bodega dado un codeCuenta
   */
  async getWarehouseNameByCode(codeCuenta: string): Promise<string | null> {
    try {
      if (!codeCuenta) return null;

      const colRef = collection(db, WAREHOUSES_COL);
      // Creamos la consulta filtrando por el campo codeCuenta
      const q = query(colRef, where("codeCuenta", "==", codeCuenta));
      const snapshot = await getDocs(q);

      if (snapshot.empty) return null;

      // Retornamos el campo 'name' del primer documento encontrado
      const data = snapshot.docs[0].data();
      return data.name || "Sin nombre";
    } catch (error) {
      console.error("Error en getWarehouseNameByCode:", error);
      return null;
    }
  }

};