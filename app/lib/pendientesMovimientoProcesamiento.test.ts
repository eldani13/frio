import { describe, expect, it } from "vitest";
import type { BodegaOrder, Slot } from "@/app/interfaces/bodega";
import type { SolicitudProcesamiento } from "@/app/types/solicitudProcesamiento";
import {
  desperdicioDevueltoEnMapa,
  listPendientesMovimientoBodega,
  procesamientoUbicacionCompletaEnMapa,
  slotTieneProcesadoUbicado,
} from "./pendientesMovimientoProcesamiento";

function row(overrides: Partial<SolicitudProcesamiento> = {}): SolicitudProcesamiento {
  return {
    id: "sol1",
    clientId: "cli1",
    codeCuenta: "C1",
    clientName: "Cliente",
    creadoPorNombre: "op",
    creadoPorUid: "u1",
    numero: "P-0001",
    numericId: 1,
    productoPrimarioId: "p1",
    productoPrimarioTitulo: "Pollo",
    productoSecundarioId: "s1",
    productoSecundarioTitulo: "Lonchas",
    cantidadPrimario: 10,
    unidadPrimarioVisualizacion: "peso",
    fecha: "2026-01-01",
    estado: "Pendiente",
    ...overrides,
  };
}

function slot(overrides: Partial<Slot> = {}): Slot {
  return {
    position: 1,
    autoId: "BOX-1",
    name: "Pollo",
    temperature: 2,
    client: "cli1",
    ...overrides,
  };
}

function order(overrides: Partial<BodegaOrder> = {}): BodegaOrder {
  return {
    id: "o1",
    type: "a_bodega",
    sourcePosition: 1,
    sourceZone: "procesamiento",
    targetPosition: 2,
    createdAt: "hoy",
    createdAtMs: 1,
    createdBy: "jefe",
    procesamientoOrigen: {
      cuentaClientId: "cli1",
      solicitudId: "sol1",
      numero: "P-0001",
      productoPrimarioTitulo: "Pollo",
      productoSecundarioTitulo: "Lonchas",
      cantidadPrimario: 10,
      unidadPrimarioVisualizacion: "peso",
      rolDevolucion: "procesado",
    },
    ...overrides,
  };
}

describe("pendientesMovimientoProcesamiento", () => {
  it("detecta procesado ubicado y desperdicio devuelto", () => {
    const slots = [
      slot({ procesamientoSolicitudId: "sol1", procesamientoSecundarioTitulo: "Lonchas" }),
      slot({ position: 2, procesamientoDesperdicioDevueltoSolicitudId: "sol1" }),
    ];
    expect(slotTieneProcesadoUbicado(slots, "cli1", "sol1")).toBe(true);
    expect(desperdicioDevueltoEnMapa(slots, "cli1", "sol1")).toBe(true);
    expect(procesamientoUbicacionCompletaEnMapa(slots, row({ sobranteKg: 1 }))).toBe(true);
  });

  it("lista pendientes cuando falta ubicar y/o devolver", () => {
    const r = row({ sobranteKg: 2 });
    const slots = [slot({ name: "Pollo", quantityKg: 10, catalogoProductId: "p1" })];
    const out = listPendientesMovimientoBodega([r], slots, []);
    expect(out.map((x) => x.kind).sort()).toEqual(["desperdicio", "procesado"]);
  });

  it("no duplica pendiente cuando ya existe orden en cola", () => {
    const r = row({ sobranteKg: 2 });
    const slots = [slot({ name: "Pollo", quantityKg: 10 })];
    const out = listPendientesMovimientoBodega(
      [r],
      slots,
      [
        order({ procesamientoOrigen: { ...order().procesamientoOrigen!, rolDevolucion: "procesado" } }),
        order({ id: "o2", procesamientoOrigen: { ...order().procesamientoOrigen!, rolDevolucion: "desperdicio" } }),
      ],
    );
    expect(out).toHaveLength(0);
  });
});
