import { auth, db } from "@/lib/firebaseClient";
import type { ProcesamientoEstado, SolicitudProcesamiento } from "@/app/types/solicitudProcesamiento";
import { normalizeProcesamientoEstado } from "@/app/types/solicitudProcesamiento";
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
  type Timestamp,
} from "firebase/firestore";

const COL = "solicitudesProcesamiento";

const colRef = (clientId: string) => collection(db, "clientes", clientId, COL);

function createdAtMs(s: SolicitudProcesamiento): number {
  const ts = s.createdAt;
  if (ts && typeof ts.toMillis === "function") {
    try {
      return ts.toMillis();
    } catch {
      return 0;
    }
  }
  return 0;
}

function mapDoc(clientId: string, id: string, data: Record<string, unknown>): SolicitudProcesamiento {
  return {
    id,
    clientId: String(data.clientId ?? clientId),
    codeCuenta: String(data.codeCuenta ?? ""),
    clientName: String(data.clientName ?? ""),
    creadoPorNombre: String(data.creadoPorNombre ?? ""),
    creadoPorUid: String(data.creadoPorUid ?? ""),
    numero: String(data.numero ?? ""),
    numericId: Number(data.numericId) || 0,
    productoPrimarioId: String(data.productoPrimarioId ?? ""),
    productoPrimarioTitulo: String(data.productoPrimarioTitulo ?? ""),
    productoSecundarioId: String(data.productoSecundarioId ?? ""),
    productoSecundarioTitulo: String(data.productoSecundarioTitulo ?? ""),
    cantidadPrimario: Number(data.cantidadPrimario) || 0,
    unidadPrimarioVisualizacion:
      data.unidadPrimarioVisualizacion === "peso" || data.unidadPrimarioVisualizacion === "cantidad"
        ? data.unidadPrimarioVisualizacion
        : undefined,
    warehouseId: String(data.warehouseId ?? "").trim() || undefined,
    estimadoUnidadesSecundario:
      data.estimadoUnidadesSecundario === null || data.estimadoUnidadesSecundario === undefined
        ? undefined
        : Number.isFinite(Number(data.estimadoUnidadesSecundario))
          ? Number(data.estimadoUnidadesSecundario)
          : undefined,
    reglaConversionCantidadPrimario: Number.isFinite(Number(data.reglaConversionCantidadPrimario))
      ? Number(data.reglaConversionCantidadPrimario)
      : undefined,
    reglaConversionUnidadesSecundario: Number.isFinite(Number(data.reglaConversionUnidadesSecundario))
      ? Number(data.reglaConversionUnidadesSecundario)
      : undefined,
    perdidaProcesamientoPct: Number.isFinite(Number(data.perdidaProcesamientoPct))
      ? Math.min(100, Math.max(0, Number(data.perdidaProcesamientoPct)))
      : undefined,
    fecha: String(data.fecha ?? ""),
    estado: normalizeProcesamientoEstado(String(data.estado ?? "Iniciado")),
    createdAt: data.createdAt as Timestamp | null | undefined,
    operarioBodegaUid: String(data.operarioBodegaUid ?? "").trim() || undefined,
    operarioBodegaNombre: String(data.operarioBodegaNombre ?? "").trim() || undefined,
  };
}

