import { db } from "@/lib/firebaseClient";
import { 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  doc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  limit 
} from "firebase/firestore";
import { Comprador } from "@/app/types/comprador";

const PARENT_COLLECTION = "clientes";
const SUB_COLLECTION = "compradores";

const getColRef = (idCliente: string) =>
  collection(db, PARENT_COLLECTION, idCliente, SUB_COLLECTION);

const getCompradorDocRef = (idCliente: string, id: string) =>
  doc(db, PARENT_COLLECTION, idCliente, SUB_COLLECTION, id);

function toBase36Four(num: number): string {
  return num.toString(36).toUpperCase().padStart(4, "0");
}

function tieneCodigoCompradorValido(code: unknown): boolean {
  const s = String(code ?? "").trim();
  if (!s) return false;
  if (s.toLowerCase() === "null") return false;
  return true;
}

type CompradorConId = Comprador & { id: string };

/**
 * Compradores creados por integración externa a veces llegan sin `code` (null) y con `numericId` inválido.
 * Al listar, se persisten `numericId` correlativo y `code` en base36 de 4 caracteres (misma lógica que el alta manual),
 * sin repetir códigos; si hay duplicados, se reasigna dejando el más antiguo (`createdAt`).
 */
async function repairCompradoresCodigo(idCliente: string, list: CompradorConId[]): Promise<CompradorConId[]> {
  if (!list.length) return list;
  const cid = idCliente.trim();

  let working = list.map((c) => ({ ...c }));
  let maxN = 0;
  const refreshMaxFromWorking = () => {
    maxN = 0;
    for (const c of working) {
      const n = Number(c.numericId);
      if (Number.isFinite(n) && n > 0) maxN = Math.max(maxN, n);
    }
  };
  refreshMaxFromWorking();

  const codesInUse = (): Set<string> => {
    const s = new Set<string>();
    for (const c of working) {
      if (tieneCodigoCompradorValido(c.code)) {
        s.add(String(c.code).trim().toUpperCase());
      }
    }
    return s;
  };

  const patched = new Map<string, Partial<Comprador>>();
  const tasks: Promise<void>[] = [];

  const alloc = (codes: Set<string>): { numericId: number; code: string } => {
    maxN += 1;
    let code = toBase36Four(maxN);
    while (codes.has(code)) {
      maxN += 1;
      code = toBase36Four(maxN);
    }
    codes.add(code);
    return { numericId: maxN, code };
  };

  // 1) Códigos duplicados: conservar el de menor createdAt, reasignar el resto
  const byCode = new Map<string, CompradorConId[]>();
  for (const c of working) {
    if (!tieneCodigoCompradorValido(c.code)) continue;
    const k = String(c.code).trim().toUpperCase();
    if (!byCode.has(k)) byCode.set(k, []);
    byCode.get(k)!.push(c);
  }
  for (const [, owners] of byCode) {
    if (owners.length <= 1) continue;
    const sorted = [...owners].sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
    let codes = codesInUse();
    for (let i = 1; i < sorted.length; i++) {
      const c = sorted[i]!;
      const { numericId, code } = alloc(codes);
      tasks.push(updateDoc(getCompradorDocRef(cid, c.id), { numericId, code }).then(() => undefined));
      patched.set(c.id, { numericId, code });
      const idx = working.findIndex((x) => x.id === c.id);
      if (idx >= 0) working[idx] = { ...working[idx]!, numericId, code };
      refreshMaxFromWorking();
      codes = codesInUse();
    }
  }

  // 2) Sin código: si hay numericId > 0 y el base36 libre, se usa; si no, correlativo nuevo
  const sinCodigo = working
    .filter((c) => !tieneCodigoCompradorValido(c.code))
    .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));

  let codes = codesInUse();
  for (const c of sinCodigo) {
    const nid = Number(c.numericId);
    let numericId: number;
    let code: string;
    if (Number.isFinite(nid) && nid > 0) {
      const candidate = toBase36Four(nid);
      if (!codes.has(candidate)) {
        numericId = nid;
        code = candidate;
        codes.add(candidate);
        maxN = Math.max(maxN, nid);
      } else {
        const x = alloc(codes);
        numericId = x.numericId;
        code = x.code;
      }
    } else {
      const x = alloc(codes);
      numericId = x.numericId;
      code = x.code;
    }
    tasks.push(updateDoc(getCompradorDocRef(cid, c.id), { numericId, code }).then(() => undefined));
    patched.set(c.id, { numericId, code });
    const idx = working.findIndex((x) => x.id === c.id);
    if (idx >= 0) working[idx] = { ...working[idx]!, numericId, code };
    refreshMaxFromWorking();
    codes = codesInUse();
  }

  if (tasks.length) {
    try {
      await Promise.all(tasks);
    } catch (e: unknown) {
      console.error("CompradorService.repairCompradoresCodigo", e);
      return list;
    }
  }

  return list.map((o) => (patched.has(o.id) ? { ...o, ...patched.get(o.id)! } : o));
}

