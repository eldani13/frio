import type { Slot } from "@/app/interfaces/bodega";
import { coerceKgFromUnknown, coercePiezasFromUnknown, kgFromFirestoreSlotRecord } from "@/lib/coerceBodegaKg";
import { unidadVisualizacionStockMode } from "@/lib/unidadVisualizacionCatalogo";

export type VentaLineItemLike = {
  catalogoProductId?: string;
  titleSnapshot: string;
  cantidad: number;
  /** Tomado del catálogo al asignar la tarea (peso vs cantidad en mapa). */
  unidadVisualizacion?: string;
};

function slotAsRec(s: Slot): Record<string, unknown> {
  return s as unknown as Record<string, unknown>;
}

function catalogoSlot(s: Slot): string {
  return String(slotAsRec(s).catalogoProductId ?? "").trim();
}

function norm(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Quita sufijos de cantidad tipo «(5 u.)» o «— 3 kg» del título de línea de venta. */
function tituloLineaSinCantidad(raw: string): string {
  let t = String(raw ?? "").trim();
  const paren = t.indexOf("(");
  if (paren > 0) t = t.slice(0, paren).trim();
  const em = t.indexOf("—");
  if (em > 0) t = t.slice(0, em).trim();
  const dash = t.indexOf(" - ");
  if (dash > 0) t = t.slice(0, dash).trim();
  return t.trim();
}

function tituloLineaNormalizado(line: VentaLineItemLike): string {
  return norm(tituloLineaSinCantidad(line.titleSnapshot));
}

/**
 * Coincidencia texto pedido vs primario o secundario en mapa (subcadena o igualdad).
 * Incluye títulos cortos (ej. «CARNE») que antes quedaban fuera por umbral de longitud.
 */
function tituloCoincideConTexto(tituloNorm: string, textoNorm: string): boolean {
  if (!tituloNorm || !textoNorm) return false;
  if (tituloNorm === textoNorm) return true;
  if (tituloNorm.length < 2) return false;
  if (textoNorm.includes(tituloNorm) || tituloNorm.includes(textoNorm)) return true;
  const words = tituloNorm.split(/\s+/).filter((w) => w.length > 2);
  if (words.length >= 2) {
    return words.slice(0, 6).every((w) => textoNorm.includes(w));
  }
  return false;
}

/** Parte primaria y secundaria desde `name` con «→» (mismo criterio que `secondaryTitleFromSlot`). */
function partesPrimarioSecundarioDesdeNombre(nameNorm: string): { primario: string; secundario: string } {
  const hay = nameNorm.includes("→");
  if (!hay) {
    return { primario: nameNorm, secundario: "" };
  }
  const parts = nameNorm.split("→").map((x) => x.trim()).filter(Boolean);
  const primario = parts[0] ?? nameNorm;
  const secundario = parts.length >= 2 ? (parts[parts.length - 1] ?? "") : "";
  return { primario, secundario };
}

/** Heurística suave si no alcanzó match explícito primario/secundario. */
function fuzzyTituloEnSlot(
  title: string,
  name: string,
  partePrimaria: string,
  secundarioCampo: string,
  secundarioNombre: string,
): boolean {
  if (title.length >= 3) {
    if (name.includes(title)) return true;
    if (secundarioCampo && tituloCoincideConTexto(title, secundarioCampo)) return true;
    if (secundarioNombre && tituloCoincideConTexto(title, secundarioNombre)) return true;
    if (partePrimaria && tituloCoincideConTexto(title, partePrimaria)) return true;
  }

  if (title.length >= 6) {
    const pref = title.slice(0, Math.min(90, title.length));
    if (name.includes(pref) || partePrimaria.includes(pref)) return true;
  }

  if (title.length >= 10) {
    const head = title.slice(0, Math.min(50, title.length));
    if (name.includes(head) || partePrimaria.includes(head)) return true;
  }

  const words = title.split(/\s+/).filter((w) => w.length > 3);
  if (words.length >= 2) {
    const ok = words.slice(0, 5).every(
      (w) => name.includes(w) || partePrimaria.includes(w) || secundarioNombre.includes(w) || secundarioCampo.includes(w),
    );
    if (ok) return true;
  }

  if (secundarioCampo && title.length >= 4 && secundarioCampo.includes(title.slice(0, Math.min(40, title.length)))) {
    return true;
  }

  return false;
}

/** Misma cuenta dueña del slot que la venta. */
function mismoClienteSlot(s: Slot, cuentaClientId: string): boolean {
  return String(s.client ?? "").trim() === String(cuentaClientId ?? "").trim();
}

export function slotVinculadoOrdenVenta(s: Slot, ventaId: string, ventaClienteId: string): boolean {
  return (
    String(s.ordenVentaId ?? "").trim() === ventaId &&
    String(s.ordenVentaClienteId ?? "").trim() === ventaClienteId
  );
}

/**
 * Slot de bodega que puede cubrir una línea de venta (stock ya en mapa sin trazabilidad OV).
 * Busca coincidencia por **producto primario** o **producto secundario** (nombre o campo de procesamiento)
 * antes de aplicar heurísticas más laxas.
 */
export function slotCubreLineaVenta(s: Slot, line: VentaLineItemLike, cuentaClientId: string): boolean {
  if (!String(s.autoId ?? "").trim()) return false;
  if (!mismoClienteSlot(s, cuentaClientId)) return false;

  const catLine = String(line.catalogoProductId ?? "").trim();
  const catSlot = catalogoSlot(s);
  if (catLine && catSlot && catLine === catSlot) return true;

  const title = tituloLineaNormalizado(line);
  if (!title) return false;

  const name = norm(String(s.name ?? "").replace(/\s*->\s*/g, " → "));
  const secundarioCampo = norm(String(s.procesamientoSecundarioTitulo ?? "").trim());
  const { primario: partePrimaria, secundario: secundarioDesdeNombre } = partesPrimarioSecundarioDesdeNombre(name);

  // 1) Secundario: campo explícito o tramo después de «→» en el nombre
  if (secundarioCampo && tituloCoincideConTexto(title, secundarioCampo)) return true;
  if (secundarioDesdeNombre && tituloCoincideConTexto(title, secundarioDesdeNombre)) return true;

  // 2) Primario: tramo antes de «→» o el nombre completo si no hay flecha
  if (partePrimaria && tituloCoincideConTexto(title, partePrimaria)) return true;

  // 3) Fallback (nombres largos, varias palabras, etc.)
  return fuzzyTituloEnSlot(title, name, partePrimaria, secundarioCampo, secundarioDesdeNombre);
}

function parseLineItems(raw: unknown): VentaLineItemLike[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((x) => {
    const r = x as Record<string, unknown>;
    const uv = String(r.unidadVisualizacion ?? "").trim();
    return {
      catalogoProductId: String(r.catalogoProductId ?? "").trim() || undefined,
      titleSnapshot: String(r.titleSnapshot ?? ""),
      cantidad: Number(r.cantidad) || 0,
      ...(uv ? { unidadVisualizacion: uv } : {}),
    };
  });
}

/** Igual que al vaciar posición en el mapa al mover toda la caja. */
const VACIAR_SLOT_BODEGA: Partial<Slot> = {
  autoId: "",
  name: "",
  temperature: null,
  client: "",
  quantityKg: undefined,
  ordenCompraId: undefined,
  ordenCompraClienteId: undefined,
  ordenVentaId: undefined,
  ordenVentaClienteId: undefined,
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
  procesamientoSecundarioTitulo: undefined,
  procesamientoUnidadesSecundario: undefined,
  procesamientoSolicitudId: undefined,
};

function kgFromSlotLive(s: Slot): number {
  return kgFromFirestoreSlotRecord(slotAsRec(s)) ?? 0;
}

function computeKgTomados(
  cantidadPedido: number,
  mode: "peso" | "cantidad",
  rec: Record<string, unknown>,
  currentKg: number,
): number {
  if (currentKg <= 0) return 0;
  if (mode === "peso") {
    return Math.max(0, Math.min(cantidadPedido, currentKg));
  }
  const qty = Math.max(0, cantidadPedido);
  if (qty <= 0) return 0;
  const pu = coerceKgFromUnknown(rec.pesoUnitario);
  if (pu !== undefined && pu > 0) {
    return Math.min(currentKg, qty * pu);
  }
  const pz = coercePiezasFromUnknown(rec.piezas);
  if (pz !== undefined && pz > 0 && currentKg > 0) {
    return Math.min(currentKg, qty * (currentKg / pz));
  }
  /** Cajas de procesamiento: unidades del secundario (misma base que `formatSlotCantidadDisplay`). */
  const procU = coercePiezasFromUnknown(rec.procesamientoUnidadesSecundario);
  if (procU !== undefined && procU > 0 && currentKg > 0) {
    return Math.min(currentKg, qty * (currentKg / procU));
  }
  return 0;
}

function unidadesDisponiblesEnSlot(rec: Record<string, unknown>, currentKg: number): number {
  const pz = coercePiezasFromUnknown(rec.piezas);
  if (pz !== undefined && pz > 0) return Math.floor(pz);
  const procU = coercePiezasFromUnknown(rec.procesamientoUnidadesSecundario);
  if (procU !== undefined && procU > 0) return Math.floor(procU);
  const pu = coerceKgFromUnknown(rec.pesoUnitario);
  if (pu !== undefined && pu > 0 && currentKg > 0) return Math.floor(currentKg / pu);
  return 0;
}

function applyKgDeductionToSlot(slot: Slot, appliedKg: number): Slot {
  const rec = slotAsRec(slot);
  const currentKg = kgFromFirestoreSlotRecord(rec) ?? 0;
  if (appliedKg <= 0 || currentKg <= 0) return slot;
  const newKg = Math.max(0, currentKg - appliedKg);
  const pos = slot.position;
  if (newKg <= 1e-9) {
    return { ...slot, ...VACIAR_SLOT_BODEGA, position: pos };
  }
  const updated: Slot = { ...slot, quantityKg: newKg };
  const pz0 = coercePiezasFromUnknown(rec.piezas);
  const procU0 = coercePiezasFromUnknown(rec.procesamientoUnidadesSecundario);
  if (pz0 !== undefined && pz0 > 0 && currentKg > 0) {
    const newPz = Math.max(0, Math.round((newKg / currentKg) * pz0));
    (updated as unknown as Record<string, unknown>).piezas = newPz;
  } else if (procU0 !== undefined && procU0 > 0 && currentKg > 0) {
    const newProcU = Math.max(0, Math.round((newKg / currentKg) * procU0));
    (updated as unknown as Record<string, unknown>).procesamientoUnidadesSecundario = newProcU;
  }
  return updated;
}

function cloneSlots(slots: Slot[]): Slot[] {
  return slots.map((s) => ({ ...s }));
}

function sortCandidatesForLine(
  working: Slot[],
  line: VentaLineItemLike,
  clientId: string,
  ventaId: string,
): Slot[] {
  return working
    .filter((s) => String(s.autoId ?? "").trim() && slotCubreLineaVenta(s, line, clientId))
    .sort((a, b) => {
      const oa = slotVinculadoOrdenVenta(a, ventaId, clientId) ? 0 : 1;
      const ob = slotVinculadoOrdenVenta(b, ventaId, clientId) ? 0 : 1;
      if (oa !== ob) return oa - ob;
      return a.position - b.position;
    });
}

export type MovimientoSalidaVenta = {
  position: number;
  /** Kg que pasan a la zona de salida (la caja en salida lleva este peso). */
  kgSalida: number;
};

export type PlanSalidaVentaDesdeMapaResult =
  | { ok: true; movimientos: MovimientoSalidaVenta[]; slotsTrasDescuento: Slot[] }
  | { ok: false; message: string };

/**
 * Calcula cuánto kg sale de cada posición según las líneas del pedido y deja el mapa con el remanente.
 * - Modo **peso**: `cantidad` = kg a descontar.
 * - Modo **cantidad** (unidades): convierte con `pesoUnitario` o reparto kg/piezas del slot (igual que procesamiento).
 */
export function planSalidaVentaDesdeMapa(slots: Slot[], tarea: Record<string, unknown>): PlanSalidaVentaDesdeMapaResult {
  const clientId = String(tarea.clientId ?? "").trim();
  const ventaId = String(tarea.ventaId ?? tarea.ordenVentaId ?? "").trim();
  if (!clientId || !ventaId) {
    return { ok: false, message: "Falta cliente u orden de venta en la tarea." };
  }

  const lineItems = parseLineItems(tarea.lineItems);
  if (lineItems.length === 0) {
    return { ok: false, message: "La tarea no tiene líneas de pedido." };
  }

  let working = cloneSlots(slots);
  const movimientosRaw: Array<{ position: number; kg: number }> = [];

  for (const line of lineItems) {
    const titulo = String(line.titleSnapshot ?? "").trim() || "producto";
    const cantidad = Number(line.cantidad) || 0;
    if (cantidad <= 0) continue;

    let mode = unidadVisualizacionStockMode(line.unidadVisualizacion);
    if (!String(line.unidadVisualizacion ?? "").trim()) {
      const probe = sortCandidatesForLine(working, line, clientId, ventaId)[0];
      if (probe) {
        const rec = slotAsRec(probe);
        const pz = coercePiezasFromUnknown(rec.piezas);
        const pu = coerceKgFromUnknown(rec.pesoUnitario);
        const ck = kgFromSlotLive(probe);
        if (ck > 0 && (pz === undefined || pz <= 0) && (pu === undefined || pu <= 0)) {
          mode = "peso";
        }
      }
    }
    const candidates = sortCandidatesForLine(working, line, clientId, ventaId);

    if (candidates.length === 0) {
      return {
        ok: false,
        message: `No hay posición en el mapa que coincida con «${titulo}» y la cuenta del pedido.`,
      };
    }

    if (mode === "peso") {
      let needKg = cantidad;
      for (const c of candidates) {
        while (needKg > 1e-6) {
          const idx = working.findIndex((s) => s.position === c.position);
          if (idx < 0) break;
          const live = working[idx];
          const ck = kgFromSlotLive(live);
          if (ck <= 0) break;
          const take = Math.min(needKg, ck);
          if (take <= 0) break;
          movimientosRaw.push({ position: live.position, kg: take });
          working[idx] = applyKgDeductionToSlot(live, take);
          needKg -= take;
        }
        if (needKg <= 1e-6) break;
      }
      if (needKg > 1e-3) {
        return {
          ok: false,
          message: `No hay stock suficiente en el mapa para «${titulo}» (faltan ~${needKg.toFixed(2)} kg según el pedido).`,
        };
      }
    } else {
      let needUnits = Math.round(Math.abs(cantidad));
      if (needUnits <= 0) continue;

      for (const c of candidates) {
        while (needUnits > 0) {
          const idx = working.findIndex((s) => s.position === c.position);
          if (idx < 0) break;
          const live = working[idx];
          const ck = kgFromSlotLive(live);
          if (ck <= 0) break;
          const rec = slotAsRec(live);
          const maxU = unidadesDisponiblesEnSlot(rec, ck);
          if (maxU <= 0) break;
          const takeU = Math.min(needUnits, maxU);
          const takeKg = computeKgTomados(takeU, "cantidad", rec, ck);
          if (takeKg <= 0) {
            return {
              ok: false,
              message: `No se pudo calcular el peso a salir para «${titulo}»: cargá peso unitario o piezas en la posición de bodega.`,
            };
          }
          movimientosRaw.push({ position: live.position, kg: takeKg });
          working[idx] = applyKgDeductionToSlot(live, takeKg);
          needUnits -= takeU;
        }
        if (needUnits <= 0) break;
      }
      if (needUnits > 0) {
        return {
          ok: false,
          message: `No hay unidades suficientes en el mapa para «${titulo}» (faltan ${needUnits} u.).`,
        };
      }
    }
  }

  if (movimientosRaw.length === 0) {
    return {
      ok: false,
      message: "No se pudo calcular cantidad a salir: revisá líneas del pedido y stock en el mapa.",
    };
  }

  const byPos = new Map<number, number>();
  for (const m of movimientosRaw) {
    byPos.set(m.position, (byPos.get(m.position) ?? 0) + m.kg);
  }
  const movimientos: MovimientoSalidaVenta[] = [...byPos.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([position, kgSalida]) => ({ position, kgSalida }));

  return { ok: true, movimientos, slotsTrasDescuento: working };
}

/**
 * @deprecated Usar `planSalidaVentaDesdeMapa`. Conservado por si hay llamadas externas.
 */
export function candidatosSlotsSalidaVenta(slots: Slot[], tarea: Record<string, unknown>): Slot[] {
  const plan = planSalidaVentaDesdeMapa(slots, tarea);
  if (!plan.ok) return [];
  const set = new Set(plan.movimientos.map((m) => m.position));
  return slots.filter((s) => set.has(s.position)).sort((a, b) => a.position - b.position);
}
