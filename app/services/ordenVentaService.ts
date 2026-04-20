import { db } from "@/lib/firebaseClient";
import type {
  VentaEnCurso,
  VentaEnCursoLineItem,
  VentaPendienteCartonaje,
  VentaRecepcionBodega,
} from "@/app/types/ventaCuenta";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

const PARENT = "clientes";
const SUB = "ordenesVenta";

const colRef = (clientId: string) => collection(db, PARENT, clientId, SUB);

function lineItemToFirestore(li: VentaEnCursoLineItem): Record<string, unknown> {
  const o: Record<string, unknown> = {
    titleSnapshot: String(li.titleSnapshot ?? ""),
    cantidad: Number(li.cantidad) || 0,
  };
  if (String(li.catalogoProductId ?? "").trim()) {
    o.catalogoProductId = String(li.catalogoProductId).trim();
  }
  return o;
}

function createdAtMsFromData(data: Record<string, unknown>): number {
  const c = data.createdAt;
  if (c && typeof (c as { toMillis?: () => number }).toMillis === "function") {
    try {
      return (c as { toMillis: () => number }).toMillis();
    } catch {
      return 0;
    }
  }
  const n = Number(c);
  return Number.isFinite(n) ? n : 0;
}

type VentaConId = VentaEnCurso & { id: string };

function isNumeroVentaVacio(numero: unknown): boolean {
  return !String(numero ?? "").trim();
}

function esEstadoPendiente(estado: string): boolean {
  const e = String(estado ?? "").trim().toLowerCase();
  return e === "pendiente";
}

/**
 * Ventas importadas o creadas sin `numero` / `numericId`: se persisten V-#### y, si aplica, Pendiente → Iniciado.
 */
async function repairOrdenesVentaSinNumero(
  idCliente: string,
  list: VentaConId[],
): Promise<VentaConId[]> {
  if (!list.length) return list;

  let maxN = 0;
  for (const o of list) {
    const n = Number(o.numericId);
    if (Number.isFinite(n) && n > 0) maxN = Math.max(maxN, n);
  }

  const patched = new Map<string, Partial<VentaEnCurso>>();
  const tasks: Promise<void>[] = [];

  for (const o of list) {
    if (!isNumeroVentaVacio(o.numero)) continue;
    const nid = Number(o.numericId);
    if (Number.isFinite(nid) && nid > 0) {
      const ref = doc(db, PARENT, idCliente, SUB, o.id);
      const numero = `V-${String(nid).padStart(4, "0")}`;
      const patch = esEstadoPendiente(o.estado)
        ? ({ numero, estado: "Iniciado" } as const)
        : ({ numero } as const);
      tasks.push(updateDoc(ref, { ...patch }).then(() => undefined));
      patched.set(o.id, patch);
    }
  }

  const needNewId = list
    .filter(
      (o) =>
        isNumeroVentaVacio(o.numero) &&
        !(Number.isFinite(Number(o.numericId)) && Number(o.numericId) > 0),
    )
    .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));

  for (const o of needNewId) {
    maxN += 1;
    const ref = doc(db, PARENT, idCliente, SUB, o.id);
    const numero = `V-${String(maxN).padStart(4, "0")}`;
    const patch = esEstadoPendiente(o.estado)
      ? ({ numericId: maxN, numero, estado: "Iniciado" } as const)
      : ({ numericId: maxN, numero } as const);
    tasks.push(updateDoc(ref, { ...patch }).then(() => undefined));
    patched.set(o.id, patch);
  }

  if (tasks.length) {
    try {
      await Promise.all(tasks);
    } catch (e: unknown) {
      console.error("repairOrdenesVentaSinNumero", e);
      return list;
    }
  }

  return list.map((o) => (patched.has(o.id) ? { ...o, ...patched.get(o.id)! } : o));
}

