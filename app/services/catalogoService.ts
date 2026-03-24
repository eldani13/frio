import { db } from "@/lib/firebaseClient";
import { 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  doc, 
  updateDoc, 
  query, 
  where, // Agregado para filtrar por cuenta
  orderBy,
  limit
} from "firebase/firestore";
import { Catalogo } from "@/app/types/catalogo";

const PARENT_COLLECTION = "warehouses";
const PARENT_ID = "GENERAL"; 
const SUB_COLLECTION = "productos";

const getColRef = () => collection(db, PARENT_COLLECTION, PARENT_ID, SUB_COLLECTION);

export const CatalogoService = {
  
  toBase36: (num: number): string => {
    return num.toString(36).toUpperCase().padStart(4, '0');
  },

  /**
   * Obtiene los productos filtrados por codeCuenta.
   * Sin orderBy para evitar el error de índice compuesto.
   */
  async getAll(codeCuenta: string): Promise<Catalogo[]> {
    try {
      const q = query(
        getColRef(), 
        where("codeCuenta", "==", codeCuenta)
      );
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(d => ({ 
        id: d.id, 
        ...d.data() 
      } as Catalogo));
    } catch (error: any) {
      console.error("Error en CatalogoService.getAll:", error.message);
      return [];
    }
  },

  /**
   * Crea un producto con correlativo GLOBAL y lo asigna a una cuenta.
   */
  async create(productData: Omit<Catalogo, 'id' | 'numericId' | 'code' | 'createdAt' | 'codeCuenta'>, codeCuenta: string) {
    try {
      // 1. Buscamos el último ID de forma global (sin where)
      const qLast = query(getColRef(), orderBy("numericId", "desc"), limit(1));
      const lastSnap = await getDocs(qLast);
      
      let nextId = 1;
      if (!lastSnap.empty) {
        const lastData = lastSnap.docs[0].data() as Catalogo;
        nextId = (lastData.numericId || 0) + 1;
      }

      // 2. Generamos el objeto incluyendo el codeCuenta pasado por parámetro
      const newProduct: Omit<Catalogo, 'id'> = {
        ...productData,
        codeCuenta: codeCuenta, // Vinculación con la cuenta
        numericId: nextId,
        code: this.toBase36(nextId),
        createdAt: Date.now()
      };

      return await addDoc(getColRef(), newProduct);
    } catch (error: any) {
      console.error("Error en CatalogoService.create:", error.message);
      throw error;
    }
  },

  /**
   * Actualiza un producto existente (mantiene tu lógica original)
   */
  async update(id: string, data: Partial<Catalogo>) {
    try {
      const docRef = doc(db, PARENT_COLLECTION, PARENT_ID, SUB_COLLECTION, id);
      
      // Evitamos sobrescribir los campos de identificación y la cuenta
      const { id: _, numericId, code, createdAt, codeCuenta, ...updateData } = data as any;

      return await updateDoc(docRef, updateData);
    } catch (error: any) {
      console.error("Error en CatalogoService.update:", error.message);
      throw error;
    }
  },

  async delete(id: string) {
    try {
      const docRef = doc(db, PARENT_COLLECTION, PARENT_ID, SUB_COLLECTION, id);
      return await deleteDoc(docRef);
    } catch (error: any) {
      console.error("Error en CatalogoService.delete:", error.message);
      throw error;
    }
  },

  // Agrega esto a tu CatalogoService
async importMany(dataList: any[], codeCuenta: string) {
  try {
    // Obtenemos el último ID una sola vez para empezar el conteo
    const qLast = query(getColRef(), orderBy("numericId", "desc"), limit(1));
    const lastSnap = await getDocs(qLast);
    
    let currentId = 1;
    if (!lastSnap.empty) {
      currentId = (lastSnap.docs[0].data() as Catalogo).numericId + 1;
    }

    const promises = dataList.map((item, index) => {
      const nextId = currentId + index;
      const newProduct: Omit<Catalogo, 'id'> = {
        ...item,
        codeCuenta,
        numericId: nextId,
        code: this.toBase36(nextId),
        createdAt: Date.now()
      };
      return addDoc(getColRef(), newProduct);
    });

    return await Promise.all(promises);
  } catch (error) {
    console.error("Error importando datos:", error);
    throw error;
  }
}

};