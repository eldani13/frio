import { describe, expect, it } from "vitest";
import type { FridemInventoryRow } from "@/lib/fridem/fridemInventory";
import {
  disponibilidadVistasExternas,
  graficoExternoTieneDatos,
  listadoExternoTieneDatos,
  primeraVistaExternaDisponible,
} from "./viewAvailability";

const fila = (kg: number): FridemInventoryRow => ({
  id: "1",
  lote: "L1",
  descripcion: "Prod",
  marca: "M",
  embalaje: "",
  caducidad: "",
  fechaIngreso: "",
  pesoUnitario: null,
  piezas: null,
  kilos: kg,
  kilosActual: kg,
  estado: "Disponible",
});

describe("viewAvailability bodegas externas", () => {
  it("sin registros: ninguna vista habilitada", () => {
    const a = disponibilidadVistasExternas([], false, null);
    expect(a).toEqual({ listado: false, grafico: false, reporte: false });
    expect(primeraVistaExternaDisponible(a)).toBeNull();
  });

  it("con registros y kg: listado y gráfico sí; reporte solo si hay embed por cuenta", () => {
    const a = disponibilidadVistasExternas([fila(10)], false, null);
    expect(a.listado).toBe(true);
    expect(a.grafico).toBe(true);
    expect(a.reporte).toBe(false);

    const gx = disponibilidadVistasExternas([fila(10)], false, null, "000GX");
    expect(gx.reporte).toBe(true);
  });

  it("000GX puede tener reporte sin inventario Fridem", () => {
    const a = disponibilidadVistasExternas([], false, null, "000GX");
    expect(a.listado).toBe(false);
    expect(a.reporte).toBe(true);
    expect(primeraVistaExternaDisponible(a)).toBe("REP");
  });

  it("gráfico deshabilitado si no hay kg positivo", () => {
    expect(graficoExternoTieneDatos([fila(0)], false, null)).toBe(false);
    expect(listadoExternoTieneDatos([fila(0)], false, null)).toBe(true);
  });

  it("cargando o con error: todo deshabilitado", () => {
    expect(disponibilidadVistasExternas([fila(5)], true, null).listado).toBe(false);
    expect(disponibilidadVistasExternas([fila(5)], false, "fallo").listado).toBe(false);
  });
});