function mapDoc(id: string, data: Record<string, unknown>): VentaEnCurso {
  const rawItems = data.lineItems;
  const lineItems: VentaEnCursoLineItem[] = Array.isArray(rawItems)
    ? rawItems.map((item) => {
        const r = item as Record<string, unknown>;
        return {
          catalogoProductId: String(r.catalogoProductId ?? "").trim() || undefined,
          titleSnapshot: String(r.titleSnapshot ?? ""),
          cantidad: Number(r.cantidad) || 0,
        };
      })
    : [];
  const nid = Number(data.numericId) || 0;
  let numero = String(data.numero ?? "").trim();
  if (!numero && Number.isFinite(nid) && nid > 0) {
    numero = `V-${String(nid).padStart(4, "0")}`;
  }
  const destinoWarehouseId = String(data.destinoWarehouseId ?? "").trim() || undefined;
  const destinoWarehouseNombre = String(data.destinoWarehouseNombre ?? "").trim() || undefined;
  const rawRec = data.recepcionBodega;
  let recepcionBodega: VentaRecepcionBodega | undefined;
  if (rawRec && typeof rawRec === "object") {
    const r = rawRec as Record<string, unknown>;
    const rawLineas = r.lineas;
    const lineas =
      Array.isArray(rawLineas) &&
      rawLineas.every((x) => x && typeof x === "object")
        ? rawLineas.map((row) => {
            const z = row as Record<string, unknown>;
            return {
              catalogoProductId: String(z.catalogoProductId ?? "").trim() || undefined,
              titleSnapshot: String(z.titleSnapshot ?? ""),
              cantidadRecibida: Number(z.cantidadRecibida) || 0,
            };
          })
        : [];
    recepcionBodega = {
      lineas,
      cerradaAt: Number(r.cerradaAt) || 0,
      cerradaPorUid: String(r.cerradaPorUid ?? ""),
      cerradaPorNombre: String(r.cerradaPorNombre ?? "").trim() || undefined,
      sinDiferencias: Boolean(r.sinDiferencias),
    };
  }
  return {
    id,
    numero,
    numericId: nid,
    compradorId: String(data.compradorId ?? "").trim() || undefined,
    compradorNombre: String(data.compradorNombre ?? ""),
    fecha: String(data.fecha ?? ""),
    estado: String(data.estado ?? "Iniciado"),
    lineItems,
    codeCuenta: String(data.codeCuenta ?? "").trim() || undefined,
    createdAt: createdAtMsFromData(data),
    ...(destinoWarehouseId ? { destinoWarehouseId } : {}),
    ...(destinoWarehouseNombre ? { destinoWarehouseNombre } : {}),
    ...(recepcionBodega ? { recepcionBodega } : {}),
  };
}

