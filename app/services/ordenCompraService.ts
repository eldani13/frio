import { db } from "@/lib/firebaseClient";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import type {
  OrdenCompra,
  OrdenCompraLineItem,
  OrdenCompraRecepcionLinea,
} from "@/app/types/ordenCompra";

/** OC con ruta de dueño (custodio / vistas globales). */
export type OrdenCompraPendienteRecepcion = OrdenCompra & {
  id: string;
  idClienteDueno: string;
};

const PARENT = "clientes";
const SUB = "ordenesCompra";

const col = (idCliente: string) => collection(db, PARENT, idCliente, SUB);

/** Firestore no acepta `undefined` en ningún campo; omitimos opcionales vacíos. */
function lineItemForFirestore(item: OrdenCompraLineItem): Record<string, string | number> {
  const row: Record<string, string | number> = {
    catalogoProductId: item.catalogoProductId,
    cantidad: Number.isFinite(Number(item.cantidad)) ? Number(item.cantidad) : 0,
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

  /**
   * Órdenes enviadas a esta bodega interna y aún pendientes de recepción (custodio).
   */
  async listParaRecepcionEnBodega(
    idCliente: string,
    codeCuenta: string,
    warehouseId: string,
  ): Promise<OrdenCompra[]> {
    if (!idCliente?.trim() || !warehouseId?.trim()) return [];
    const all = await this.getAll(idCliente, codeCuenta);
    const wid = warehouseId.trim();
    return all.filter(
      (o) =>
        (o.estado === "Transporte" || o.estado === "Enviada") &&
        o.destinoTipo === "interna" &&
        (o.destinoWarehouseId ?? "").trim() === wid,
    );
  },

  /**
   * Todas las OC en transporte hacia esta bodega interna (cualquier cuenta).
   * Lee la subcolección ordenesCompra bajo cada cliente y filtra en memoria (sin collection group).
   */
  async listParaRecepcionEnBodegaGlobal(warehouseId: string): Promise<OrdenCompraPendienteRecepcion[]> {
    const wid = warehouseId?.trim();
    if (!wid) return [];
    try {
      const clientsSnap = await getDocs(collection(db, PARENT));
      const out: OrdenCompraPendienteRecepcion[] = [];
      for (const c of clientsSnap.docs) {
        const idCliente = c.id;
        const snap = await getDocs(col(idCliente));
        for (const d of snap.docs) {
          const data = d.data() as Omit<OrdenCompra, "id">;
          if (
            data.destinoTipo === "interna" &&
            (data.destinoWarehouseId ?? "").trim() === wid &&
            data.estado === "Transporte"
          ) {
            out.push({ id: d.id, idClienteDueno: idCliente, ...data });
          }
        }
      }
      return out.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    } catch (e: unknown) {
      console.error("OrdenCompraService.listParaRecepcionEnBodegaGlobal", e);
      throw e;
    }
  },

  /**
   * Todas las órdenes de compra (cualquier cuenta), más recientes primero.
   * Lee cada subcolección ordenesCompra sin consultas compuestas en Firestore.
   */
  async listTodasOrdenesCompraGlobal(maxDocs = 400): Promise<OrdenCompraPendienteRecepcion[]> {
    try {
      const cap = Math.min(Math.max(1, maxDocs), 500);
      const clientsSnap = await getDocs(collection(db, PARENT));
      const out: OrdenCompraPendienteRecepcion[] = [];
      for (const c of clientsSnap.docs) {
        const snap = await getDocs(col(c.id));
        for (const d of snap.docs) {
          out.push({
            id: d.id,
            idClienteDueno: c.id,
            ...(d.data() as Omit<OrdenCompra, "id">),
          });
        }
      }
      out.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
      return out.slice(0, cap);
    } catch (e: unknown) {
      console.error("OrdenCompraService.listTodasOrdenesCompraGlobal", e);
      throw e;
    }
  },

  /**
   * Cierra recepción: compara cantidades pedidas vs recibidas y actualiza estado + bloque recepcion.
   */
  async cerrarRecepcion(
    idCliente: string,
    ordenId: string,
    payload: {
      cantidadesRecibidas: Record<string, number>;
      pesosKgRecibidos?: Record<string, number>;
      notas?: string;
      cerradaPorUid: string;
      cerradaPorNombre?: string;
    },
  ): Promise<void> {
    if (!idCliente?.trim()) throw new Error("idCliente requerido");
    if (!ordenId?.trim()) throw new Error("orden requerida");
    if (!payload.cerradaPorUid?.trim()) throw new Error("usuario requerido");

    const ref = doc(db, PARENT, idCliente.trim(), SUB, ordenId.trim());
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error("Orden no encontrada");
    const orden = { id: snap.id, ...snap.data() } as OrdenCompra;

    if (orden.estado !== "Enviada") {
      throw new Error("Solo se puede recepcionar una orden en estado Enviada");
    }
    if (orden.destinoTipo !== "interna") {
      throw new Error("Solo aplica a órdenes con destino bodega interna");
    }

    const items = orden.lineItems ?? [];
    if (!items.length) throw new Error("La orden no tiene líneas");

    const lineas: OrdenCompraRecepcionLinea[] = items.map((li) => {
      const pedidoKg =
        li.pesoKg != null && Number.isFinite(Number(li.pesoKg)) && Number(li.pesoKg) > 0
          ? Number(li.pesoKg)
          : null;
      const raw = payload.cantidadesRecibidas[li.catalogoProductId];
      const pw = payload.pesosKgRecibidos?.[li.catalogoProductId];

      let cantidadRecibida: number;
      if (pedidoKg != null) {
        const recKg =
          pw != null && Number.isFinite(Number(pw))
            ? Number(pw)
            : raw != null && Number.isFinite(Number(raw))
              ? Number(raw)
              : 0;
        cantidadRecibida = Math.max(0, recKg);
      } else {
        cantidadRecibida =
          raw != null && Number.isFinite(Number(raw)) ? Math.max(0, Math.floor(Number(raw))) : 0;
      }

      const row: OrdenCompraRecepcionLinea = {
        catalogoProductId: li.catalogoProductId,
        cantidadRecibida,
      };
      if (pedidoKg != null) {
        row.pesoKgRecibido =
          pw != null && Number.isFinite(Number(pw)) ? Number(pw) : cantidadRecibida;
      } else if (pw != null && Number.isFinite(Number(pw)) && Number(pw) >= 0) {
        row.pesoKgRecibido = Number(pw);
      }
      return row;
    });

    const sinDiferencias = items.every((li) => {
      const rec = lineas.find((l) => l.catalogoProductId === li.catalogoProductId);
      const pedidoKg =
        li.pesoKg != null && Number.isFinite(Number(li.pesoKg)) && Number(li.pesoKg) > 0
          ? Number(li.pesoKg)
          : null;
      if (pedidoKg != null) {
        const recKg = rec?.pesoKgRecibido ?? rec?.cantidadRecibida;
        if (recKg == null || !Number.isFinite(Number(recKg))) return false;
        return Math.abs(Number(recKg) - pedidoKg) < 1e-4;
      }
      return (rec?.cantidadRecibida ?? 0) === (Number(li.cantidad) || 0);
    });

    const notas = (payload.notas ?? "").trim();
    const recepcion = {
      lineas,
      cerradaAt: Date.now(),
      cerradaPorUid: payload.cerradaPorUid.trim(),
      cerradaPorNombre: (payload.cerradaPorNombre ?? "").trim() || undefined,
      sinDiferencias,
      ...(notas ? { notas } : {}),
    };

    await updateDoc(ref, {
      estado: sinDiferencias ? "Recibida(ok)" : "Recibida(con diferencias)",
      recepcion,
    });
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
      /** Obligatoria antes de enviar; la ve el custodio. */
      fechaLlegadaEstipulada: string;
    },
  ): Promise<void> {
    if (!idCliente?.trim()) throw new Error("idCliente requerido");
    if (!ordenId?.trim()) throw new Error("orden requerida");
    if (!payload.destinoWarehouseId?.trim()) throw new Error("Elegí una bodega de destino");
    const fecha = String(payload.fechaLlegadaEstipulada ?? "").trim();
    if (!fecha) throw new Error("Indicá la fecha de llegada estipulada");

    const ref = doc(db, PARENT, idCliente.trim(), SUB, ordenId.trim());
    await updateDoc(ref, {
      estado: "Transporte",
      destinoTipo: payload.destinoTipo,
      destinoWarehouseId: payload.destinoWarehouseId.trim(),
      destinoWarehouseNombre: payload.destinoWarehouseNombre.trim(),
      enviadaAt: Date.now(),
      fechaLlegadaEstipulada: fecha,
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
