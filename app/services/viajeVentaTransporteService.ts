import { db } from "@/lib/firebaseClient";
import { CatalogoService } from "@/app/services/catalogoService";
import type { Catalogo } from "@/app/types/catalogo";
import type { VentaEnCursoLineItem } from "@/app/types/ventaCuenta";
import type {
  ViajeLineaEntrega,
  ViajeTransporteEstado,
  ViajeVentaTransporte,
  ViajeVentaTransporteConContext,
} from "@/app/types/viajeVentaTransporte";
import {
  addDoc,
  collection,
  collectionGroup,
  deleteField,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
const PARENT = "clientes";
const VENTAS = "ordenesVenta";
const VIAJES = "viajesTransporte";

/** Doc único: `{ nextNumericId: number }` — autoincremento global para `TV-####`. */
const VIAJE_GLOBAL_COUNTER = doc(db, "systemCounters", "viajesTransporte");

let seedCounterPromise: Promise<void> | null = null;

/**
 * Inicializa el contador con el máximo `numericId` ya existente en cualquier venta
 * (evita colisionar con viajes creados con la lógica vieja por venta).
 */
async function ensureViajeGlobalCounterSeeded(): Promise<void> {
  const snap = await getDoc(VIAJE_GLOBAL_COUNTER);
  if (snap.exists()) return;
  if (!seedCounterPromise) {
    seedCounterPromise = (async () => {
      try {
        const qMax = query(collectionGroup(db, VIAJES), orderBy("numericId", "desc"), limit(1));
        const maxSnap = await getDocs(qMax);
        const maxExisting = maxSnap.empty ? 0 : Number(maxSnap.docs[0].data().numericId) || 0;
        await setDoc(VIAJE_GLOBAL_COUNTER, { nextNumericId: maxExisting }, { merge: true });
      } catch {
        await setDoc(VIAJE_GLOBAL_COUNTER, { nextNumericId: 0 }, { merge: true });
      }
    })();
  }
  await seedCounterPromise;
}

/** Siguiente número global único para `numericId` / `numero` TV-####. */
async function allocNextViajeGlobalNumericId(): Promise<number> {
  await ensureViajeGlobalCounterSeeded();
  return runTransaction(db, async (transaction) => {
    const snap = await transaction.get(VIAJE_GLOBAL_COUNTER);
    const prev = snap.exists() ? Number((snap.data() as { nextNumericId?: number }).nextNumericId) || 0 : 0;
    const next = prev + 1;
    transaction.set(VIAJE_GLOBAL_COUNTER, { nextNumericId: next }, { merge: true });
    return next;
  });
}

function colViajes(clientId: string, ventaId: string) {
  return collection(db, PARENT, clientId, VENTAS, ventaId, VIAJES);
}

function catalogoPorLinea(catalogos: Catalogo[], li: VentaEnCursoLineItem): Catalogo | undefined {
  const id = String(li.catalogoProductId ?? "").trim();
  if (!id) return undefined;
  return catalogos.find((c) => c.id === id);
}

/** Misma regla que `OcOrdenVentaIngresoPanel.defaultKgEsperado`. */
function kgEsperadoLinea(li: VentaEnCursoLineItem, cat: Catalogo | undefined): number {
  const cant = Number(li.cantidad) || 0;
  const w = Number(cat?.weightValue);
  if (Number.isFinite(w) && w > 0) {
    return w * cant;
  }
  return cant;
}

function kgTotalDesdeLineas(lines: VentaEnCursoLineItem[], catalogos: Catalogo[]): number {
  return lines.reduce((sum, li) => sum + kgEsperadoLinea(li, catalogoPorLinea(catalogos, li)), 0);
}

/** Kg estimados por línea de venta/viaje (misma regla que al crear el viaje). Para reportes y tablas. */
export function kgEsperadoLineaVentaEnViaje(li: VentaEnCursoLineItem, catalogos: Catalogo[]): number {
  return kgEsperadoLinea(li, catalogoPorLinea(catalogos, li));
}

/** Misma convención que custodio/bodega: todo según pedido y marcado conforme → Cerrado(ok). */
function estadoOrdenVentaTrasEntregaTransporte(
  lineItemsEntregados: ViajeLineaEntrega[],
  entregaConforme: boolean,
): "Cerrado(ok)" | "Cerrado(no ok)" {
  if (!lineItemsEntregados.length) return "Cerrado(no ok)";
  const eps = 1e-6;
  const cantidadesCoinciden = lineItemsEntregados.every((li) => {
    const esp = Number(li.cantidadEsperada);
    const ent = Number(li.cantidadEntregada);
    if (!Number.isFinite(esp) || !Number.isFinite(ent)) return false;
    return Math.abs(esp - ent) <= eps;
  });
  const ok = cantidadesCoinciden && entregaConforme;
  return ok ? "Cerrado(ok)" : "Cerrado(no ok)";
}

function mapViaje(id: string, data: Record<string, unknown>): ViajeVentaTransporte {
  const rawItems = data.lineItemsEsperados;
  const lineItemsEsperados: VentaEnCursoLineItem[] = Array.isArray(rawItems)
    ? rawItems.map((item) => {
        const r = item as Record<string, unknown>;
        return {
          catalogoProductId: String(r.catalogoProductId ?? "").trim() || undefined,
          titleSnapshot: String(r.titleSnapshot ?? ""),
          cantidad: Number(r.cantidad) || 0,
        };
      })
    : [];
  const rawEnt = data.lineItemsEntregados;
  const lineItemsEntregados: ViajeLineaEntrega[] | undefined = Array.isArray(rawEnt)
    ? rawEnt.map((item) => {
        const r = item as Record<string, unknown>;
        return {
          catalogoProductId: String(r.catalogoProductId ?? "").trim() || undefined,
          titleSnapshot: String(r.titleSnapshot ?? ""),
          cantidadEsperada: Number(r.cantidadEsperada) || 0,
          cantidadEntregada: Number(r.cantidadEntregada) || 0,
        };
      })
    : undefined;
  const createdAt = (() => {
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
  })();
  return {
    id,
    numericId: Number(data.numericId) || 0,
    numero: String(data.numero ?? "").trim(),
    estado: (String(data.estado ?? "En curso").trim() as ViajeTransporteEstado) || "En curso",
    lineItemsEsperados,
    createdAt,
    lineItemsEntregados,
    entregaConforme: data.entregaConforme === true ? true : data.entregaConforme === false ? false : undefined,
    evidenciaFotoUrl: String(data.evidenciaFotoUrl ?? "").trim() || undefined,
    firmaDataUrl: String(data.firmaDataUrl ?? "").trim() || undefined,
    descripcionIncidencia: String(data.descripcionIncidencia ?? "").trim() || undefined,
    entregadoAt: Number(data.entregadoAt) || undefined,
    entregadoPorUid: String(data.entregadoPorUid ?? "").trim() || undefined,
    entregadoPorNombre: String(data.entregadoPorNombre ?? "").trim() || undefined,
    ventaEstadoResultante:
      data.ventaEstadoResultante === "Cerrado(ok)" || data.ventaEstadoResultante === "Cerrado(no ok)"
        ? data.ventaEstadoResultante
        : undefined,
  };
}

export const ViajeVentaTransporteService = {
  subscribeParaVenta(
    clientId: string,
    ventaId: string,
    onNext: (items: ViajeVentaTransporte[]) => void,
    onErr?: (e: Error) => void,
  ): () => void {
    const cid = String(clientId ?? "").trim();
    const vid = String(ventaId ?? "").trim();
    if (!cid || !vid) {
      onNext([]);
      return () => {};
    }
    const q = query(colViajes(cid, vid), orderBy("numericId", "desc"));
    return onSnapshot(
      q,
      (snap) => {
        onNext(snap.docs.map((d) => mapViaje(d.id, d.data() as Record<string, unknown>)));
      },
      (e) => onErr?.(e as Error),
    );
  },

  async crearDesdeVenta(clientId: string, ventaId: string, lineItems: VentaEnCursoLineItem[]): Promise<void> {
    const cid = String(clientId ?? "").trim();
    const vid = String(ventaId ?? "").trim();
    if (!cid || !vid) throw new Error("Faltan ids.");
    if (!lineItems.length) throw new Error("La venta no tiene líneas.");

    const nextId = await allocNextViajeGlobalNumericId();

    await addDoc(colViajes(cid, vid), {
      numericId: nextId,
      numero: `TV-${String(nextId).padStart(4, "0")}`,
      estado: "En curso" satisfies ViajeTransporteEstado,
      lineItemsEsperados: lineItems.map((li) => ({
        titleSnapshot: String(li.titleSnapshot ?? ""),
        cantidad: Number(li.cantidad) || 0,
        ...(String(li.catalogoProductId ?? "").trim()
          ? { catalogoProductId: String(li.catalogoProductId).trim() }
          : {}),
      })),
      createdAt: serverTimestamp(),
    });
  },

  async listEnCursoGlobal(): Promise<ViajeVentaTransporteConContext[]> {
    const clientsSnap = await getDocs(collection(db, PARENT));
    const out: ViajeVentaTransporteConContext[] = [];
    const catalogCache = new Map<string, Catalogo[]>();

    const catalogosFor = async (idCliente: string, codeCuenta: string): Promise<Catalogo[]> => {
      const key = `${idCliente}::${codeCuenta}`;
      if (catalogCache.has(key)) return catalogCache.get(key)!;
      const list = codeCuenta.trim()
        ? await CatalogoService.getAll(idCliente, codeCuenta)
        : [];
      catalogCache.set(key, list);
      return list;
    };

    for (const c of clientsSnap.docs) {
      const idCliente = c.id;
      const ventasSnap = await getDocs(collection(db, PARENT, idCliente, VENTAS));
      for (const vd of ventasSnap.docs) {
        const ventaId = vd.id;
        const vData = vd.data() as Record<string, unknown>;
        const ventaNumero =
          String(vData.numero ?? "").trim() ||
          `V-${String(Number(vData.numericId) || 0).padStart(4, "0")}`;
        const codeCuenta = String(vData.codeCuenta ?? "").trim();
        const viajesSnap = await getDocs(colViajes(idCliente, ventaId));
        for (const jd of viajesSnap.docs) {
          const row = mapViaje(jd.id, jd.data() as Record<string, unknown>);
          if (row.estado === "En curso") {
            const cats = await catalogosFor(idCliente, codeCuenta);
            const kgTotalEstimado = kgTotalDesdeLineas(row.lineItemsEsperados ?? [], cats);
            const compradorNombre = String(vData.compradorNombre ?? "").trim();
            const destinoNombre = String(vData.destinoWarehouseNombre ?? "").trim();
            const ventaFecha = String(vData.fecha ?? "").trim();
            const ventaEstado = String(vData.estado ?? "").trim();
            out.push({
              ...row,
              idClienteDueno: idCliente,
              ventaId,
              ventaNumero,
              kgTotalEstimado,
              ventaCompradorNombre: compradorNombre || "Sin nombre de comprador",
              ventaCodeCuenta: codeCuenta || undefined,
              ventaDestinoNombre: destinoNombre || undefined,
              ventaFecha: ventaFecha || undefined,
              ventaEstado: ventaEstado || undefined,
            });
          }
        }
      }
    }
    out.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    return out;
  },

  /**
   * Viajes «En curso» en todos los clientes, en vivo (mismas rutas que `listEnCursoGlobal`).
   * No usa `collectionGroup` + `where` (evita fallos hasta crear índices COLLECTION_GROUP en Firebase).
   */
  subscribeEnCursoGlobal(
    onNext: (items: ViajeVentaTransporteConContext[]) => void,
    onError?: (e: Error) => void,
  ): () => void {
    const catalogCache = new Map<string, Catalogo[]>();
    const ventaKey = (clientId: string, ventaId: string) => JSON.stringify([clientId, ventaId]);
    const parseVentaKey = (key: string): [string, string] => JSON.parse(key) as [string, string];

    const catalogosFor = async (idCliente: string, codeCuenta: string): Promise<Catalogo[]> => {
      const key = `${idCliente}::${codeCuenta}`;
      if (catalogCache.has(key)) return catalogCache.get(key)!;
      const list = codeCuenta.trim() ? await CatalogoService.getAll(idCliente, codeCuenta) : [];
      catalogCache.set(key, list);
      return list;
    };

    const ventasData = new Map<string, Record<string, unknown>>();
    const viajesDocsByVenta = new Map<string, QueryDocumentSnapshot<DocumentData>[]>();
    const ventasColUnsubs = new Map<string, () => void>();
    const viajeUnsubs = new Map<string, () => void>();
    let lastClientIds = new Set<string>();
    let emitGen = 0;

    const buildAndEmit = async () => {
      const g = ++emitGen;
      const out: ViajeVentaTransporteConContext[] = [];
      try {
        for (const [vKey, docList] of viajesDocsByVenta.entries()) {
          const [clientId, ventaId] = parseVentaKey(vKey);
          const vData = ventasData.get(vKey);
          if (!vData) continue;
          for (const jd of docList) {
            const row = mapViaje(jd.id, jd.data() as Record<string, unknown>);
            if (row.estado !== "En curso") continue;
            const ventaNumero =
              String(vData.numero ?? "").trim() ||
              `V-${String(Number(vData.numericId) || 0).padStart(4, "0")}`;
            const codeCuenta = String(vData.codeCuenta ?? "").trim();
            const cats = await catalogosFor(clientId, codeCuenta);
            const kgTotalEstimado = kgTotalDesdeLineas(row.lineItemsEsperados ?? [], cats);
            const compradorNombre = String(vData.compradorNombre ?? "").trim();
            const destinoNombre = String(vData.destinoWarehouseNombre ?? "").trim();
            const ventaFecha = String(vData.fecha ?? "").trim();
            const ventaEstado = String(vData.estado ?? "").trim();
            out.push({
              ...row,
              idClienteDueno: clientId,
              ventaId,
              ventaNumero,
              kgTotalEstimado,
              ventaCompradorNombre: compradorNombre || "Sin nombre de comprador",
              ventaCodeCuenta: codeCuenta || undefined,
              ventaDestinoNombre: destinoNombre || undefined,
              ventaFecha: ventaFecha || undefined,
              ventaEstado: ventaEstado || undefined,
            });
          }
        }
        out.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        if (g === emitGen) onNext(out);
      } catch (e) {
        if (g === emitGen) onError?.(e as Error);
      }
    };

    const ensureViajeListener = (cid: string, vid: string) => {
      const k = ventaKey(cid, vid);
      if (viajeUnsubs.has(k)) return;
      const q = query(colViajes(cid, vid), where("estado", "==", "En curso" satisfies ViajeTransporteEstado));
      const unsub = onSnapshot(
        q,
        (snap) => {
          viajesDocsByVenta.set(k, snap.docs);
          void buildAndEmit();
        },
        (e) => onError?.(e as Error),
      );
      viajeUnsubs.set(k, unsub);
    };

    const cleanupClient = (cid: string) => {
      ventasColUnsubs.get(cid)?.();
      ventasColUnsubs.delete(cid);
      for (const key of [...viajeUnsubs.keys()]) {
        const [c] = parseVentaKey(key);
        if (c === cid) {
          viajeUnsubs.get(key)?.();
          viajeUnsubs.delete(key);
          viajesDocsByVenta.delete(key);
          ventasData.delete(key);
        }
      }
    };

    const attachVentasListener = (cid: string) => {
      if (ventasColUnsubs.has(cid)) return;
      const unsub = onSnapshot(
        collection(db, PARENT, cid, VENTAS),
        (ventasSnap) => {
          const currVids = new Set(ventasSnap.docs.map((d) => d.id));
          const prevVids = new Set<string>();
          for (const key of ventasData.keys()) {
            const [c, v] = parseVentaKey(key);
            if (c === cid) prevVids.add(v);
          }
          for (const vid of prevVids) {
            if (!currVids.has(vid)) {
              const k = ventaKey(cid, vid);
              viajeUnsubs.get(k)?.();
              viajeUnsubs.delete(k);
              viajesDocsByVenta.delete(k);
              ventasData.delete(k);
            }
          }
          for (const vd of ventasSnap.docs) {
            const vid = vd.id;
            const k = ventaKey(cid, vid);
            ventasData.set(k, vd.data() as Record<string, unknown>);
            ensureViajeListener(cid, vid);
          }
          void buildAndEmit();
        },
        (e) => onError?.(e as Error),
      );
      ventasColUnsubs.set(cid, unsub);
    };

    const unsubClientes = onSnapshot(
      collection(db, PARENT),
      (clientsSnap) => {
        const curr = new Set(clientsSnap.docs.map((d) => d.id));
        for (const cid of lastClientIds) {
          if (!curr.has(cid)) cleanupClient(cid);
        }
        for (const cid of curr) {
          if (!lastClientIds.has(cid)) attachVentasListener(cid);
        }
        lastClientIds = curr;
      },
      (e) => onError?.(e as Error),
    );

    return () => {
      unsubClientes();
      lastClientIds.clear();
      for (const cid of [...ventasColUnsubs.keys()]) {
        cleanupClient(cid);
      }
    };
  },

  /**
   * Viajes **En curso** solo del cliente y (si se indica) ventas de esa `codeCuenta`.
   * Más liviano que `listEnCursoGlobal` para reportes de cuenta.
   * @param catalogosPrecargados Si viene cargado (p. ej. el mismo `getAll` que la UI), evita un segundo fetch.
   */
  async listEnCursoParaCuenta(
    idCliente: string,
    codeCuenta: string,
    catalogosPrecargados?: Catalogo[],
  ): Promise<ViajeVentaTransporteConContext[]> {
    const cid = String(idCliente ?? "").trim();
    const cc = String(codeCuenta ?? "").trim();
    if (!cid) return [];

    const catalogos =
      catalogosPrecargados !== undefined
        ? catalogosPrecargados
        : await CatalogoService.getAll(cid, cc);
    const out: ViajeVentaTransporteConContext[] = [];

    const ventasSnap = await getDocs(collection(db, PARENT, cid, VENTAS));
    for (const vd of ventasSnap.docs) {
      const ventaId = vd.id;
      const vData = vd.data() as Record<string, unknown>;
      const ventaCode = String(vData.codeCuenta ?? "").trim();
      if (cc && ventaCode && ventaCode !== cc) continue;

      const ventaNumero =
        String(vData.numero ?? "").trim() || `V-${String(Number(vData.numericId) || 0).padStart(4, "0")}`;
      const compradorNombre = String(vData.compradorNombre ?? "").trim();
      const destinoNombre = String(vData.destinoWarehouseNombre ?? "").trim();
      const ventaFecha = String(vData.fecha ?? "").trim();
      const ventaEstado = String(vData.estado ?? "").trim();

      const viajesSnap = await getDocs(colViajes(cid, ventaId));
      for (const jd of viajesSnap.docs) {
        const row = mapViaje(jd.id, jd.data() as Record<string, unknown>);
        if (row.estado === "En curso") {
          const kgTotalEstimado = kgTotalDesdeLineas(row.lineItemsEsperados ?? [], catalogos);
          out.push({
            ...row,
            idClienteDueno: cid,
            ventaId,
            ventaNumero,
            kgTotalEstimado,
            ventaCompradorNombre: compradorNombre || "Sin nombre de comprador",
            ventaCodeCuenta: ventaCode || undefined,
            ventaDestinoNombre: destinoNombre || undefined,
            ventaFecha: ventaFecha || undefined,
            ventaEstado: ventaEstado || undefined,
          });
        }
      }
    }
    out.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    return out;
  },

  /** Máximo 10 MB (alineado con reglas de Storage y validación en UI). */
  MAX_EVIDENCIA_BYTES: 10 * 1024 * 1024,

  /**
   * Sube la evidencia a Cloudinary (ruta API del servidor) y devuelve la URL HTTPS.
   * Esa URL es la que se persiste en Firestore en `registrarEntrega` (`evidenciaFotoUrl`).
   */
  async subirEvidenciaFoto(clientId: string, ventaId: string, viajeId: string, file: File): Promise<string> {
    const cid = String(clientId ?? "").trim();
    const vid = String(ventaId ?? "").trim();
    const jid = String(viajeId ?? "").trim();
    if (!cid || !vid || !jid) throw new Error("Faltan datos para subir la foto.");
    if (file.size > ViajeVentaTransporteService.MAX_EVIDENCIA_BYTES) {
      throw new Error("La foto supera 10 MB. Elegí una imagen más liviana o comprimila.");
    }

    const form = new FormData();
    form.append("file", file, file.name || "evidencia.jpg");

    let res: Response;
    try {
      res = await fetch("/api/evidencia-transporte", {
        method: "POST",
        body: form,
      });
    } catch {
      throw new Error("No se pudo contactar al servidor para subir la imagen. Revisá tu conexión.");
    }

    const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
    if (!res.ok) {
      throw new Error(data.error?.trim() || `No se pudo subir la imagen (${res.status}).`);
    }
    const url = String(data.url ?? "").trim();
    if (!url) {
      throw new Error("El servidor no devolvió la URL de la imagen.");
    }
    return url;
  },

  async registrarEntrega(params: {
    clientId: string;
    ventaId: string;
    viajeId: string;
    lineItemsEntregados: ViajeLineaEntrega[];
    entregaConforme: boolean;
    /** Opcional: si no se envía, no se guarda URL en el viaje. */
    evidenciaFotoUrl?: string;
    /** Opcional: firma en base64/data URL; si no hay, no se guarda. */
    firmaDataUrl?: string;
    descripcionIncidencia?: string;
    entregadoPorUid: string;
    entregadoPorNombre?: string;
  }): Promise<void> {
    const cid = String(params.clientId ?? "").trim();
    const vid = String(params.ventaId ?? "").trim();
    const jid = String(params.viajeId ?? "").trim();
    if (!cid || !vid || !jid) throw new Error("Faltan ids.");
    if (!params.entregadoPorUid?.trim()) throw new Error("Sesión requerida.");

    const refVenta = doc(db, PARENT, cid, VENTAS, vid);
    const ventaSnap = await getDoc(refVenta);
    if (!ventaSnap.exists()) throw new Error("Venta no encontrada.");
    const estadoVentaActual = String(ventaSnap.data()?.estado ?? "").trim();
    if (estadoVentaActual !== "Transporte") {
      throw new Error(
        "Solo se puede registrar la entrega con la venta en «Transporte». Revisá el estado actual de la orden.",
      );
    }

    const estadoVenta = estadoOrdenVentaTrasEntregaTransporte(
      params.lineItemsEntregados,
      params.entregaConforme,
    );

    const refViaje = doc(db, PARENT, cid, VENTAS, vid, VIAJES, jid);
    const foto = String(params.evidenciaFotoUrl ?? "").trim();
    const firma = String(params.firmaDataUrl ?? "").trim();
    const patchViaje: Record<string, unknown> = {
      estado: "Entregado",
      lineItemsEntregados: params.lineItemsEntregados,
      entregaConforme: params.entregaConforme,
      evidenciaFotoUrl: foto ? foto : deleteField(),
      firmaDataUrl: firma ? firma : deleteField(),
      entregadoAt: Date.now(),
      entregadoPorUid: params.entregadoPorUid.trim(),
      entregadoPorNombre: String(params.entregadoPorNombre ?? "").trim() || undefined,
      descripcionIncidencia: params.entregaConforme
        ? deleteField()
        : String(params.descripcionIncidencia ?? "").trim() || deleteField(),
      /** Copia el criterio aplicado a la orden de venta (trazabilidad). */
      ventaEstadoResultante: estadoVenta,
    };

    const batch = writeBatch(db);
    batch.update(refViaje, patchViaje);
    batch.update(refVenta, { estado: estadoVenta });
    await batch.commit();
  },
};
