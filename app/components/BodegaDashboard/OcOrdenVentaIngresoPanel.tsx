"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FiArchive } from "react-icons/fi";
import type { Box } from "@/app/interfaces/bodega";
import { OrdenVentaService } from "@/app/services/ordenVentaService";
import type { VentaPendienteCartonaje } from "@/app/types/ventaCuenta";
import type { VentaEnCursoLineItem } from "@/app/types/ventaCuenta";
import { formatKgEs, parseDecimalEs } from "@/app/lib/decimalEs";
import { ordenCompraIngresoLineKey } from "@/app/lib/ordenCompraIngresoLineKey";
import { CatalogoService } from "@/app/services/catalogoService";
import type { Catalogo } from "@/app/types/catalogo";

export type LineaIngresoDesdeVenta = {
  catalogoProductId: string;
  name: string;
  temperature: number;
  quantityKg: number;
};

export type IngresoDesdeOrdenVentaPayload = {
  orden: VentaPendienteCartonaje;
  lineas: LineaIngresoDesdeVenta[];
  /** Kg recibidos por fila: claves `line:0`, `line:1`, … */
  pesosRecibidosPorLinea: Record<string, number>;
  kgEsperadosPorLinea: number[];
  kgRecibidosPorLinea: number[];
};

const lineRowKey = ordenCompraIngresoLineKey;

function catalogoPorLinea(
  catalogos: Catalogo[],
  li: VentaEnCursoLineItem,
): Catalogo | undefined {
  const id = String(li.catalogoProductId ?? "").trim();
  if (!id) return undefined;
  return catalogos.find((c) => c.id === id);
}

function defaultKgEsperado(li: VentaEnCursoLineItem, cat: Catalogo | undefined): number {
  const cant = Number(li.cantidad) || 0;
  const w = Number(cat?.weightValue);
  if (Number.isFinite(w) && w > 0) {
    return w * cant;
  }
  return cant;
}

function esEstadoEnCurso(estado: string): boolean {
  return estado.trim().toLowerCase() === "en curso";
}