export const CompradorService = {
  toBase36: (num: number): string => toBase36Four(num),

  /**
   * Obtiene los compradores filtrados por cuenta.
   * Se quita el orderBy para que funcione sin necesidad de crear índices manuales.
   */
  async getAll(idCliente: string, codeCuenta: string): Promise<Comprador[]> {
    try {
      if (!idCliente?.trim()) return [];
      const q = query(
        getColRef(idCliente),
        where("codeCuenta", "==", codeCuenta)
      );
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map(
        (d) =>
          ({
            id: d.id,
            ...d.data(),
          }) as CompradorConId,
      );
      const repaired = await repairCompradoresCodigo(idCliente.trim(), list);
      return [...repaired].sort((a, b) => (Number(b.numericId) || 0) - (Number(a.numericId) || 0));
    } catch (error: unknown) {
      console.error("Error en CompradorService.getAll:", error instanceof Error ? error.message : error);
      return [];
    }
  },

  /** Crea comprador con correlativo por cliente; persiste codeCuenta. */
  async create(name: string, idCliente: string, codeCuenta: string) {
    try {
      if (!idCliente?.trim()) throw new Error("idCliente requerido");
      const qLast = query(getColRef(idCliente), orderBy("numericId", "desc"), limit(1));
      const lastSnap = await getDocs(qLast);
      
      let nextId = 1;
      if (!lastSnap.empty) {
        const lastData = lastSnap.docs[0].data() as Comprador;
        const lastN = Number(lastData.numericId);
        nextId = (Number.isFinite(lastN) && lastN > 0 ? lastN : 0) + 1;
      }

      const newComprador: Omit<Comprador, 'id'> = {
        name: name.trim(),
        codeCuenta: codeCuenta, // Campo de vinculación
        numericId: nextId,
        code: toBase36Four(nextId),
        createdAt: Date.now()
      };

      return await addDoc(getColRef(idCliente), newComprador);
    } catch (error: unknown) {
      console.error("Error en CompradorService.create:", error instanceof Error ? error.message : error);
      throw error;
    }
  },

  /**
   * Actualiza el comprador manteniendo tu lógica original del update.
   */
  async update(idCliente: string, id: string, data: Partial<Comprador>) {
    try {
      if (!idCliente?.trim()) throw new Error("idCliente requerido");
      const updateData: Partial<Comprador> = {};
      if (data.name) updateData.name = data.name.trim();

      return await updateDoc(getCompradorDocRef(idCliente, id), updateData);
    } catch (error: unknown) {
      console.error("Error en CompradorService.update:", error instanceof Error ? error.message : error);
      throw error;
    }
  },

  async delete(idCliente: string, id: string) {
    try {
      if (!idCliente?.trim()) throw new Error("idCliente requerido");
      return await deleteDoc(getCompradorDocRef(idCliente, id));
    } catch (error: unknown) {
      console.error("Error en CompradorService.delete:", error instanceof Error ? error.message : error);
      throw error;
    }
  }
};