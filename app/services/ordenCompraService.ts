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
  OrdenCompraRecepcionLineaAdicional,
} from "@/app/types/ordenCompra";
import { resolveProveedorPedidoIntegracion } from "@/app/services/pedidoProveedorResolve";
import { ordenCompraIngresoLineKey } from "@/app/lib/ordenCompraIngresoLineKey";
import { compareOrdenCompraNewestFirst } from "@/lib/ordenCompraSort";

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

/** Firestore no acepta `undefined` en mapas anidados; limpia el payload de updateDoc. */
function stripUndefinedDeep<T>(value: T): T {
  if (value === undefined || value === null) return value;
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefinedDeep(item)) as T;
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (v === undefined) continue;
    out[k] = stripUndefinedDeep(v);
  }
  return out as T;
}

function lineaRecepcionForFirestore(l: OrdenCompraRecepcionLinea): Record<string, string | number> {
  const catalogoProductId = String(l.catalogoProductId ?? "").trim();
  const row: Record<string, string | number> = {
    catalogoProductId,
    cantidadRecibida: Number.isFinite(Number(l.cantidadRecibida))
      ? Math.max(0, Number(l.cantidadRecibida))
      : 0,
  };
  const pkg = l.pesoKgRecibido;
  if (pkg != null && Number.isFinite(Number(pkg))) {
    row.pesoKgRecibido = Math.max(0, Number(pkg));
  }
  return row;
}

/** Evita `undefined` dentro de `recepcion` (updateDoc falla con "Unsupported field value: undefined"). */
function lineaAdicionalRecepcionForFirestore(
  a: OrdenCompraRecepcionLineaAdicional,
): Record<string, string | number> {
  const row: Record<string, string | number> = {
    titleSnapshot: String(a.titleSnapshot ?? "").trim() || "Producto adicional",
    pesoKgRecibido: Number.isFinite(Number(a.pesoKgRecibido)) ? Number(a.pesoKgRecibido) : 0,
  };
  const pid = String(a.catalogoProductId ?? "").trim();
  if (pid) row.catalogoProductId = pid;
  if (
    a.temperaturaRegistrada != null &&
    Number.isFinite(Number(a.temperaturaRegistrada))
  ) {
    row.temperaturaRegistrada = Number(a.temperaturaRegistrada);
  }
  return row;
}

function buildRecepcionDocForFirestore(params: {
  lineas: OrdenCompraRecepcionLinea[];
  sinDiferencias: boolean;
  cerradaPorUid: string;
  cerradaPorNombre?: string;
  lineasAdicionales?: OrdenCompraRecepcionLineaAdicional[];
  notas?: string;
}): Record<string, unknown> {
  const out: Record<string, unknown> = {
    lineas: params.lineas.map(lineaRecepcionForFirestore),
    cerradaAt: Date.now(),
    cerradaPorUid: params.cerradaPorUid.trim(),
    sinDiferencias: params.sinDiferencias,
  };
  const name = (params.cerradaPorNombre ?? "").trim();
  if (name) out.cerradaPorNombre = name;
  if (params.lineasAdicionales?.length) {
    out.lineasAdicionales = params.lineasAdicionales.map(lineaAdicionalRecepcionForFirestore);
  }
  const notas = (params.notas ?? "").trim();
  if (notas) out.notas = notas;
  return out;
}

type OrdenCompraConId = OrdenCompra & { id: string };

function isNumeroOrdenVacio(numero: unknown): boolean {
  return !String(numero ?? "").trim();
}

/**
 * Órdenes creadas por automatización (n8n) a veces llegan sin `numero` / `numericId`.
 * Al listar, se persisten OC-#### secuenciales (misma lógica que create) y se normaliza
 * estado Pendiente → Iniciado en esos documentos.
 */