/** Pares cliente + venta deducidos de cajas en zona de salida con trazabilidad OV. */
function paresOrdenVentaDesdeSalida(boxes: Box[]): Array<{ cid: string; vid: string }> {
  const seen = new Set<string>();
  const out: Array<{ cid: string; vid: string }> = [];
  for (const b of boxes) {
    const cid = String(b.ordenVentaClienteId ?? "").trim();
    const vid = String(b.ordenVentaId ?? "").trim();
    if (!cid || !vid) continue;
    const k = `${cid}::${vid}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({ cid, vid });
  }
  return out;
}

type Props = {
  warehouseId: string;
  isBodegaInterna: boolean;
  /** Cajas en salida de esta bodega: sirven para detectar ventas «En curso» listas para ingreso. */
  outboundBoxes: Box[];
  /** Clave `idCliente::idVenta` si ya se armó el paquete para despacho (columna orden de salida). */
  paqueteActivoKey?: string;
  /** Armar paquete con todas las líneas de la venta para enviarlo junto en «Orden de salida». */
  onArmarPaquete?: (orden: VentaPendienteCartonaje) => void;
  onRegistrar: (payload: IngresoDesdeOrdenVentaPayload) => Promise<void> | void;
  /** Ej. `h-full min-h-0 overflow-y-auto` para igualar altura con otro panel en la misma columna. */
  className?: string;
};

/**
 * Ingreso desde venta: ventas **En curso** con cajas ya en **zona de salida** (trazabilidad en cajas).
 * Checklist por línea, temperatura y kg recibido; cierra la venta al registrar.
 */
export function OcOrdenVentaIngresoPanel({
  warehouseId,
  isBodegaInterna,
  outboundBoxes,
  paqueteActivoKey = "",
  onArmarPaquete,
  onRegistrar,
  className,
}: Props) {
  const [ordenes, setOrdenes] = useState<VentaPendienteCartonaje[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string>("");
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [temps, setTemps] = useState<Record<string, string>>({});
  const [kgs, setKgs] = useState<Record<string, string>>({});
  const [catalogos, setCatalogos] = useState<Catalogo[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const reload = useCallback(() => {
    if (!warehouseId.trim() || !isBodegaInterna) {
      setOrdenes([]);
      return;
    }
    setLoading(true);
    setLoadError(null);
    const pairs = paresOrdenVentaDesdeSalida(outboundBoxes);
    void Promise.all(
      pairs.map(async ({ cid, vid }) => {
        const v = await OrdenVentaService.getById(cid, vid);
        if (!v || !esEstadoEnCurso(v.estado)) return null;
        return { ...v, idClienteDueno: cid } as VentaPendienteCartonaje;
      }),
    )
      .then((rows) => {
        const list = rows.filter((x): x is VentaPendienteCartonaje => x != null);
        list.sort((a, b) => (b.numericId || 0) - (a.numericId || 0));
        setOrdenes(list);
        setSelectedKey((prev) => {
          if (prev && list.some((o) => `${o.idClienteDueno}::${o.id}` === prev)) return prev;
          return "";
        });
      })
      .catch(() => {
        setOrdenes([]);
        setLoadError(
          "No se pudieron cargar las ventas. Revisá permisos, conexión y la colección clientes/ordenesVenta.",
        );
      })
      .finally(() => setLoading(false));
  }, [warehouseId, isBodegaInterna, outboundBoxes]);

  useEffect(() => {
    reload();
  }, [reload]);

  const selected = useMemo(
    () => ordenes.find((o) => `${o.idClienteDueno}::${o.id}` === selectedKey) ?? null,
    [ordenes, selectedKey],
  );

  useEffect(() => {
    if (!selected) {
      setChecked({});
      setTemps({});
      setKgs({});
      setCatalogos([]);
      return;
    }
    const items = selected.lineItems ?? [];
    const nextCheck: Record<string, boolean> = {};
    const nextTemp: Record<string, string> = {};
    items.forEach((li, idx) => {
      const rowKey = lineRowKey(idx);
      nextCheck[rowKey] = true;
      nextTemp[rowKey] = "";
    });
    setChecked(nextCheck);
    setTemps(nextTemp);
    setSubmitError(null);

    const cid = selected.idClienteDueno?.trim();
    const cc = selected.codeCuenta?.trim() ?? "";
    if (cid) {
      void CatalogoService.getAll(cid, cc).then((cats) => {
        setCatalogos(cats);
        const nextKg: Record<string, string> = {};
        items.forEach((li, idx) => {
          const rowKey = lineRowKey(idx);
          const def = defaultKgEsperado(li, catalogoPorLinea(cats, li));
          const s = String(formatKgEs(def))
            .replace(/\s/g, "")
            .replace(/kg/gi, "")
            .trim();
          nextKg[rowKey] = s || String(def);
        });
        setKgs(nextKg);
      });
    } else {
      setCatalogos([]);
      setKgs({});
    }
  }, [selected]);

  const lineItems = selected?.lineItems ?? [];

  const checkedLinesValid = lineItems.every((li, idx) => {
    const rowKey = lineRowKey(idx);
    if (!checked[rowKey]) return true;
    const t = Number(String(temps[rowKey] ?? "").replace(",", "."));
    if (Number.isNaN(t)) return false;
    const k = parseDecimalEs(String(kgs[rowKey] ?? ""));
    return k != null && k > 0;
  });

  const canSubmit = Boolean(selected && checkedLinesValid && !submitting);

  const handleRegistrar = async () => {
    if (!selected || !canSubmit) return;
    setSubmitError(null);
    setSubmitting(true);

    const pesosRecibidosPorLinea: Record<string, number> = {};
    const lineas: LineaIngresoDesdeVenta[] = [];
    const kgEsp: number[] = [];
    const kgRec: number[] = [];

    for (let idx = 0; idx < lineItems.length; idx += 1) {
      const li = lineItems[idx];
      const rowKey = lineRowKey(idx);
      const id = String(li.catalogoProductId ?? "").trim();
      const esp = defaultKgEsperado(li, catalogoPorLinea(catalogos, li));
      kgEsp.push(esp);
      if (checked[rowKey]) {
        const temperature = Number(String(temps[rowKey] ?? "").replace(",", "."));
        const quantityKg = parseDecimalEs(String(kgs[rowKey] ?? "")) ?? 0;
        pesosRecibidosPorLinea[rowKey] = quantityKg;
        kgRec.push(quantityKg);
        if (!id) {
          setSubmitError("Hay una línea sin producto de catálogo; no se puede registrar la caja.");
          setSubmitting(false);
          return;
        }
        lineas.push({
          catalogoProductId: id,
          name: li.titleSnapshot?.trim() || "Producto",
          temperature,
          quantityKg,
        });
      } else {
        pesosRecibidosPorLinea[rowKey] = 0;
        kgRec.push(0);
      }
    }

    try {
      await onRegistrar({
        orden: selected,
        lineas,
        pesosRecibidosPorLinea,
        kgEsperadosPorLinea: kgEsp,
        kgRecibidosPorLinea: kgRec,
      });
      setSelectedKey("");
      reload();
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : "No se pudo completar el ingreso.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isBodegaInterna) {
    return (
      <div
        className={`flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50/90 p-4 sm:p-6${className ? ` ${className}` : ""}`}
      >
        <p className="text-sm font-medium text-amber-950">
          El ingreso desde venta aplica solo en <strong>bodegas internas</strong>.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`flex w-full min-w-0 flex-col gap-4 rounded-2xl border border-teal-200 bg-white p-4 shadow-lg sm:p-6 lg:p-8${className ? ` ${className}` : ""}`}
    >
      <div className="flex items-start gap-3">
        <span className="shrink-0 rounded-full bg-teal-600 p-2 text-white">
          <FiArchive className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-slate-900">Ingreso desde venta</h2>
          <p className="mt-1 text-xs text-slate-600">
            Elegí una venta <strong>En curso</strong> con cajas ya en <strong>salida</strong>, revisá el pedido y
            tocá <strong>Armar paquete</strong> para despachar todo junto en la columna «Orden de salida» (estado
            pasa a <strong>Transporte</strong> y el viaje queda para el rol transporte).
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[12rem] flex-1">
          <label className="mb-1 block text-xs font-semibold text-slate-600">Orden de venta</label>
          <select
            value={selectedKey}
            onChange={(e) => setSelectedKey(e.target.value)}
            className="w-full rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm font-medium text-teal-900"
          >
            <option value="">{loading ? "Cargando…" : "Seleccioná una venta"}</option>
            {ordenes.map((o) => (
              <option key={`${o.idClienteDueno}-${o.id}`} value={`${o.idClienteDueno}::${o.id}`}>
                {o.numero} · {o.codeCuenta ?? o.idClienteDueno} · {o.compradorNombre}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={() => reload()}
          disabled={loading}
          className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Actualizar
        </button>
      </div>

      {loadError ? (
        <p className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-xs text-rose-800">{loadError}</p>
      ) : null}

      {!selected ? (
        <p className="text-sm text-slate-500">
          {ordenes.length === 0 && !loading
            ? "No hay ventas en curso con cajas en salida (falta trazabilidad de venta en las cajas o el pedido no está en curso)."
            : "Seleccioná una venta para armar el paquete o usar el registro alternativo abajo."}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-slate-600">
            <span className="font-semibold">{selected.numero}</span>
            {selected.destinoWarehouseNombre ? (
              <>
                {" "}
                · Destino: <span className="font-medium">{selected.destinoWarehouseNombre}</span>
              </>
            ) : null}
          </p>

          {onArmarPaquete ? (
            <div className="rounded-2xl border-2 border-dashed border-teal-400 bg-linear-to-br from-teal-50 to-white p-4 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wide text-teal-900">Paquete de despacho</p>
              <p className="mt-1 text-[11px] leading-relaxed text-teal-800">
                Incluye <strong>todas las líneas</strong> de esta venta. En la columna «Orden de salida» vas a
                enviar las cajas de salida vinculadas a este pedido en un solo envío al transporte.
              </p>
              {paqueteActivoKey === selectedKey ? (
                <p className="mt-3 rounded-xl border border-teal-200 bg-white px-3 py-2 text-sm font-semibold text-teal-800">
                  Listo: completá el envío en <strong>Orden de salida</strong> → «Enviar paquete al transporte».
                </p>
              ) : (
                <button
                  type="button"
                  onClick={() => onArmarPaquete(selected)}
                  className="mt-3 w-full rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-teal-600"
                >
                  Armar paquete de despacho
                </button>
              )}
            </div>
          ) : null}

          <details className="rounded-xl border border-slate-200 bg-slate-50/80">
            <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-slate-700">
              Registro alternativo: ingreso por línea (cerrar venta en bodega)
            </summary>
            <div className="border-t border-slate-200 px-2 pb-2 pt-1">
          <ul className="max-h-[min(24rem,50vh)] space-y-3 overflow-y-auto pr-1">
            {lineItems.map((li, idx) => {
              const rowKey = lineRowKey(idx);
              const isChecked = Boolean(checked[rowKey]);
              const esp = defaultKgEsperado(li, catalogoPorLinea(catalogos, li));
              return (
                <li
                  key={rowKey}
                  className="rounded-xl border border-teal-100 bg-teal-50/50 p-3 text-sm"
                >
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) =>
                        setChecked((prev) => ({ ...prev, [rowKey]: e.target.checked }))
                      }
                      className="mt-1 h-4 w-4 shrink-0 rounded border-teal-300 text-teal-600"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="font-semibold text-slate-900">{li.titleSnapshot}</span>
                      <span className="mt-1 block text-xs text-slate-600">
                        Pedido: <span className="font-medium">{li.cantidad} u.</span> · Kg teórico:{" "}
                        <span className="font-medium">{formatKgEs(esp)} kg</span>
                      </span>
                    </span>
                  </label>
                  {isChecked ? (
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                        Temperatura (°C)
                        <input
                          type="number"
                          step="any"
                          value={temps[rowKey] ?? ""}
                          onChange={(e) =>
                            setTemps((prev) => ({ ...prev, [rowKey]: e.target.value }))
                          }
                          className="rounded-lg border border-teal-200 bg-white px-2 py-1.5 text-sm"
                          placeholder="Ej: -18"
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                        Peso recibido (kg)
                        <input
                          type="text"
                          inputMode="decimal"
                          value={kgs[rowKey] ?? ""}
                          onChange={(e) => setKgs((prev) => ({ ...prev, [rowKey]: e.target.value }))}
                          placeholder="Ej. 15,6"
                          className="rounded-lg border border-teal-200 bg-white px-2 py-1.5 text-sm"
                        />
                      </label>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>

          {submitError ? <p className="text-sm text-rose-600">{submitError}</p> : null}

          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => void handleRegistrar()}
            className="mt-auto w-full rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-500 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting
              ? "Registrando…"
              : "Registrar cajas de venta y cerrar orden (todas las líneas marcadas)"}
          </button>
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