export const OrdenVentaService = {
  /**
   * Órdenes de venta de la cuenta (mismo criterio que OC: `codeCuenta`).
   */
  async getAllByCodeCuenta(idCliente: string, codeCuenta: string): Promise<VentaEnCurso[]> {
    const cid = String(idCliente ?? "").trim();
    const code = String(codeCuenta ?? "").trim();
    if (!cid || !code) return [];
    try {
      const q = query(colRef(cid), where("codeCuenta", "==", code));
      const snap = await getDocs(q);
      let list = snap.docs.map((d) => mapDoc(d.id, d.data() as Record<string, unknown>) as VentaConId);
      list = await repairOrdenesVentaSinNumero(cid, list);
      return list.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    } catch (e: unknown) {
      console.error("OrdenVentaService.getAllByCodeCuenta", e);
      return [];
    }
  },

  /** Una orden de venta por id de documento (custodio / enlaces desde cajas en salida). */
  async getById(clientId: string, ventaId: string): Promise<VentaEnCurso | null> {
    const cid = String(clientId ?? "").trim();
    const vid = String(ventaId ?? "").trim();
    if (!cid || !vid) return null;
    try {
      const snap = await getDoc(doc(db, PARENT, cid, SUB, vid));
      if (!snap.exists()) return null;
      return mapDoc(snap.id, snap.data() as Record<string, unknown>) as VentaConId;
    } catch (e: unknown) {
      console.error("OrdenVentaService.getById", e);
      return null;
    }
  },

  subscribe(
    clientId: string,
    onNext: (items: VentaEnCurso[]) => void,
    onErr?: (e: Error) => void,
  ): () => void {
    const cid = String(clientId ?? "").trim();
    if (!cid) {
      onNext([]);
      return () => {};
    }
    const q = query(colRef(cid), orderBy("numericId", "desc"));
    return onSnapshot(
      q,
      (snap) => {
        void (async () => {
          const list = snap.docs.map((d) => mapDoc(d.id, d.data() as Record<string, unknown>));
          try {
            const repaired = await repairOrdenesVentaSinNumero(cid, list as VentaConId[]);
            onNext(repaired);
          } catch (e) {
            console.error("OrdenVentaService.subscribe", e);
            onErr?.(e as Error);
            onNext(list);
          }
        })();
      },
      (e) => onErr?.(e as Error),
    );
  },

  async create(
    clientId: string,
    codeCuenta: string,
    draft: {
      compradorId: string;
      compradorNombre: string;
      fecha: string;
      estado: string;
      lineItems: VentaEnCursoLineItem[];
    },
  ): Promise<void> {
    const cid = String(clientId ?? "").trim();
    if (!cid) throw new Error("Falta cliente.");
    if (!draft.lineItems?.length) throw new Error("Agregá al menos una línea.");

    const qLast = query(colRef(cid), orderBy("numericId", "desc"), limit(1));
    const lastSnap = await getDocs(qLast);
    let nextId = 1;
    if (!lastSnap.empty) {
      const last = lastSnap.docs[0].data() as { numericId?: number };
      nextId = (Number(last.numericId) || 0) + 1;
    }

    await addDoc(colRef(cid), {
      clientId: cid,
      codeCuenta: String(codeCuenta ?? "").trim(),
      numericId: nextId,
      numero: `V-${String(nextId).padStart(4, "0")}`,
      compradorId: String(draft.compradorId ?? "").trim(),
      compradorNombre: String(draft.compradorNombre ?? "").trim(),
      fecha: String(draft.fecha ?? "").trim(),
      estado: String(draft.estado ?? "Iniciado").trim() || "Iniciado",
      lineItems: draft.lineItems.map(lineItemToFirestore),
      createdAt: serverTimestamp(),
    });
  },

  async updateEstado(clientId: string, ventaId: string, estado: string): Promise<void> {
    const cid = String(clientId ?? "").trim();
    const vid = String(ventaId ?? "").trim();
    if (!cid || !vid) throw new Error("parámetros");
    await updateDoc(doc(db, PARENT, cid, SUB, vid), {
      estado: String(estado ?? "").trim(),
    });
  },

  /**
   * Operador de cuenta: venta hacia bodega interna (custodio podrá registrar cajas en ingreso).
   */
  async marcarEnTransporteInterna(
    clientId: string,
    ventaId: string,
    payload: { destinoWarehouseId: string; destinoWarehouseNombre: string },
  ): Promise<void> {
    const cid = String(clientId ?? "").trim();
    const vid = String(ventaId ?? "").trim();
    const wid = String(payload.destinoWarehouseId ?? "").trim();
    const wnom = String(payload.destinoWarehouseNombre ?? "").trim();
    if (!cid || !vid || !wid) throw new Error("Faltan datos de venta o bodega.");
    await updateDoc(doc(db, PARENT, cid, SUB, vid), {
      estado: "Transporte",
      destinoWarehouseId: wid,
      destinoWarehouseNombre: wnom || wid,
    });
  },

  /**
   * Ventas en «Transporte» con destino a esta bodega interna (todas las cuentas).
   */
  async listParaCartonajeEnBodegaGlobal(warehouseId: string): Promise<VentaPendienteCartonaje[]> {
    const wid = String(warehouseId ?? "").trim();
    if (!wid) return [];
    try {
      const clientsSnap = await getDocs(collection(db, PARENT));
      const out: VentaPendienteCartonaje[] = [];
      for (const c of clientsSnap.docs) {
        const idCliente = c.id;
        const snap = await getDocs(colRef(idCliente));
        for (const d of snap.docs) {
          const v = mapDoc(d.id, d.data() as Record<string, unknown>);
          if (
            v.estado === "Transporte" &&
            (v.destinoWarehouseId ?? "").trim() === wid &&
            (v.lineItems ?? []).length > 0
          ) {
            out.push({ ...v, idClienteDueno: idCliente });
          }
        }
      }
      out.sort((a, b) => (b.numericId || 0) - (a.numericId || 0));
      return out;
    } catch (e) {
      console.error("OrdenVentaService.listParaCartonajeEnBodegaGlobal", e);
      throw e;
    }
  },

  /**
   * Listado global de órdenes de venta (todas las cuentas), para vista custodio.
   */
  async listTodasOrdenesVentaGlobal(maxDocs = 400): Promise<VentaPendienteCartonaje[]> {
    try {
      const cap = Math.min(Math.max(1, maxDocs), 500);
      const clientsSnap = await getDocs(collection(db, PARENT));
      const out: VentaPendienteCartonaje[] = [];
      for (const c of clientsSnap.docs) {
        const idCliente = c.id;
        const snap = await getDocs(colRef(idCliente));
        let list = snap.docs.map((d) => mapDoc(d.id, d.data() as Record<string, unknown>) as VentaConId);
        try {
          list = await repairOrdenesVentaSinNumero(idCliente, list);
        } catch (e) {
          console.warn("repairOrdenesVentaSinNumero", idCliente, e);
        }
        for (const v of list) {
          out.push({ ...v, idClienteDueno: idCliente });
        }
      }
      out.sort((a, b) => (b.numericId || 0) - (a.numericId || 0));
      return out.slice(0, cap);
    } catch (e: unknown) {
      console.error("OrdenVentaService.listTodasOrdenesVentaGlobal", e);
      throw e;
    }
  },

  /**
   * Custodio: tras registrar cajas en ingreso, cierra la venta según coincidencia kg esperado vs recibido.
   */
  async finalizarIngresoCustodioVenta(
    idCliente: string,
    ventaId: string,
    payload: {
      /** Mismo orden que `lineItems` de la venta. */
      kgEsperadosPorLinea: number[];
      kgRecibidosPorLinea: number[];
      cerradaPorUid: string;
      cerradaPorNombre?: string;
    },
  ): Promise<{ sinDiferencias: boolean }> {
    const cid = String(idCliente ?? "").trim();
    const vid = String(ventaId ?? "").trim();
    if (!cid || !vid) throw new Error("parámetros");
    if (!payload.cerradaPorUid?.trim()) throw new Error("usuario requerido");

    const ref = doc(db, PARENT, cid, SUB, vid);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error("Venta no encontrada");
    const venta = mapDoc(snap.id, snap.data() as Record<string, unknown>);

    if (String(venta.estado ?? "").trim() !== "Transporte") {
      throw new Error("Solo se puede cerrar una venta en transporte hacia bodega.");
    }

    const items = venta.lineItems ?? [];
    if (!items.length) throw new Error("La venta no tiene líneas");

    const exp = payload.kgEsperadosPorLinea ?? [];
    const rec = payload.kgRecibidosPorLinea ?? [];
    const eps = 1e-2;
    const sinDiferencias = items.every((_, idx) => {
      const e = Number(exp[idx]);
      const r = Number(rec[idx]);
      if (!Number.isFinite(e) || !Number.isFinite(r)) return false;
      return Math.abs(e - r) <= eps;
    });

    const lineas = items.map((li, idx) => ({
      catalogoProductId: li.catalogoProductId,
      titleSnapshot: String(li.titleSnapshot ?? ""),
      cantidadRecibida: Math.max(0, Number(rec[idx]) || 0),
    }));

    const recepcionBodega: VentaRecepcionBodega = {
      lineas,
      cerradaAt: Date.now(),
      cerradaPorUid: payload.cerradaPorUid.trim(),
      cerradaPorNombre: String(payload.cerradaPorNombre ?? "").trim() || undefined,
      sinDiferencias,
    };

    await updateDoc(ref, {
      estado: sinDiferencias ? "Cerrado(ok)" : "Cerrado(no ok)",
      recepcionBodega,
    });

    return { sinDiferencias };
  },
};