async function repairOrdenesCompraSinNumero(
  idCliente: string,
  list: OrdenCompraConId[],
): Promise<OrdenCompraConId[]> {
  if (!list.length) return list;

  let maxN = 0;
  for (const o of list) {
    const n = Number(o.numericId);
    if (Number.isFinite(n) && n > 0) maxN = Math.max(maxN, n);
  }

  const patched = new Map<string, Partial<OrdenCompra>>();
  const tasks: Promise<void>[] = [];

  for (const o of list) {
    if (!isNumeroOrdenVacio(o.numero)) continue;
    const nid = Number(o.numericId);
    if (Number.isFinite(nid) && nid > 0) {
      const ref = doc(db, PARENT, idCliente, SUB, o.id);
      const numero = `OC-${String(nid).padStart(4, "0")}`;
      const patch =
        o.estado === "Pendiente"
          ? ({ numero, estado: "Iniciado" } as const)
          : ({ numero } as const);
      tasks.push(updateDoc(ref, { ...patch }).then(() => undefined));
      patched.set(o.id, patch);
    }
  }

  const needNewId = list
    .filter(
      (o) =>
        isNumeroOrdenVacio(o.numero) &&
        !(Number.isFinite(Number(o.numericId)) && Number(o.numericId) > 0),
    )
    .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));

  for (const o of needNewId) {
    maxN += 1;
    const ref = doc(db, PARENT, idCliente, SUB, o.id);
    const numero = `OC-${String(maxN).padStart(4, "0")}`;
    const patch =
      o.estado === "Pendiente"
        ? ({ numericId: maxN, numero, estado: "Iniciado" } as const)
        : ({ numericId: maxN, numero } as const);
    tasks.push(updateDoc(ref, { ...patch }).then(() => undefined));
    patched.set(o.id, patch);
  }

  if (tasks.length) {
    try {
      await Promise.all(tasks);
    } catch (e: unknown) {
      console.error("repairOrdenesCompraSinNumero", e);
      return list;
    }
  }

  return list.map((o) => (patched.has(o.id) ? { ...o, ...patched.get(o.id)! } : o));
}

