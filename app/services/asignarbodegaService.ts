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
  async getPendingBodegas(status: string): Promise<WarehouseMeta[]> {
    try {
      const colRef = collection(db, WAREHOUSES_COL);
      const snapshot = await getDocs(colRef);
      return snapshot.docs
        .map(d => ({ id: d.id, ...d.data() } as WarehouseMeta))
        .filter(b => (!b.codeCuenta || b.codeCuenta.trim() === "") && b.status === status);
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
  
 * Obtiene todas las bodegas asignadas a un codeCuenta específico
 */
async getWarehousesByCode(codeCuenta: string): Promise<WarehouseMeta[]> {
  try {
    // 1. Validación de seguridad
    if (!codeCuenta || codeCuenta.trim() === "") return [];

    const colRef = collection(db, WAREHOUSES_COL);
    
    // 2. Consulta filtrando por el dueño (codeCuenta)
    const q = query(colRef, where("codeCuenta", "==", codeCuenta));
    const snapshot = await getDocs(q);

    // 3. Mapeo de documentos a objetos WarehouseMeta
    // Si snapshot está vacío, .map devolverá [] automáticamente
    return snapshot.docs.map(d => ({
      id: d.id,
      ...d.data()
    } as WarehouseMeta));

  } catch (error) {
    console.error("Error en getWarehousesByCode:", error);
    // 4. Siempre devolvemos array vacío en error para no romper el .map() de la UI
    return [];
  }
}

};