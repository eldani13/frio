"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FiArchive } from "react-icons/fi";
import {
  OrdenCompraService,
  type OrdenCompraPendienteRecepcion,
} from "@/app/services/ordenCompraService";
import type { OrdenCompraLineItem } from "@/app/types/ordenCompra";
import { formatKgEs, parseDecimalEs } from "@/app/lib/decimalEs";
import { ordenCompraIngresoLineKey } from "@/app/lib/ordenCompraIngresoLineKey";
import { CatalogoService } from "@/app/services/catalogoService";
import type { Catalogo } from "@/app/types/catalogo";

export type LineaIngresoDesdeOc = {
  catalogoProductId: string;
  name: string;
  temperature: number;
  quantityKg: number;
};

export type LineaAdicionalIngresoOc = {
  catalogoProductId: string;
  name: string;
  temperature: number;
  quantityKg: number;
};

export type IngresoDesdeOrdenCompraPayload = {
  orden: OrdenCompraPendienteRecepcion;
  /** Cajas solo para líneas marcadas en checklist (kg > 0). */
  lineas: LineaIngresoDesdeOc[];
  /** Kg recibidos por fila: claves `line:0`, `line:1`, … (orden de `lineItems`). */
  pesosRecibidosPorLinea: Record<string, number>;
  lineaAdicional?: LineaAdicionalIngresoOc | null;
};

function defaultKgPorLinea(li: OrdenCompraLineItem): number {
  const pk = li.pesoKg;
  if (pk != null && Number.isFinite(Number(pk)) && Number(pk) > 0) return Number(pk);
  const c = Number(li.cantidad);
  return Number.isFinite(c) && c > 0 ? c : 0;
}

const lineRowKey = ordenCompraIngresoLineKey;

type Props = {
  warehouseId: string;
  isBodegaInterna: boolean;
  onRegistrar: (payload: IngresoDesdeOrdenCompraPayload) => Promise<void> | void;
  /** Ej. `h-full min-h-0 overflow-y-auto` para igualar altura con otro panel en la misma columna. */
  className?: string;
};

/**
 * Columna «Orden de ingreso»: elegir OC en transporte, checklist por línea, temp manual y kg del pedido.
 */