export const SolicitudProcesamientoService = {
  async create(
    clientId: string,
    params: {
      codeCuenta: string;
      clientName: string;
      creadoPorNombre: string;
      creadoPorUid: string;
      productoPrimarioId: string;
      productoPrimarioTitulo: string;
      productoSecundarioId: string;
      productoSecundarioTitulo: string;
      cantidadPrimario: number;
      fecha: string;
      estado: string;
      unidadPrimarioVisualizacion?: "cantidad" | "peso";
      warehouseId?: string;
      estimadoUnidadesSecundario?: number | null;
      reglaConversionCantidadPrimario?: number;
      reglaConversionUnidadesSecundario?: number;
      perdidaProcesamientoPct?: number;
    },
  ) {
    const cid = String(clientId ?? "").trim();
    if (!cid) throw new Error("Falta la cuenta (cliente).");
    if (!String(params.creadoPorUid ?? "").trim()) throw new Error("No hay sesión.");

    const qLast = query(colRef(cid), orderBy("numericId", "desc"), limit(1));
    const lastSnap = await getDocs(qLast);
    let nextId = 1;
    if (!lastSnap.empty) {
      const last = lastSnap.docs[0].data() as { numericId?: number };
      nextId = (Number(last.numericId) || 0) + 1;
    }

    const estado = normalizeProcesamientoEstado(params.estado);

    await addDoc(colRef(cid), {
      clientId: cid,
      codeCuenta: String(params.codeCuenta ?? "").trim(),
      clientName: String(params.clientName ?? "").trim(),
      creadoPorNombre: String(params.creadoPorNombre ?? "").trim(),
      creadoPorUid: String(params.creadoPorUid ?? "").trim(),
      numericId: nextId,
      numero: `P-${String(nextId).padStart(4, "0")}`,
      productoPrimarioId: String(params.productoPrimarioId ?? "").trim(),
      productoPrimarioTitulo: String(params.productoPrimarioTitulo ?? "").trim(),
      productoSecundarioId: String(params.productoSecundarioId ?? "").trim(),
      productoSecundarioTitulo: String(params.productoSecundarioTitulo ?? "").trim(),
      cantidadPrimario: Number(params.cantidadPrimario) || 0,
      ...(params.unidadPrimarioVisualizacion === "peso" || params.unidadPrimarioVisualizacion === "cantidad"
        ? { unidadPrimarioVisualizacion: params.unidadPrimarioVisualizacion }
        : {}),
      ...(String(params.warehouseId ?? "").trim() ? { warehouseId: String(params.warehouseId).trim() } : {}),
      ...(params.estimadoUnidadesSecundario !== undefined &&
      params.estimadoUnidadesSecundario !== null &&
      Number.isFinite(Number(params.estimadoUnidadesSecundario))
        ? { estimadoUnidadesSecundario: Number(params.estimadoUnidadesSecundario) }
        : {}),
      ...(Number.isFinite(Number(params.reglaConversionCantidadPrimario)) &&
      Number(params.reglaConversionCantidadPrimario) > 0
        ? { reglaConversionCantidadPrimario: Number(params.reglaConversionCantidadPrimario) }
        : {}),
      ...(Number.isFinite(Number(params.reglaConversionUnidadesSecundario)) &&
      Number(params.reglaConversionUnidadesSecundario) > 0
        ? { reglaConversionUnidadesSecundario: Number(params.reglaConversionUnidadesSecundario) }
        : {}),
      perdidaProcesamientoPct: Math.min(
        100,
        Math.max(
          0,
          Number.isFinite(Number(params.perdidaProcesamientoPct)) ? Number(params.perdidaProcesamientoPct) : 0,
        ),
      ),
      fecha: String(params.fecha ?? "").trim(),
      estado,
      createdAt: serverTimestamp(),
    });
  },

  subscribePorCliente(
    clientId: string,
    onNext: (items: SolicitudProcesamiento[]) => void,
    onErr?: (e: Error) => void,
  ): () => void {
    const cid = String(clientId ?? "").trim();
    if (!cid) {
      onNext([]);
      return () => {};
    }
    const q = query(colRef(cid), orderBy("createdAt", "desc"));
    return onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => mapDoc(cid, d.id, d.data() as Record<string, unknown>));
        onNext(list);
      },
      (e) => onErr?.(e as Error),
    );
  },

  /**
   * Cola en bodega interna: cuentas cuyo código coincide con `codeCuenta` de la bodega.
   */
  subscribeParaBodegaInterna(
    clientIds: string[],
    codeCuentaBodega: string,
    onNext: (items: SolicitudProcesamiento[]) => void,
    onErr?: (e: Error) => void,
  ): () => void {
    const code = String(codeCuentaBodega ?? "").trim();
    const ids = [...new Set(clientIds.map((id) => String(id ?? "").trim()).filter(Boolean))];
    if (!code || !ids.length) {
      onNext([]);
      return () => {};
    }

    const merged = new Map<string, SolicitudProcesamiento>();

    const emit = () => {
      const list = [...merged.values()]
        .filter((s) => s.codeCuenta.trim() === code)
        .sort((a, b) => createdAtMs(b) - createdAtMs(a));
      onNext(list);
    };

    const unsubs = ids.map((clientId) => {
      const q = query(colRef(clientId), orderBy("createdAt", "desc"));
      return onSnapshot(
        q,
        (snap) => {
          const prefix = `${clientId}::`;
          for (const key of [...merged.keys()]) {
            if (key.startsWith(prefix)) merged.delete(key);
          }
          snap.docs.forEach((d) => {
            const s = mapDoc(clientId, d.id, d.data() as Record<string, unknown>);
            merged.set(`${clientId}::${d.id}`, s);
          });
          emit();
        },
        (e) => onErr?.(e as Error),
      );
    });

    return () => unsubs.forEach((u) => u());
  },

  /** Estado actual en Firestore (útil si `actualizarEstado` falló por red pero el cambio llegó a aplicarse). */
  async obtenerEstadoSolicitud(clientId: string, solicitudId: string): Promise<ProcesamientoEstado | null> {
    const cid = String(clientId ?? "").trim();
    const sid = String(solicitudId ?? "").trim();
    if (!cid || !sid) return null;
    const ref = doc(db, "clientes", cid, COL, sid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const cur = mapDoc(cid, sid, snap.data() as Record<string, unknown>);
    return normalizeProcesamientoEstado(cur.estado);
  },

  async actualizarEstado(clientId: string, solicitudId: string, estado: string) {
    const cid = String(clientId ?? "").trim();
    if (!cid) throw new Error("sin_cliente");
    const sid = String(solicitudId ?? "").trim();
    if (!sid) throw new Error("sin_solicitud");
    const next = normalizeProcesamientoEstado(estado);
    const ref = doc(db, "clientes", cid, COL, sid);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error("no_existe");
    const cur = mapDoc(cid, sid, snap.data() as Record<string, unknown>);
    if (cur.estado === "Iniciado" && next === "En curso") {
      const uid = auth.currentUser?.uid ?? "";
      const op = String(cur.operarioBodegaUid ?? "").trim();
      if (!op) throw new Error("sin_operario_asignado");
      if (uid !== op) throw new Error("solo_operario_asignado");
    }
    await updateDoc(ref, { estado: next });
  },

  async asignarOperarioBodega(
    clientId: string,
    solicitudId: string,
    params: { operarioUid: string; operarioNombre: string },
  ) {
    const cid = String(clientId ?? "").trim();
    const sid = String(solicitudId ?? "").trim();
    if (!cid || !sid) throw new Error("parametros");
    const uid = String(params.operarioUid ?? "").trim();
    const nombre = String(params.operarioNombre ?? "").trim();
    if (!uid) throw new Error("sin_operario");
    const ref = doc(db, "clientes", cid, COL, sid);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error("no_existe");
    const cur = mapDoc(cid, sid, snap.data() as Record<string, unknown>);
    const estadoNorm = normalizeProcesamientoEstado(cur.estado);
    /** Iniciado: primera asignación. En curso: reasignar al procesador (u otro) sin cambiar estado. */
    if (estadoNorm !== "Iniciado" && estadoNorm !== "En curso") {
      throw new Error("estado_no_permite_reasignacion");
    }
    await updateDoc(ref, { operarioBodegaUid: uid, operarioBodegaNombre: nombre || uid });
  },
};
