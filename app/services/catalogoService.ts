import { auth, db } from "@/lib/firebaseClient";
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
  onSnapshot,
} from "firebase/firestore";
import { Catalogo } from "@/app/types/catalogo";
import { coerceNumberImport } from "@/lib/catalogoPrecio";
import { almacenProductCodeFromNumericId } from "@/lib/almacenProductCode";

const PARENT_COLLECTION = "clientes";
const SUB_COLLECTION = "productos";

const getColRef = (idCliente: string) =>
  collection(db, PARENT_COLLECTION, idCliente, SUB_COLLECTION);

const getProductoDocRef = (idCliente: string, id: string) =>
  doc(db, PARENT_COLLECTION, idCliente, SUB_COLLECTION, id);

/** Une columnas Excel `precio` / `price` y numéricos string en `price` para la UI. */
function normalizeCatalogoImportRow(item: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...item };
  let priceNum = coerceNumberImport(out.price);
  if (priceNum === undefined) priceNum = coerceNumberImport(out.precio);
  if (priceNum !== undefined) out.price = priceNum;
  delete out.precio;
  if (out.costPerItem !== undefined) {
    const c = coerceNumberImport(out.costPerItem);
    if (c !== undefined) out.costPerItem = c;
  }
  return out;
}

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
      if (!auth.currentUser) return [];
      const q = query(
        getColRef(idCliente),
        where("codeCuenta", "==", codeCuenta)
      );
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(d => ({ 
        id: d.id, 
        ...d.data() 
      } as Catalogo));
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      if (/permission|insufficient permissions/i.test(msg)) {
        console.warn(
          "CatalogoService.getAll: sin permiso o reglas sin desplegar (Firestore → clientes/…/productos).",
          msg,
        );
      } else {
        console.error("Error en CatalogoService.getAll:", msg);
      }
      return [];
    }
  },

  subscribeByCodeCuenta(
    idCliente: string,
    codeCuenta: string,
    onNext: (rows: Catalogo[]) => void,
    onError?: (e: Error) => void,
  ): () => void {
    if (!idCliente?.trim()) {
      onNext([]);
      return () => {};
    }
    if (!auth.currentUser) {
      onNext([]);
      return () => {};
    }
    const q = query(getColRef(idCliente), where("codeCuenta", "==", codeCuenta));
    return onSnapshot(
      q,
      (snap) => {
        onNext(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Catalogo)));
      },
      (err) => {
        const msg = err instanceof Error ? err.message : String(err);
        if (/permission|insufficient permissions/i.test(msg)) {
          console.warn("CatalogoService.subscribeByCodeCuenta: sin permiso.", msg);
        } else {
          console.error("CatalogoService.subscribeByCodeCuenta:", msg);
        }
        onError?.(err as Error);
      },
    );
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
        almacenProductCode: almacenProductCodeFromNumericId(nextId),
        createdAt: Date.now()
      };

      return await addDoc(getColRef(idCliente), newProduct);
    } catch (error: unknown) {
      console.error("Error en CatalogoService.create:", error instanceof Error ? error.message : error);
      throw error;
    }
  },

  /**
   * Actualiza un producto existente (mantiene tu lógica original)
   */
  async update(idCliente: string, id: string, data: Partial<Catalogo>) {
    try {
      if (!idCliente?.trim()) throw new Error("idCliente requerido");
      const u: Record<string, unknown> = { ...data };
      for (const k of ["id", "numericId", "code", "createdAt", "codeCuenta", "almacenProductCode"] as const) {
        delete u[k];
      }

      return await updateDoc(getProductoDocRef(idCliente, id), u as Partial<Catalogo>);
    } catch (error: unknown) {
      console.error("Error en CatalogoService.update:", error instanceof Error ? error.message : error);
      throw error;
    }
  },

  async delete(idCliente: string, id: string) {
    try {
      if (!idCliente?.trim()) throw new Error("idCliente requerido");
      return await deleteDoc(getProductoDocRef(idCliente, id));
    } catch (error: unknown) {
      console.error("Error en CatalogoService.delete:", error instanceof Error ? error.message : error);
      throw error;
    }
  },

  async importMany(dataList: Record<string, unknown>[], idCliente: string, codeCuenta: string) {
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
        const row = normalizeCatalogoImportRow(item);
        const newProduct: Omit<Catalogo, "id"> = {
          ...(row as Omit<Catalogo, "id">),
          codeCuenta,
          numericId: nextId,
          code: this.toBase36(nextId),
          almacenProductCode: almacenProductCodeFromNumericId(nextId),
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