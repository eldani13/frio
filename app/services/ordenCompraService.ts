import { db } from "@/lib/firebaseClient";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import type { OrdenCompra, OrdenCompraLineItem } from "@/app/types/ordenCompra";

const PARENT = "clientes";
const SUB = "ordenesCompra";

const col = (idCliente: string) => collection(db, PARENT, idCliente, SUB);

/** Firestore no acepta `undefined` en ningún campo; omitimos opcionales vacíos. */
function lineItemForFirestore(item: OrdenCompraLineItem): Record<string, string | number> {
  const row: Record<string, string | number> = {
    catalogoProductId: item.catalogoProductId,
    cantidad: item.cantidad,
    titleSnapshot: item.titleSnapshot ?? "",
  };
  if (item.pesoKg != null && Number.isFinite(Number(item.pesoKg)) && Number(item.pesoKg) > 0) {
    row.pesoKg = Number(item.pesoKg);
  }
  if (item.skuSnapshot != null && String(item.skuSnapshot).trim() !== "") {
    row.skuSnapshot = String(item.skuSnapshot);
  }
  if (item.codeSnapshot != null && String(item.codeSnapshot).trim() !== "") {
    row.codeSnapshot = String(item.codeSnapshot);
  }
  return row;
}

export const OrdenCompraService = {
  async getAll(idCliente: string, codeCuenta: string): Promise<OrdenCompra[]> {
    try {
      if (!idCliente?.trim()) return [];
      const q = query(col(idCliente), where("codeCuenta", "==", codeCuenta));
      const snap = await getDocs(q);
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as OrdenCompra));
      return list.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    } catch (e: unknown) {
      console.error("OrdenCompraService.getAll", e);
      return [];
    }
  },

  async getByProveedor(
    idCliente: string,
    codeCuenta: string,
    proveedorId: string,
  ): Promise<OrdenCompra[]> {
    const all = await this.getAll(idCliente, codeCuenta);
    return all.filter((o) => o.proveedorId === proveedorId);
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
      lineItems: OrdenCompraLineItem[];
    },
  ) {
    if (!idCliente?.trim()) throw new Error("idCliente requerido");
    if (!payload.lineItems?.length) throw new Error("Agregá al menos un producto del catálogo");

    const qLast = query(col(idCliente), orderBy("numericId", "desc"), limit(1));
    const lastSnap = await getDocs(qLast);
    let nextId = 1;
    if (!lastSnap.empty) {
      const last = lastSnap.docs[0].data() as OrdenCompra;
      nextId = (Number(last.numericId) || 0) + 1;
    }

    const doc = {
      codeCuenta: codeCuenta ?? "",
      numericId: nextId,
      numero: `OC-${String(nextId).padStart(4, "0")}`,
      proveedorId: payload.proveedorId,
      proveedorCode: String(payload.proveedorCode ?? "").trim(),
      proveedorNombre: payload.proveedorNombre?.trim() ?? "",
      fecha: payload.fecha ?? "",
      estado: String(payload.estado ?? "").trim() || "Iniciado",
      lineItems: payload.lineItems.map(lineItemForFirestore),
      createdAt: Date.now(),
    };

    return addDoc(col(idCliente), doc);
  },

  async marcarEnviada(
    idCliente: string,
    ordenId: string,
    payload: {
      destinoTipo: "interna" | "externa";
      destinoWarehouseId: string;
      destinoWarehouseNombre: string;
    },
  ): Promise<void> {
    if (!idCliente?.trim()) throw new Error("idCliente requerido");
    if (!ordenId?.trim()) throw new Error("orden requerida");
    if (!payload.destinoWarehouseId?.trim()) throw new Error("Elegí una bodega de destino");

    const ref = doc(db, PARENT, idCliente.trim(), SUB, ordenId.trim());
    await updateDoc(ref, {
      estado: "Enviada",
      destinoTipo: payload.destinoTipo,
      destinoWarehouseId: payload.destinoWarehouseId.trim(),
      destinoWarehouseNombre: payload.destinoWarehouseNombre.trim(),
      enviadaAt: Date.now(),
    });
  },

  async actualizarEstado(idCliente: string, ordenId: string, estado: string): Promise<void> {
    if (!idCliente?.trim()) throw new Error("idCliente requerido");
    if (!ordenId?.trim()) throw new Error("orden requerida");
    const next = String(estado ?? "").trim();
    if (!next) throw new Error("Estado inválido");
    const ref = doc(db, PARENT, idCliente.trim(), SUB, ordenId.trim());
    await updateDoc(ref, { estado: next });
  },
};
