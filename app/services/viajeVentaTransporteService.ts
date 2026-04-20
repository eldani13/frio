import { FirebaseError } from "firebase/app";
import { db, storage } from "@/lib/firebaseClient";
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
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

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
            out.push({
              ...row,
              idClienteDueno: idCliente,
              ventaId,
              ventaNumero,
              kgTotalEstimado,
              ventaCompradorNombre: compradorNombre || "Sin nombre de comprador",
              ventaCodeCuenta: codeCuenta || undefined,
              ventaDestinoNombre: destinoNombre || undefined,
            });
          }
        }
      }
    }
    out.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    return out;
  },

  /** Máximo 10 MB (alineado con reglas de Storage y validación en UI). */
  MAX_EVIDENCIA_BYTES: 10 * 1024 * 1024,

  async subirEvidenciaFoto(clientId: string, ventaId: string, viajeId: string, file: File): Promise<string> {
    const cid = String(clientId ?? "").trim();
    const vid = String(ventaId ?? "").trim();
    const jid = String(viajeId ?? "").trim();
    if (!cid || !vid || !jid) throw new Error("Faltan datos para subir la foto.");
    if (file.size > ViajeVentaTransporteService.MAX_EVIDENCIA_BYTES) {
      throw new Error("La foto supera 10 MB. Elegí una imagen más liviana o comprimila.");
    }

    const ext =
      file.type === "image/png"
        ? "png"
        : file.type === "image/webp"
          ? "webp"
          : "jpg";
    const path = `ventaViajes/${cid}/${vid}/${jid}/evidencia-${Date.now()}.${ext}`;
    const r = ref(storage, path);
    const contentType = file.type?.trim() || "image/jpeg";

    /**
     * Usamos `uploadBytes` (subida en un solo paso), no `uploadBytesResumable`.
     * Con subidas resumibles, las reglas de Storage a veces reciben `request.resource` sin `size`;
     * la condición `request.resource.size < 10MB` falla y la subida queda «permission denied»
     * sin que se llegue a guardar la entrega en Firestore.
     */
    try {
      await uploadBytes(r, file, { contentType });
      return await getDownloadURL(r);
    } catch (e: unknown) {
      if (e instanceof FirebaseError) {
        if (e.code === "storage/unauthorized") {
          throw new Error(
            "No se pudo subir la foto (permisos de Storage). Revisá que las reglas de Storage estén desplegadas y que estés con sesión iniciada.",
          );
        }
        if (e.code === "storage/canceled") {
          throw new Error("La subida de la foto se canceló.");
        }
        throw new Error(`No se pudo subir la foto: ${e.message ?? e.code}`);
      }
      throw e;
    }
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
