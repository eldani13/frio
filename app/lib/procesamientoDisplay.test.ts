import { describe, expect, it } from "vitest";
import type { Catalogo } from "@/app/types/catalogo";
import type { SolicitudProcesamiento } from "@/app/types/solicitudProcesamiento";
import {
  cantidadPrimarioProcesamientoTexto,
  estimadoUnidadesSecundarioTexto,
  modoStockPrimarioProcesamiento,
  primarioCatalogoPorId,
  textoPrecioSecundarioCatalogo,
} from "./procesamientoDisplay";

function cat(overrides: Partial<Catalogo> = {}): Catalogo {
  return {
    id: "p1",
    numericId: 1,
    code: "0001",
    createdAt: 1,
    title: "Pollo",
    description: "d",
    provider: "p",
    category: "c",
    productType: "Primario",
    status: "ok",
    codeCuenta: "C1",
    ...overrides,
  };
}

function row(overrides: Partial<SolicitudProcesamiento> = {}): SolicitudProcesamiento {
  return {
    id: "s1",
    clientId: "c1",
    codeCuenta: "C1",
    clientName: "Cliente",
    creadoPorNombre: "op",
    creadoPorUid: "u1",
    numero: "P-1",
    numericId: 1,
    productoPrimarioId: "p1",
    productoPrimarioTitulo: "Pollo",
    productoSecundarioId: "s2",
    productoSecundarioTitulo: "Lonchas",
    cantidadPrimario: 10,
    fecha: "hoy",
    estado: "Iniciado",
    ...overrides,
  };
}

describe("procesamientoDisplay", () => {
  it("busca catálogo por id y texto de precio secundario", () => {
    const productos = [cat({ id: "s2", price: 123 })];
    expect(primarioCatalogoPorId(productos, "s2")?.id).toBe("s2");
    expect(textoPrecioSecundarioCatalogo(productos, "s2")).toBe("$123");
    expect(textoPrecioSecundarioCatalogo(productos, "x")).toBe("—");
  });

  it("resuelve modo stock y texto de cantidad", () => {
    expect(modoStockPrimarioProcesamiento(row({ unidadPrimarioVisualizacion: "cantidad" }), null)).toBe("cantidad");
    expect(modoStockPrimarioProcesamiento(row({ unidadPrimarioVisualizacion: undefined }), cat({ unidadVisualizacion: "cantidad" }))).toBe("cantidad");

    expect(cantidadPrimarioProcesamientoTexto(row({ cantidadPrimario: 10, unidadPrimarioVisualizacion: "peso" }))).toBe("10 kg");
    expect(cantidadPrimarioProcesamientoTexto(row({ cantidadPrimario: 3, unidadPrimarioVisualizacion: "cantidad" }), cat({ unidadVisualizacion: "cajas" }))).toContain("3");
  });

  it("formatea estimado secundario", () => {
    expect(estimadoUnidadesSecundarioTexto(5)).toBe("5 u.");
    expect(estimadoUnidadesSecundarioTexto(undefined)).toBe("—");
  });
});
