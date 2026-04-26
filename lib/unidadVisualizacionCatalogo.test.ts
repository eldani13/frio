import { describe, expect, it } from "vitest";
import {
  etiquetaUnidadVisualizacion,
  UNIDAD_VIS_CATALOGO_OPCIONES,
  unidadVisualizacionStockMode,
} from "./unidadVisualizacionCatalogo";

describe("unidadVisualizacionCatalogo", () => {
  it("expone opciones y etiqueta por valor", () => {
    expect(UNIDAD_VIS_CATALOGO_OPCIONES.length).toBeGreaterThan(0);
    expect(etiquetaUnidadVisualizacion("peso")).toContain("Peso");
    expect(etiquetaUnidadVisualizacion("x")).toBe("x");
    expect(etiquetaUnidadVisualizacion(undefined)).toBe("—");
  });

  it("resuelve modo stock", () => {
    expect(unidadVisualizacionStockMode("peso")).toBe("peso");
    expect(unidadVisualizacionStockMode("kilos")).toBe("peso");
    expect(unidadVisualizacionStockMode("bolsas")).toBe("cantidad");
  });
});
