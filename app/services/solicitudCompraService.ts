import { db } from "@/lib/firebaseClient";
import {
  addDoc,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import type { SolicitudCompra, SolicitudLineItem } from "@/app/types/solicitudCompra";

const PARENT = "clientes";
const SUB = "solicitudesCompra";

const col = (idCliente: string) => collection(db, PARENT, idCliente, SUB);

function lineItemForFirestore(item: SolicitudLineItem): Record<string, string | number> {
  const row: Record<string, string | number> = {
    catalogoProductId: item.catalogoProductId,
    pesoKg: Number(item.pesoKg),
    titleSnapshot: item.titleSnapshot ?? "",
  };
  if (item.skuSnapshot != null && String(item.skuSnapshot).trim() !== "") {
    row.skuSnapshot = String(item.skuSnapshot);
  }
  if (item.codeSnapshot != null && String(item.codeSnapshot).trim() !== "") {
    row.codeSnapshot = String(item.codeSnapshot);
  }
  return row;
}

export const SolicitudCompraService = {
  async getAll(idCliente: string, codeCuenta: string): Promise<SolicitudCompra[]> {
    try {
      if (!idCliente?.trim()) return [];
      const q = query(col(idCliente), where("codeCuenta", "==", codeCuenta));
      const snap = await getDocs(q);
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as SolicitudCompra));
      return list.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    } catch (e: unknown) {
      console.error("SolicitudCompraService.getAll", e);
      return [];
    }
  },

  async create(
    idCliente: string,
    codeCuenta: string,
    payload: {
      proveedorId: string;
      proveedorCode: string;
      proveedorNombre: string;
      fecha: string;
      estado: string;
      lineItems: SolicitudLineItem[];
    },
  ) {
    if (!idCliente?.trim()) throw new Error("idCliente requerido");
    if (!payload.lineItems?.length) throw new Error("Agregá al menos un producto del catálogo");

    const qLast = query(col(idCliente), orderBy("numericId", "desc"), limit(1));
    const lastSnap = await getDocs(qLast);
    let nextId = 1;
    if (!lastSnap.empty) {
      const last = lastSnap.docs[0].data() as SolicitudCompra;
      nextId = (Number(last.numericId) || 0) + 1;
    }

    const doc = {
      codeCuenta: codeCuenta ?? "",
      numericId: nextId,
      numero: `SOL-${String(nextId).padStart(4, "0")}`,
      proveedorId: payload.proveedorId,
      proveedorCode: String(payload.proveedorCode ?? "").trim(),
      proveedorNombre: payload.proveedorNombre?.trim() ?? "",
      fecha: payload.fecha ?? "",
      estado: payload.estado ?? "En curso",
      lineItems: payload.lineItems.map(lineItemForFirestore),
      createdAt: Date.now(),
    };

    return addDoc(col(idCliente), doc);
  },
};