export function OcOrdenIngresoPanel({ warehouseId, isBodegaInterna, onRegistrar, className }: Props) {
  const [ordenes, setOrdenes] = useState<OrdenCompraPendienteRecepcion[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  /** `${idClienteDueno}::${ordenId}` para evitar colisiones entre cuentas. */
  const [selectedKey, setSelectedKey] = useState<string>("");
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [temps, setTemps] = useState<Record<string, string>>({});
  const [kgs, setKgs] = useState<Record<string, string>>({});
  const [catalogos, setCatalogos] = useState<Catalogo[]>([]);
  const [extraProductId, setExtraProductId] = useState("");
  const [extraTemp, setExtraTemp] = useState("");
  const [extraKg, setExtraKg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const reload = useCallback(() => {
    if (!warehouseId.trim() || !isBodegaInterna) {
      setOrdenes([]);
      return;
    }
    setLoading(true);
    setLoadError(null);
    void OrdenCompraService.listParaRecepcionEnBodegaGlobal(warehouseId.trim())
      .then((list) => {
        setOrdenes(list);
        setSelectedKey((prev) => {
          if (prev && list.some((o) => `${o.idClienteDueno}::${o.id}` === prev)) return prev;
          return "";
        });
      })
      .catch(() => {
        setOrdenes([]);
        setLoadError(
          "No se pudieron cargar las órdenes. Revisá permisos, conexión y que existan documentos en clientes.",
        );
      })
      .finally(() => setLoading(false));
  }, [warehouseId, isBodegaInterna]);

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
      setExtraProductId("");
      setExtraTemp("");
      setExtraKg("");
      return;
    }
    const nextCheck: Record<string, boolean> = {};
    const nextTemp: Record<string, string> = {};
    const nextKg: Record<string, string> = {};
    (selected.lineItems ?? []).forEach((li, idx) => {
      const rowKey = lineRowKey(idx);
      nextCheck[rowKey] = false;
      nextTemp[rowKey] = "";
      nextKg[rowKey] = String(defaultKgPorLinea(li));
    });
    setChecked(nextCheck);
    setTemps(nextTemp);
    setKgs(nextKg);
    setExtraProductId("");
    setExtraTemp("");
    setExtraKg("");
    setSubmitError(null);

    const cid = selected.idClienteDueno?.trim();
    const cc = selected.codeCuenta?.trim() ?? "";
    if (cid) {
      void CatalogoService.getAll(cid, cc).then(setCatalogos);
    } else {
      setCatalogos([]);
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

  const extraOk =
    !extraProductId.trim() ||
    (() => {
      const t = Number(String(extraTemp).replace(",", "."));
      if (Number.isNaN(t)) return false;
      const k = parseDecimalEs(extraKg);
      return k != null && k > 0;
    })();

  const canSubmit = Boolean(selected && checkedLinesValid && extraOk && !submitting);

  const handleRegistrar = async () => {
    if (!selected || !canSubmit) return;
    setSubmitError(null);
    setSubmitting(true);

    const pesosRecibidosPorLinea: Record<string, number> = {};
    const lineas: LineaIngresoDesdeOc[] = [];

    for (let idx = 0; idx < lineItems.length; idx += 1) {
      const li = lineItems[idx];
      const rowKey = lineRowKey(idx);
      const id = li.catalogoProductId;
      if (checked[rowKey]) {
        const temperature = Number(String(temps[rowKey] ?? "").replace(",", "."));
        const quantityKg = parseDecimalEs(String(kgs[rowKey] ?? "")) ?? 0;
        pesosRecibidosPorLinea[rowKey] = quantityKg;
        lineas.push({
          catalogoProductId: id,
          name: li.titleSnapshot?.trim() || "Producto",
          temperature,
          quantityKg,
        });
      } else {
        pesosRecibidosPorLinea[rowKey] = 0;
      }
    }

    let lineaAdicional: LineaAdicionalIngresoOc | null = null;
    if (extraProductId.trim()) {
      const cat = catalogos.find((c) => c.id === extraProductId);
      const temperature = Number(String(extraTemp).replace(",", "."));
      const quantityKg = parseDecimalEs(extraKg) ?? 0;
      lineaAdicional = {
        catalogoProductId: extraProductId.trim(),
        name: (cat?.title ?? "Producto").trim(),
        temperature,
        quantityKg,
      };
    }

    try {
      await onRegistrar({
        orden: selected,
        lineas,
        pesosRecibidosPorLinea,
        lineaAdicional,
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
          El ingreso desde orden de compra aplica solo en <strong>bodegas internas</strong>.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`flex w-full min-w-0 flex-col gap-4 rounded-2xl border border-green-200 bg-white p-4 shadow-lg sm:p-6 lg:p-8${className ? ` ${className}` : ""}`}
    >
      <div className="flex items-start gap-3">
        <span className="shrink-0 rounded-full bg-emerald-600 p-2 text-white">
          <FiArchive className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-slate-900">Orden de ingreso</h2>
          
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[12rem] flex-1">
          <label className="mb-1 block text-xs font-semibold text-slate-600">Orden de compra</label>
          <select
            value={selectedKey}
            onChange={(e) => setSelectedKey(e.target.value)}
            className="w-full rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900"
          >
            <option value="">{loading ? "Cargando…" : "Seleccioná una orden"}</option>
            {ordenes.map((o) => (
              <option key={`${o.idClienteDueno}-${o.id}`} value={`${o.idClienteDueno}::${o.id}`}>
                {o.numero} · {o.codeCuenta} · {o.proveedorNombre}
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
        <p className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-xs text-rose-800">
          {loadError}
        </p>
      ) : null}

      {!selected ? (
        <p className="text-sm text-slate-500">
          {ordenes.length === 0 && !loading
            ? "No hay órdenes en transporte para esta bodega."
            : "Seleccioná una orden para ver el checklist de productos."}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-slate-600">
            <span className="font-semibold">{selected.numero}</span>
            {selected.fechaLlegadaEstipulada ? (
              <>
                {" "}
                · Llegada estipulada: <span className="font-medium">{selected.fechaLlegadaEstipulada}</span>
              </>
            ) : null}
          </p>
          <ul className="max-h-[min(24rem,50vh)] space-y-3 overflow-y-auto pr-1">
            {lineItems.map((li, idx) => {
              const rowKey = lineRowKey(idx);
              const isChecked = Boolean(checked[rowKey]);
              return (
                <li
                  key={rowKey}
                  className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 text-sm"
                >
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) =>
                        setChecked((prev) => ({ ...prev, [rowKey]: e.target.checked }))
                      }
                      className="mt-1 h-4 w-4 shrink-0 rounded border-emerald-300 text-emerald-600"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="font-semibold text-slate-900">{li.titleSnapshot}</span>
                      {li.skuSnapshot ? (
                        <span className="ml-2 text-xs text-slate-500">({li.skuSnapshot})</span>
                      ) : null}
                      <span className="mt-1 block text-xs text-slate-600">
                        {li.pesoKg != null && li.pesoKg > 0 ? (
                          <>
                            Pedido: <span className="font-medium">{formatKgEs(Number(li.pesoKg))} kg</span>
                          </>
                        ) : (
                          <>
                            Pedido: <span className="font-medium">{li.cantidad} u.</span>
                          </>
                        )}
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
                          className="rounded-lg border border-emerald-200 bg-white px-2 py-1.5 text-sm"
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
                          className="rounded-lg border border-emerald-200 bg-white px-2 py-1.5 text-sm"
                        />
                      </label>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>

          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-3">
            <p className="mb-2 text-[11px] font-bold uppercase text-slate-500">
              Producto adicional 
            </p>
          
            <div className="grid gap-2 sm:grid-cols-3">
              <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 sm:col-span-3">
                Producto del catálogo
                <select
                  value={extraProductId}
                  onChange={(e) => setExtraProductId(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
                >
                  <option value="">Sin producto adicional</option>
                  {catalogos
                    .filter((c) => c.id)
                    .map((c) => (
                      <option key={c.id} value={c.id!}>
                        {c.title}
                      </option>
                    ))}
                </select>
              </label>
              {extraProductId ? (
                <>
                  <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                    Temperatura (°C)
                    <input
                      type="number"
                      step="any"
                      value={extraTemp}
                      onChange={(e) => setExtraTemp(e.target.value)}
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
                      placeholder="Ej: -18"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 sm:col-span-2">
                    Peso (kg)
                    <input
                      type="text"
                      inputMode="decimal"
                      value={extraKg}
                      onChange={(e) => setExtraKg(e.target.value)}
                      placeholder="Ej. 10,5"
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
                    />
                  </label>
                </>
              ) : null}
            </div>
          </div>

          {submitError ? (
            <p className="text-sm text-rose-600">{submitError}</p>
          ) : null}

          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => void handleRegistrar()}
            className="mt-auto w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting
              ? "Registrando…"
              : "Registrar ingreso y cerrar orden (comparación pedido vs recibido)"}
          </button>
        </div>
      )}
    </div>
  );
}