export const OrdenCompraService = {
  async getAll(idCliente: string, codeCuenta: string): Promise<OrdenCompra[]> {
    try {
      if (!idCliente?.trim()) return [];
      const q = query(col(idCliente), where("codeCuenta", "==", codeCuenta));
      const snap = await getDocs(q);
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as OrdenCompraConId));
      const repaired = await repairOrdenesCompraSinNumero(idCliente.trim(), list);
      return repaired.sort(compareOrdenCompraNewestFirst);
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
        let rows = snap.docs.map((d) => ({ id: d.id, ...d.data() } as OrdenCompraConId));
        rows = await repairOrdenesCompraSinNumero(idCliente, rows);
        for (const data of rows) {
          if (
            data.destinoTipo === "interna" &&
            (data.destinoWarehouseId ?? "").trim() === wid &&
            data.estado === "Transporte"
          ) {
            const { id, ...rest } = data;
            out.push({ id, idClienteDueno: idCliente, ...rest });
          }
        }
      }
      return out.sort(compareOrdenCompraNewestFirst);
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
        const idCliente = c.id;
        const snap = await getDocs(col(idCliente));
        let rows = snap.docs.map((d) => ({ id: d.id, ...d.data() } as OrdenCompraConId));
        rows = await repairOrdenesCompraSinNumero(idCliente, rows);
        for (const o of rows) {
          const { id, ...rest } = o;
          out.push({ id, idClienteDueno: idCliente, ...rest });
        }
      }
      out.sort(compareOrdenCompraNewestFirst);
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

    const sinDiferencias = items.every((li, idx) => {
      const rec = lineas[idx];
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
    const recepcion = buildRecepcionDocForFirestore({
      lineas,
      sinDiferencias,
      cerradaPorUid: payload.cerradaPorUid,
      cerradaPorNombre: payload.cerradaPorNombre,
      notas,
    });

    await updateDoc(
      ref,
      stripUndefinedDeep({
        estado: sinDiferencias ? "Recibida(ok)" : "Recibida(con diferencias)",
        recepcion,
      }),
    );
  },

  /**
   * Custodio: tras ingreso en zona, compara pedido vs recibido y cierra la OC (no pasa por «En curso»).
   * Acepta orden en Transporte o Enviada, destino interna.
   */
  async finalizarIngresoCustodio(
    idCliente: string,
    ordenId: string,
    payload: {
      pesosKgRecibidosPorLinea: Record<string, number>;
      lineasAdicionales?: OrdenCompraRecepcionLineaAdicional[];
      cerradaPorUid: string;
      cerradaPorNombre?: string;
    },
  ): Promise<{ sinDiferencias: boolean }> {
    if (!idCliente?.trim()) throw new Error("idCliente requerido");
    if (!ordenId?.trim()) throw new Error("orden requerida");
    if (!payload.cerradaPorUid?.trim()) throw new Error("usuario requerido");

    const ref = doc(db, PARENT, idCliente.trim(), SUB, ordenId.trim());
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error("Orden no encontrada");
    const orden = { id: snap.id, ...snap.data() } as OrdenCompra;

    const estado = String(orden.estado ?? "").trim();
    if (estado !== "Transporte" && estado !== "Enviada") {
      throw new Error("Solo se puede cerrar una orden en transporte o enviada");
    }
    if (orden.destinoTipo !== "interna") {
      throw new Error("Solo aplica a órdenes con destino bodega interna");
    }

    const items = orden.lineItems ?? [];
    if (!items.length) throw new Error("La orden no tiene líneas");

    const map = payload.pesosKgRecibidosPorLinea ?? {};

    const lineas: OrdenCompraRecepcionLinea[] = items.map((li, idx) => {
      const pedidoKg =
        li.pesoKg != null && Number.isFinite(Number(li.pesoKg)) && Number(li.pesoKg) > 0
          ? Number(li.pesoKg)
          : null;
      const byLineKey = map[ordenCompraIngresoLineKey(idx)];
      const raw =
        byLineKey != null && Number.isFinite(Number(byLineKey))
          ? byLineKey
          : map[li.catalogoProductId];
      const val = raw != null && Number.isFinite(Number(raw)) ? Number(raw) : 0;

      if (pedidoKg != null) {
        const v = Math.max(0, val);
        return {
          catalogoProductId: li.catalogoProductId,
          cantidadRecibida: v,
          pesoKgRecibido: v,
        };
      }
      const v = Math.max(0, val);
      return {
        catalogoProductId: li.catalogoProductId,
        cantidadRecibida: Math.max(0, Math.floor(v)),
        ...(v > 0 ? { pesoKgRecibido: v } : {}),
      };
    });

    const lineasMatch = items.every((li, idx) => {
      const rec = lineas[idx];
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

    const extras = payload.lineasAdicionales ?? [];
    const sinDiferencias = lineasMatch && extras.length === 0;

    const recepcion = buildRecepcionDocForFirestore({
      lineas,
      sinDiferencias,
      cerradaPorUid: payload.cerradaPorUid,
      cerradaPorNombre: payload.cerradaPorNombre,
      lineasAdicionales: extras.length ? extras : undefined,
    });

    await updateDoc(
      ref,
      stripUndefinedDeep({
        estado: sinDiferencias ? "Cerrado(ok)" : "Cerrado(no ok)",
        recepcion,
      }),
    );

    return { sinDiferencias };
  },

  async create(
    idCliente: string,
    codeCuenta: string,
    payload: {
      proveedorId?: string;
      proveedorCode?: string;
      proveedorNombre?: string;
      fecha: string;
      estado: string;
      lineItems: OrdenCompraLineItem[];
    },
  ) {
    if (!idCliente?.trim()) throw new Error("idCliente requerido");
    if (!payload.lineItems?.length) throw new Error("Agregá al menos un producto del catálogo");

    const snap = await resolveProveedorPedidoIntegracion(idCliente.trim(), codeCuenta ?? "");
    const proveedorId = String(payload.proveedorId ?? "").trim() || snap.proveedorId;
    const proveedorCode = String(payload.proveedorCode ?? "").trim() || snap.proveedorCode;
    const proveedorNombre =
      String(payload.proveedorNombre ?? "").trim() || snap.proveedor_nombre;

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
      proveedorId,
      proveedorCode,
      proveedorNombre,
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
