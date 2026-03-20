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
import { Catalogo } from "@/app/types/catalogo"; // Ajusta la ruta según tu proyecto

const PARENT_COLLECTION = "warehouses";
const PARENT_ID = "GENERAL"; 
const SUB_COLLECTION = "productos"; // Nombre de la subcolección para el catálogo

const getColRef = () => collection(db, PARENT_COLLECTION, PARENT_ID, SUB_COLLECTION);

export const CatalogoService = {
  
  /**
   * Transforma número a Base 36 y aplica el relleno de 4 dígitos 
   * Ej: 1 -> 0001, 10 -> 000A, 36 -> 0010
   */
  toBase36: (num: number): string => {
    return num.toString(36).toUpperCase().padStart(4, '0');
  },

  /**
   * Obtiene todos los productos del catálogo ordenados por ID numérico
   */
  async getAll(): Promise<Catalogo[]> {
    try {
      const q = query(getColRef(), orderBy("numericId", "asc"));
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
   * Crea un nuevo producto calculando el siguiente ID autonumérico
   * Recibe un objeto con los datos del formulario (Omitiendo los campos autogenerados)
   */
  async create(productData: Omit<Catalogo, 'id' | 'numericId' | 'code' | 'createdAt'>) {
    try {
      // 1. Buscamos el último ID para el autonumérico
      const qLast = query(getColRef(), orderBy("numericId", "desc"), limit(1));
      const lastSnap = await getDocs(qLast);
      
      let nextId = 1;
      if (!lastSnap.empty) {
        const lastData = lastSnap.docs[0].data() as Catalogo;
        nextId = (lastData.numericId || 0) + 1;
      }

      // 2. Generamos el objeto completo según la interfaz Catalogo
      const newProduct: Omit<Catalogo, 'id'> = {
        ...productData,
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
   * Actualiza un producto existente
   */
  async update(id: string, data: Partial<Catalogo>) {
    try {
      const docRef = doc(db, PARENT_COLLECTION, PARENT_ID, SUB_COLLECTION, id);
      
      // Evitamos sobrescribir los campos de identificación por seguridad
      const { id: _, numericId, code, createdAt, ...updateData } = data as any;

      return await updateDoc(docRef, updateData);
    } catch (error: any) {
      console.error("Error en CatalogoService.update:", error.message);
      throw error;
    }
  },

  /**
   * Elimina un producto por su ID de documento
   */
  async delete(id: string) {
    try {
      const docRef = doc(db, PARENT_COLLECTION, PARENT_ID, SUB_COLLECTION, id);
      return await deleteDoc(docRef);
    } catch (error: any) {
      console.error("Error en CatalogoService.delete:", error.message);
      throw error;
    }
  }
};