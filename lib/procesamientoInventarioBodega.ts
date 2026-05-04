import type { Slot } from "@/app/interfaces/bodega";
import type { SolicitudProcesamiento } from "@/app/types/solicitudProcesamiento";
import { normalizeProcesamientoEstado } from "@/app/types/solicitudProcesamiento";
import { coerceKgFromUnknown, coercePiezasFromUnknown, kgFromFirestoreSlotRecord } from "@/lib/coerceBodegaKg";

/** Campos mínimos para descontar inventario desde la cola del operario (`tareasProcesamientoOperario`). */
export function tareaColaOperarioToSolicitudInventario(t: Record<string, unknown>): SolicitudProcesamiento {
  const vis = t.unidadPrimarioVisualizacion;
  const unidad = vis === "peso" || vis === "cantidad" ? vis : "peso";
  return {
    id: String(t.solicitudId ?? ""),
    clientId: String(t.clientId ?? "").trim(),
    codeCuenta: String(t.codeCuenta ?? ""),
    clientName: String(t.clientName ?? ""),
    creadoPorNombre: "",
    creadoPorUid: "",
    numero: String(t.numero ?? ""),
    numericId: 0,
    productoPrimarioId: String(t.productoPrimarioId ?? "").trim(),
    productoPrimarioTitulo: String(t.productoPrimarioTitulo ?? "").trim(),
    productoSecundarioId: String(t.productoSecundarioId ?? "").trim(),
    productoSecundarioTitulo: String(t.productoSecundarioTitulo ?? "").trim(),
    cantidadPrimario: Number(t.cantidadPrimario) || 0,
    unidadPrimarioVisualizacion: unidad,
    warehouseId: String(t.warehouseId ?? "").trim() || undefined,
    estimadoUnidadesSecundario:
      t.estimadoUnidadesSecundario === null || t.estimadoUnidadesSecundario === undefined
        ? undefined
        : Number.isFinite(Number(t.estimadoUnidadesSecundario))
          ? Number(t.estimadoUnidadesSecundario)
          : undefined,
    reglaConversionCantidadPrimario: Number.isFinite(Number(t.reglaConversionCantidadPrimario))
      ? Number(t.reglaConversionCantidadPrimario)
      : undefined,
    reglaConversionUnidadesSecundario: Number.isFinite(Number(t.reglaConversionUnidadesSecundario))
      ? Number(t.reglaConversionUnidadesSecundario)
      : undefined,
    perdidaProcesamientoPct:
      t.perdidaProcesamientoPct === null || t.perdidaProcesamientoPct === undefined
        ? undefined
        : Number.isFinite(Number(t.perdidaProcesamientoPct))
          ? Math.min(100, Math.max(0, Number(t.perdidaProcesamientoPct)))
          : undefined,
    sobranteKg:
      t.sobranteKg === null || t.sobranteKg === undefined
        ? undefined
        : Number.isFinite(Number(t.sobranteKg))
          ? Math.max(0, Number(t.sobranteKg))
          : undefined,
    fecha: "",
    estado: normalizeProcesamientoEstado("En curso"),
  };
}

export type ResultadoDescuentoProcesamiento = {
  slots: Slot[];
  deductedKg: number;
  warning?: string;
};

function asRec(s: Slot): Record<string, unknown> {
  return s as unknown as Record<string, unknown>;
}

/** Igual que al vaciar posición en el mapa (sin importar el dashboard). */
const SLOT_VACIO_PATCH: Partial<Slot> = {
  autoId: "",
  name: "",
  temperature: null,
  client: "",
  quantityKg: undefined,
  ordenCompraId: undefined,
  ordenCompraClienteId: undefined,
  rd: undefined,
  renglon: undefined,
  lote: undefined,
  marca: undefined,
  embalaje: undefined,
  pesoUnitario: undefined,
  piezas: undefined,
  caducidad: undefined,
  fechaIngreso: undefined,
  llaveUnica: undefined,
  catalogoProductId: undefined,
  almacenProductCode: undefined,
  procesamientoSecundarioTitulo: undefined,
  procesamientoUnidadesSecundario: undefined,
  procesamientoSolicitudId: undefined,
  procesamientoDesperdicioDevueltoSolicitudId: undefined,
};

function scoreProductoEnSlot(s: Slot, row: SolicitudProcesamiento): number {
  if (!s.autoId?.trim()) return 0;
  if (String(s.client ?? "").trim() !== row.clientId.trim()) return 0;
  const rec = asRec(s);
  const pid = row.productoPrimarioId.trim();
  const cat = String(rec.catalogoProductId ?? "").trim();
  if (pid && cat === pid) return 3;
  const name = (s.name ?? "").toLowerCase();
  const titulo = row.productoPrimarioTitulo.trim().toLowerCase();
  if (titulo.length >= 10 && name.includes(titulo.slice(0, Math.min(60, titulo.length)))) return 2;
  const words = titulo.split(/\s+/).filter((w) => w.length > 3);
  if (words.length >= 2 && words.slice(0, 4).every((w) => name.includes(w))) return 1;
  return 0;
}

