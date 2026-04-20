import { db } from "@/lib/firebaseClient";
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  deleteDoc,
  doc,
  updateDoc,
  query,
  where, // Agregado para filtrar por cuenta
  orderBy,
  limit,
} from "firebase/firestore";
import { Catalogo } from "@/app/types/catalogo";

const PARENT_COLLECTION = "clientes";
const SUB_COLLECTION = "productos";

const getColRef = (idCliente: string) =>
  collection(db, PARENT_COLLECTION, idCliente, SUB_COLLECTION);

const getProductoDocRef = (idCliente: string, id: string) =>
  doc(db, PARENT_COLLECTION, idCliente, SUB_COLLECTION, id);

export const CatalogoService = {
  
  toBase36: (num: number): string => {
    return num.toString(36).toUpperCase().padStart(4, '0');
  },

  /**
   * Obtiene los productos filtrados por codeCuenta.
   * Sin orderBy para evitar el error de índice compuesto.
   */
  async getById(idCliente: string, id: string): Promise<Catalogo | null> {
    try {
      if (!idCliente?.trim() || !id?.trim()) return null;
      const snap = await getDoc(getProductoDocRef(idCliente, id));
      if (!snap.exists()) return null;
      return { id: snap.id, ...snap.data() } as Catalogo;
    } catch (e: unknown) {
      console.error("Error en CatalogoService.getById:", e);
      return null;
    }
  },

  async getAll(idCliente: string, codeCuenta: string): Promise<Catalogo[]> {
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
      } as Catalogo));
    } catch (error: any) {
      console.error("Error en CatalogoService.getAll:", error.message);
      return [];
    }
  },

  /** Crea producto con correlativo por cliente; persiste codeCuenta. */
  async create(productData: Omit<Catalogo, 'id' | 'numericId' | 'code' | 'createdAt' | 'codeCuenta'>, idCliente: string, codeCuenta: string) {
    try {
      if (!idCliente?.trim()) throw new Error("idCliente requerido");
      const qLast = query(getColRef(idCliente), orderBy("numericId", "desc"), limit(1));
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

      return await addDoc(getColRef(idCliente), newProduct);
    } catch (error: any) {
      console.error("Error en CatalogoService.create:", error.message);
      throw error;
    }
  },

  /**
   * Actualiza un producto existente (mantiene tu lógica original)
   */
  async update(idCliente: string, id: string, data: Partial<Catalogo>) {
    try {
      if (!idCliente?.trim()) throw new Error("idCliente requerido");
      const { id: _, numericId, code, createdAt, codeCuenta, ...updateData } = data as any;

      return await updateDoc(getProductoDocRef(idCliente, id), updateData);
    } catch (error: any) {
      console.error("Error en CatalogoService.update:", error.message);
      throw error;
    }
  },

  async delete(idCliente: string, id: string) {
    try {
      if (!idCliente?.trim()) throw new Error("idCliente requerido");
      return await deleteDoc(getProductoDocRef(idCliente, id));
    } catch (error: any) {
      console.error("Error en CatalogoService.delete:", error.message);
      throw error;
    }
  },

  async importMany(dataList: any[], idCliente: string, codeCuenta: string) {
    try {
      if (!idCliente?.trim()) throw new Error("idCliente requerido");
      const qLast = query(getColRef(idCliente), orderBy("numericId", "desc"), limit(1));
      const lastSnap = await getDocs(qLast);

      let currentId = 1;
      if (!lastSnap.empty) {
        currentId = (lastSnap.docs[0].data() as Catalogo).numericId + 1;
      }

      const promises = dataList.map((item, index) => {
        const nextId = currentId + index;
        const newProduct: Omit<Catalogo, "id"> = {
          ...item,
          codeCuenta,
          numericId: nextId,
          code: this.toBase36(nextId),
          createdAt: Date.now(),
        };
        return addDoc(getColRef(idCliente), newProduct);
      });

      return await Promise.all(promises);
    } catch (error) {
      console.error("Error importando datos:", error);
      throw error;
    }
  },
};