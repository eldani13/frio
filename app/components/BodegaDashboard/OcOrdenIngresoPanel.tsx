"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FiArchive } from "react-icons/fi";
import {
  OrdenCompraService,
  type OrdenCompraPendienteRecepcion,
} from "@/app/services/ordenCompraService";
import type { OrdenCompraLineItem } from "@/app/types/ordenCompra";
import { formatKgEs, parseDecimalEs } from "@/app/lib/decimalEs";

export type LineaIngresoDesdeOc = {
  catalogoProductId: string;
  name: string;
  temperature: number;
  quantityKg: number;
};

export type IngresoDesdeOrdenCompraPayload = {
  orden: OrdenCompraPendienteRecepcion;
  lineas: LineaIngresoDesdeOc[];
};

function defaultKgPorLinea(li: OrdenCompraLineItem): number {
  const pk = li.pesoKg;
  if (pk != null && Number.isFinite(Number(pk)) && Number(pk) > 0) return Number(pk);
  const c = Number(li.cantidad);
  return Number.isFinite(c) && c > 0 ? c : 0;
}

type Props = {
  warehouseId: string;
  isBodegaInterna: boolean;
  onRegistrar: (payload: IngresoDesdeOrdenCompraPayload) => Promise<void> | void;
};

/**
 * Columna «Orden de ingreso»: elegir OC en transporte, checklist por línea, temp manual y kg del pedido.
 */
export function OcOrdenIngresoPanel({ warehouseId, isBodegaInterna, onRegistrar }: Props) {
  const [ordenes, setOrdenes] = useState<OrdenCompraPendienteRecepcion[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  /** `${idClienteDueno}::${ordenId}` para evitar colisiones entre cuentas. */
  const [selectedKey, setSelectedKey] = useState<string>("");
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [temps, setTemps] = useState<Record<string, string>>({});
  const [kgs, setKgs] = useState<Record<string, string>>({});
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
      return;
    }
    const nextCheck: Record<string, boolean> = {};
    const nextTemp: Record<string, string> = {};
    const nextKg: Record<string, string> = {};
    (selected.lineItems ?? []).forEach((li) => {
      const id = li.catalogoProductId;
      nextCheck[id] = false;
      nextTemp[id] = "";
      nextKg[id] = String(defaultKgPorLinea(li));
    });
    setChecked(nextCheck);
    setTemps(nextTemp);
    setKgs(nextKg);
    setSubmitError(null);
  }, [selected]);

  const lineItems = selected?.lineItems ?? [];
  const allChecked = lineItems.length > 0 && lineItems.every((li) => checked[li.catalogoProductId]);
  const tempsOk = lineItems.every((li) => {
    if (!checked[li.catalogoProductId]) return true;
    const t = Number(String(temps[li.catalogoProductId] ?? "").replace(",", "."));
    return !Number.isNaN(t);
  });
  const kgsOk = lineItems.every((li) => {
    if (!checked[li.catalogoProductId]) return true;
    const k = parseDecimalEs(String(kgs[li.catalogoProductId] ?? ""));
    return k != null && k > 0;
  });
  const canSubmit = Boolean(selected && allChecked && tempsOk && kgsOk && !submitting);

  const handleRegistrar = async () => {
    if (!selected || !canSubmit) return;
    setSubmitError(null);
    setSubmitting(true);
    const lineas: LineaIngresoDesdeOc[] = lineItems.map((li) => {
      const id = li.catalogoProductId;
      const temperature = Number(String(temps[id] ?? "").replace(",", "."));
      const quantityKg = parseDecimalEs(String(kgs[id] ?? "")) ?? 0;
      return {
        catalogoProductId: id,
        name: li.titleSnapshot?.trim() || "Producto",
        temperature,
        quantityKg,
      };
    });
    try {
      await onRegistrar({ orden: selected, lineas });
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
      <div className="flex h-full min-h-0 flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50/90 p-4 sm:p-6">
        <p className="text-sm font-medium text-amber-950">
          El ingreso desde orden de compra aplica solo en <strong>bodegas internas</strong>.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 rounded-2xl border border-green-200 bg-white p-4 shadow-lg sm:p-6 lg:p-8">
      <div className="flex items-start gap-3">
        <span className="shrink-0 rounded-full bg-emerald-600 p-2 text-white">
          <FiArchive className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-slate-900">Orden de ingreso</h2>
          <p className="text-xs text-slate-500">
            Elegí una orden en <strong>transporte</strong> para esta bodega. Verificá cada producto, cargá la
            temperatura y confirmá; las cajas pasan a <strong>Zona de ingreso</strong> y la OC a{" "}
            <strong>En curso</strong>.
          </p>
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
        <div className="flex min-h-0 flex-1 flex-col gap-3">
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
            {lineItems.map((li) => {
              const id = li.catalogoProductId;
              const isChecked = Boolean(checked[id]);
              return (
                <li
                  key={id}
                  className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 text-sm"
                >
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) =>
                        setChecked((prev) => ({ ...prev, [id]: e.target.checked }))
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
                          value={temps[id] ?? ""}
                          onChange={(e) =>
                            setTemps((prev) => ({ ...prev, [id]: e.target.value }))
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
                          value={kgs[id] ?? ""}
                          onChange={(e) => setKgs((prev) => ({ ...prev, [id]: e.target.value }))}
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

          {submitError ? (
            <p className="text-sm text-rose-600">{submitError}</p>
          ) : null}

          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => void handleRegistrar()}
            className="mt-auto w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting ? "Registrando…" : "Registrar ingreso (zona de ingreso + OC en curso)"}
          </button>
        </div>
      )}
    </div>
  );
}