function computeKgADescontar(row: SolicitudProcesamiento, slotRec: Record<string, unknown>, currentKg: number): number {
  if (row.unidadPrimarioVisualizacion === "peso") {
    return Math.max(0, Number(row.cantidadPrimario) || 0);
  }
  const qty = Math.max(0, Number(row.cantidadPrimario) || 0);
  if (qty <= 0) return 0;
  const pu = coerceKgFromUnknown(slotRec.pesoUnitario);
  if (pu !== undefined && pu > 0) {
    return qty * pu;
  }
  const pz = coercePiezasFromUnknown(slotRec.piezas);
  if (pz !== undefined && pz > 0 && currentKg > 0) {
    return Math.min(currentKg, qty * (currentKg / pz));
  }
  return 0;
}

/**
 * Descuenta kg del **primario** en la primera posición de bodega que coincida (cliente + producto).
 * Se usa cuando el material **sale de la bodega** hacia procesamiento: al pasar la solicitud a **En curso**
 * (operario ya movilizó el stock). No debe llamarse de nuevo al pasar a **Pendiente** ni a **Terminado**.
 */
export function deductSlotsAfterProcesamientoTerminado(
  slots: Slot[],
  row: SolicitudProcesamiento,
  currentWarehouseId: string,
): ResultadoDescuentoProcesamiento {
  const wid = String(row.warehouseId ?? "").trim();
  const curW = String(currentWarehouseId ?? "").trim();
  if (wid && wid !== curW) {
    return {
      slots,
      deductedKg: 0,
      warning: "Esta orden corresponde a otra bodega; aquí no se descontó inventario.",
    };
  }

  const ranked = slots
    .map((s) => {
      const sc = scoreProductoEnSlot(s, row);
      const kg = kgFromFirestoreSlotRecord(asRec(s)) ?? 0;
      return { s, sc, kg };
    })
    .filter((x) => x.sc > 0 && x.kg > 0)
    .sort((a, b) => b.sc - a.sc || a.s.position - b.s.position);

  if (!ranked.length) {
    return {
      slots,
      deductedKg: 0,
      warning:
        "No se encontró posición en bodega con ese cliente y producto (o sin kg). Revisá que el mapa tenga el mismo catálogo o nombre.",
    };
  }

  const target = ranked[0].s;
  const rec = asRec(target);
  const currentKg = kgFromFirestoreSlotRecord(rec) ?? 0;
  if (currentKg <= 0) {
    return { slots, deductedKg: 0, warning: "La posición elegida no tiene kilos registrados." };
  }

  const rawDeduct = computeKgADescontar(row, rec, currentKg);
  if (rawDeduct <= 0) {
    return {
      slots,
      deductedKg: 0,
      warning:
        row.unidadPrimarioVisualizacion === "cantidad"
          ? "Para descontar por unidades hace falta peso unitario o piezas en la posición de bodega."
          : "No se pudo calcular el kg a descontar.",
    };
  }

  const applied = Math.min(rawDeduct, currentKg);
  const newKg = Math.max(0, currentKg - applied);
  const pos = target.position;

  const nextSlots = slots.map((it) => {
    if (it.position !== pos) return it;
    if (newKg <= 1e-9) {
      return { ...it, ...SLOT_VACIO_PATCH, position: pos };
    }
    const updated: Slot = { ...it, quantityKg: newKg };
    const pz0 = coercePiezasFromUnknown(rec.piezas);
    if (pz0 !== undefined && pz0 > 0 && currentKg > 0) {
      const newPz = Math.max(0, Math.round((newKg / currentKg) * pz0));
      (updated as unknown as Record<string, unknown>).piezas = newPz;
    }
    return updated;
  });

  return { slots: nextSlots, deductedKg: applied };
}

/**
 * Casillero del **producto primario** en bodega donde reintegrar kg de **sobrante** (misma heurística que el descuento).
 * Permite kg actuales en 0 (p. ej. todo salió a proceso) y aun así sumar el sobrante fraccionario.
 */
export function findSlotPrimarioParaDevolverDesperdicio(
  slots: Slot[],
  row: SolicitudProcesamiento,
): Slot | null {
  const ranked = slots
    .map((s) => {
      const sc = scoreProductoEnSlot(s, row);
      const kg = kgFromFirestoreSlotRecord(asRec(s)) ?? 0;
      return { s, sc, kg };
    })
    .filter((x) => x.sc > 0)
    .sort((a, b) => b.sc - a.sc || a.s.position - b.s.position);

  return ranked[0]?.s ?? null;
}
