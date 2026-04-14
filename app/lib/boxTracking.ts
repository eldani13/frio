import type {
  Box,
  BodegaOrder,
  DispatchedHistoryEntry,
  HistoryIngresoSnapshot,
  OrderSource,
  Slot,
} from "@/app/interfaces/bodega";

export type BoxTrackStep = {
  id: string;
  atMs: number;
  title: string;
  subtitle: string;
  kind: "ingreso" | "bodega" | "salida" | "despacho";
};

function normId(s: string) {
  return s.trim().toLowerCase();
}

function zoneShort(z: OrderSource): string {
  if (z === "bodega") return "Bodega";
  if (z === "salida") return "Salida";
  if (z === "procesamiento") return "Procesamiento";
  return "Ingreso";
}

export type BoxCurrentLocation = {
  zone: OrderSource | "despachado";
  position: number;
  label: string;
};

export function resolveCurrentBoxLocation(
  autoId: string,
  inboundBoxes: Box[],
  outboundBoxes: Box[],
  dispatchedBoxes: Box[],
  slots: Slot[],
): BoxCurrentLocation | null {
  const id = normId(autoId);
  if (!id) return null;
  const ib = inboundBoxes.find((b) => normId(b.autoId) === id);
  if (ib) {
    return { zone: "ingresos", position: ib.position, label: `Ingreso · posición ${ib.position}` };
  }
  const ob = outboundBoxes.find((b) => normId(b.autoId) === id);
  if (ob) {
    return { zone: "salida", position: ob.position, label: `Salida · posición ${ob.position}` };
  }
  const dp = dispatchedBoxes.find((b) => normId(b.autoId) === id);
  if (dp) {
    return {
      zone: "despachado",
      position: dp.position,
      label: `Despachado (en mapa) · posición ${dp.position}`,
    };
  }
  const sl = slots.find((s) => normId(s.autoId) === id && s.autoId.trim());
  if (sl) {
    return { zone: "bodega", position: sl.position, label: `Bodega interna · posición ${sl.position}` };
  }
  return null;
}

export function buildBoxTrackingTimeline(
  autoIdRaw: string,
  input: {
    ingresos: HistoryIngresoSnapshot[];
    movimientosBodega: BodegaOrder[];
    salidas: BodegaOrder[];
    despachadosHistorial: DispatchedHistoryEntry[];
    inboundBoxes: Box[];
    outboundBoxes: Box[];
    dispatchedBoxes: Box[];
    slots: Slot[];
  },
): { steps: BoxTrackStep[]; current: BoxCurrentLocation | null } {
  const autoId = autoIdRaw.trim();
  const nid = normId(autoId);
  if (!nid) return { steps: [], current: null };

  const steps: BoxTrackStep[] = [];

  for (const b of input.ingresos) {
    if (normId(b.autoId) !== nid) continue;
    const at = b.historialAtMs ?? 0;
    steps.push({
      id: `in-${b.position}-${b.autoId}-${at}`,
      atMs: at,
      title: "Ingreso registrado",
      subtitle: `${b.name || "—"} · pos. ${b.position}`,
      kind: "ingreso",
    });
  }

  for (const o of input.movimientosBodega) {
    if (!o.autoId || normId(o.autoId) !== nid) continue;
    const at = o.completadoAtMs ?? o.createdAtMs;
    steps.push({
      id: `mv-${o.id}`,
      atMs: at,
      title: "Movimiento a bodega",
      subtitle: `Desde ${zoneShort(o.sourceZone)} ${o.sourcePosition} → celda ${o.targetPosition ?? "—"}`,
      kind: "bodega",
    });
  }

  for (const o of input.salidas) {
    if (!o.autoId || normId(o.autoId) !== nid) continue;
    const at = o.completadoAtMs ?? o.createdAtMs;
    steps.push({
      id: `sal-${o.id}`,
      atMs: at,
      title: "Paso a zona de salida",
      subtitle: `Desde bodega pos. ${o.sourcePosition} → salida pos. ${o.targetPosition ?? "—"}`,
      kind: "salida",
    });
  }

  for (const d of input.despachadosHistorial) {
    if (normId(d.box.autoId) !== nid) continue;
    steps.push({
      id: d.id,
      atMs: d.atMs,
      title: "Despacho",
      subtitle: `Salida pos. ${d.fromSalidaPosition} · ${d.box.name || "—"}`,
      kind: "despacho",
    });
  }

  steps.sort((a, b) => a.atMs - b.atMs);

  const current = resolveCurrentBoxLocation(
    autoId,
    input.inboundBoxes,
    input.outboundBoxes,
    input.dispatchedBoxes,
    input.slots,
  );

  return { steps, current };
}

export function collectKnownBoxIds(input: {
  ingresos: HistoryIngresoSnapshot[];
  movimientosBodega: BodegaOrder[];
  salidas: BodegaOrder[];
  despachadosHistorial: DispatchedHistoryEntry[];
  inboundBoxes: Box[];
  outboundBoxes: Box[];
  dispatchedBoxes: Box[];
  slots: Slot[];
}): { value: string; label: string }[] {
  const map = new Map<string, string>();

  const put = (autoId: string, hint: string) => {
    const v = autoId.trim();
    if (!v) return;
    if (!map.has(v)) map.set(v, hint);
  };

  for (const b of input.ingresos) put(b.autoId, b.name || b.autoId);
  for (const b of input.inboundBoxes) put(b.autoId, b.name || b.autoId);
  for (const s of input.slots) if (s.autoId.trim()) put(s.autoId, s.name || s.autoId);
  for (const b of input.outboundBoxes) put(b.autoId, b.name || b.autoId);
  for (const b of input.dispatchedBoxes) put(b.autoId, b.name || b.autoId);
  for (const o of input.movimientosBodega) if (o.autoId) put(o.autoId, o.boxName || o.autoId);
  for (const o of input.salidas) if (o.autoId) put(o.autoId, o.boxName || o.autoId);
  for (const d of input.despachadosHistorial) put(d.box.autoId, d.box.name || d.box.autoId);

  return [...map.entries()]
    .map(([value, name]) => ({ value, label: `${value}${name && name !== value ? ` · ${name}` : ""}` }))
    .sort((a, b) => a.value.localeCompare(b.value));
}
