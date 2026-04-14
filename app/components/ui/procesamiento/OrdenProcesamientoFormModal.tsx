"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { HiOutlineXMark } from "react-icons/hi2";
import type { Catalogo } from "@/app/types/catalogo";
import type { Slot, WarehouseMeta } from "@/app/interfaces/bodega";
import { PROCESAMIENTO_ESTADOS } from "@/app/types/solicitudProcesamiento";
import {
  catalogosPrimarios,
  catalogosSecundariosDePrimario,
  unidadVisualizacionDe,
  unidadesSecundarioPorRegla,
} from "@/lib/catalogoProcesamiento";
import { subscribeWarehouseState } from "@/lib/bodegaCloudState";
import { stockPrimarioDesdeSlotsPreferirKgCuandoExisten } from "@/lib/stockPrimarioBodega";

export interface OrdenProcesamientoDraft {
  productoPrimarioId: string;
  productoPrimarioTitulo: string;
  productoSecundarioId: string;
  productoSecundarioTitulo: string;
  cantidadPrimario: number;
  unidadPrimarioVisualizacion: "cantidad" | "peso";
  /** Código de la bodega interna de destino (debe coincidir con `codeCuenta` de la bodega). */
  codeCuenta: string;
  warehouseId?: string;
  estimadoUnidadesSecundario: number | null;
  fecha: string;
  estado: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  productos: Catalogo[];
  /** `clientes/{id}` de la cuenta: debe coincidir con `slot.client` en el mapa. */
  clientIdFirestore: string;
  /** Bodegas internas vinculadas a la cuenta (cada una con `codeCuenta`). */
  bodegasInternas: WarehouseMeta[];
  /** Si no hay bodegas en la lista, se usa este código (p. ej. sesión). */
  fallbackCodeCuenta: string;
  onCreate: (draft: OrdenProcesamientoDraft) => void | Promise<void>;
}

function etiquetaProducto(p: Catalogo): string {
  const t = String(p.title ?? "").trim() || "Sin título";
  const code = String(p.code ?? "").trim();
  return code ? `${t} · ${code}` : t;
}

function etiquetaBodega(w: WarehouseMeta): string {
  const name = String(w.name ?? "").trim();
  const code = String(w.codeCuenta ?? "").trim();
  if (name && code) return `${name} · ${code}`;
  if (name) return name;
  if (code) return code;
  return w.id;
}

export function OrdenProcesamientoFormModal({
  isOpen,
  onClose,
  productos,
  clientIdFirestore,
  bodegasInternas,
  fallbackCodeCuenta,
  onCreate,
}: Props) {
  const [fecha, setFecha] = useState("");
  const [primarioId, setPrimarioId] = useState("");
  const [secundarioId, setSecundarioId] = useState("");
  const [bodegaWarehouseId, setBodegaWarehouseId] = useState("");
  const [slotsBodega, setSlotsBodega] = useState<Slot[]>([]);
  const [mapaBodegaLoading, setMapaBodegaLoading] = useState(false);
  const [cantidadElegida, setCantidadElegida] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const bodegasConCodigo = useMemo(
    () =>
      bodegasInternas.filter(
        (w) => String(w.codeCuenta ?? "").trim() && String(w.id ?? "").trim(),
      ),
    [bodegasInternas],
  );

  const primarios = useMemo(() => catalogosPrimarios(productos), [productos]);
  const primariosOrdenados = useMemo(
    () => [...primarios].sort((a, b) => (a.title || "").localeCompare(b.title || "", "es", { sensitivity: "base" })),
    [primarios],
  );

  const secundariosDelPrimario = useMemo(
    () => catalogosSecundariosDePrimario(productos, primarioId),
    [productos, primarioId],
  );
  const secundariosOrdenados = useMemo(
    () =>
      [...secundariosDelPrimario].sort((a, b) =>
        (a.title || "").localeCompare(b.title || "", "es", { sensitivity: "base" }),
      ),
    [secundariosDelPrimario],
  );

  useEffect(() => {
    if (!isOpen) return;
    setFecha(new Date().toISOString().slice(0, 10));
    setPrimarioId("");
    setSecundarioId("");
    setBodegaWarehouseId("");
    setCantidadElegida(1);
    setError(null);
    setSaving(false);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || primariosOrdenados.length === 0) return;
    setPrimarioId((cur) => (cur && primariosOrdenados.some((p) => p.id === cur) ? cur : primariosOrdenados[0]?.id ?? ""));
  }, [isOpen, primariosOrdenados]);

  useEffect(() => {
    if (!isOpen) return;
    setSecundarioId((cur) => {
      const valid = cur && secundariosOrdenados.some((p) => p.id === cur);
      if (valid) return cur;
      return secundariosOrdenados[0]?.id ?? "";
    });
  }, [isOpen, secundariosOrdenados]);

  useEffect(() => {
    if (!isOpen) return;
    if (bodegasConCodigo.length === 0) {
      setBodegaWarehouseId("");
      return;
    }
    setBodegaWarehouseId((cur) => {
      if (cur && bodegasConCodigo.some((w) => w.id === cur)) return cur;
      return bodegasConCodigo[0]?.id ?? "";
    });
  }, [isOpen, bodegasConCodigo]);

  const warehouseFirestoreId = bodegaWarehouseId.trim();

  useEffect(() => {
    if (!isOpen) {
      setSlotsBodega([]);
      setMapaBodegaLoading(false);
      return;
    }
    if (!warehouseFirestoreId) {
      setSlotsBodega([]);
      setMapaBodegaLoading(false);
      return;
    }
    setMapaBodegaLoading(true);
    const unsub = subscribeWarehouseState(warehouseFirestoreId, (state) => {
      setSlotsBodega(Array.isArray(state.slots) ? state.slots : []);
      setMapaBodegaLoading(false);
    });
    return () => {
      unsub();
    };
  }, [isOpen, warehouseFirestoreId]);

  const primario = useMemo(() => primarios.find((p) => p.id === primarioId), [primarios, primarioId]);
  const secundario = useMemo(
    () => secundariosDelPrimario.find((p) => p.id === secundarioId),
    [secundariosDelPrimario, secundarioId],
  );

  const stockDesdeMapa = useMemo(() => {
    if (!primario?.id || !clientIdFirestore.trim()) {
      return { total: 0, cajasCoincidentes: 0, unidadUsada: "cantidad" as const };
    }
    return stockPrimarioDesdeSlotsPreferirKgCuandoExisten(slotsBodega, clientIdFirestore, primario);
  }, [slotsBodega, clientIdFirestore, primario]);

  const stockPrim = stockDesdeMapa.total;
  const unidadPrim = primario ? stockDesdeMapa.unidadUsada : "cantidad";

  const maxCantidad = useMemo(() => {
    if (!Number.isFinite(stockPrim) || stockPrim <= 0) return 0;
    if (unidadPrim === "cantidad") {
      const m = Math.floor(stockPrim);
      return m > 0 ? m : 0;
    }
    return stockPrim;
  }, [stockPrim, unidadPrim]);

  useEffect(() => {
    if (!isOpen || !primario?.id) return;
    setCantidadElegida((prev) => {
      if (maxCantidad <= 0) return unidadPrim === "cantidad" ? 1 : 0;
      const clamped =
        unidadPrim === "cantidad"
          ? Math.min(Math.max(1, Math.floor(prev)), maxCantidad)
          : Math.min(Math.max(0.0001, prev), maxCantidad);
      return clamped;
    });
  }, [isOpen, primario?.id, maxCantidad, unidadPrim, secundarioId]);

  const reglaA = secundario?.conversionCantidadPrimario;
  const reglaB = secundario?.conversionUnidadesSecundario;
  const estimado = useMemo(() => {
    if (!secundario) return null;
    return unidadesSecundarioPorRegla(cantidadElegida, reglaA, reglaB);
  }, [cantidadElegida, reglaA, reglaB, secundario]);

  const codeCuentaDestino = useMemo(() => {
    const w = bodegasConCodigo.find((x) => x.id === bodegaWarehouseId);
    if (w?.codeCuenta?.trim()) return w.codeCuenta.trim();
    return String(fallbackCodeCuenta ?? "").trim();
  }, [bodegasConCodigo, bodegaWarehouseId, fallbackCodeCuenta]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      if (!primario?.id) {
        setError("No hay productos primarios en el catálogo. Creá productos que no sean de tipo «Secundario».");
        return;
      }
      if (!secundario?.id) {
        setError(
          "No hay producto secundario vinculado a este primario. En Catálogo usá «Crear secundario» y elegí este producto en «Incluido primario».",
        );
        return;
      }
      if (!codeCuentaDestino) {
        setError("Falta el código de bodega interna. Asigná bodegas internas a la cuenta o el codeCuenta en sesión.");
        return;
      }
      if (maxCantidad <= 0) {
        setError(
          !warehouseFirestoreId
            ? "Elegí una bodega interna asignada a la cuenta para leer el mapa y validar stock."
            : "No hay stock de este primario en el mapa de bodega para tu cuenta (o las cajas no tienen kg/piezas). Revisá que el nombre en mapa coincida con el título del catálogo.",
        );
        return;
      }
      const a = Number(secundario.conversionCantidadPrimario);
      const b = Number(secundario.conversionUnidadesSecundario);
      if (!Number.isFinite(a) || a <= 0 || !Number.isFinite(b) || b <= 0) {
        setError("El secundario debe tener regla de conversión (cantidad primario y unidades secundario) en catálogo.");
        return;
      }
      const q = cantidadElegida;
      if (!Number.isFinite(q) || q <= 0) {
        setError("Elegí una cantidad válida en primario.");
        return;
      }
      if (q > maxCantidad + 1e-9) {
        setError("La cantidad supera el stock disponible en bodega para este primario.");
        return;
      }
      if (unidadPrim === "cantidad" && (!Number.isInteger(q) || q < 1)) {
        setError("Con unidad «Cantidad» usá solo números enteros.");
        return;
      }
      const est = unidadesSecundarioPorRegla(q, a, b);
      if (est === null) {
        setError("No se pudo calcular el estimado del secundario. Revisá la regla de conversión.");
        return;
      }
      setSaving(true);
      try {
        await Promise.resolve(
          onCreate({
            productoPrimarioId: primario.id,
            productoPrimarioTitulo: (primario.title || "").trim() || "Sin título",
            productoSecundarioId: secundario.id,
            productoSecundarioTitulo: (secundario.title || "").trim() || "Sin título",
            cantidadPrimario: unidadPrim === "cantidad" ? Math.round(q) : q,
            unidadPrimarioVisualizacion: unidadPrim,
            codeCuenta: codeCuentaDestino,
            warehouseId: warehouseFirestoreId || undefined,
            estimadoUnidadesSecundario: est,
            fecha,
            estado: PROCESAMIENTO_ESTADOS[0],
          }),
        );
        onClose();
      } catch {
        setError("No se pudo guardar la solicitud. Reintentá.");
      } finally {
        setSaving(false);
      }
    },
    [
      warehouseFirestoreId,
      bodegasConCodigo,
      cantidadElegida,
      codeCuentaDestino,
      fecha,
      maxCantidad,
      onClose,
      onCreate,
      primario,
      secundario,
      unidadPrim,
    ],
  );

  const puedeConfirmar =
    Boolean(primario?.id && secundario?.id && codeCuentaDestino) &&
    Boolean(warehouseFirestoreId) &&
    !mapaBodegaLoading &&
    maxCantidad > 0 &&
    Number.isFinite(cantidadElegida) &&
    cantidadElegida > 0 &&
    cantidadElegida <= maxCantidad + 1e-9 &&
    Number(secundario?.conversionCantidadPrimario) > 0 &&
    Number(secundario?.conversionUnidadesSecundario) > 0;

  const stepSlider = unidadPrim === "cantidad" ? 1 : Math.min(0.01, maxCantidad / 100 || 0.01);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/20 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="orden-procesamiento-modal-title"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[12px] border border-gray-100 bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="orden-procesamiento-modal-title" className="text-lg font-semibold text-gray-900">
            Nueva orden de procesamiento
          </h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Cerrar">
            <HiOutlineXMark size={24} />
          </button>
        </div>

        <p className="mb-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
          Elegí la <strong>bodega interna</strong> (se lee el mapa en vivo), el par primario/secundario del catálogo y
          la <strong>cantidad en primario</strong> hasta el <strong>stock en bodega</strong> (no usa inventario del
          catálogo). El estimado del secundario sale de la <strong>regla de conversión</strong> del catálogo.
        </p>

        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500">Fecha</label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              required
            />
          </div>

          {bodegasConCodigo.length > 0 ? (
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500">
                Bodega interna de destino
              </label>
              <select
                value={bodegaWarehouseId}
                onChange={(e) => setBodegaWarehouseId(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                {bodegasConCodigo.map((w) => (
                  <option key={w.id} value={w.id}>
                    {etiquetaBodega(w)}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <p className="rounded-lg border border-amber-100 bg-amber-50/80 px-3 py-2 text-xs text-amber-900">
              No hay bodegas internas en la lista de la cuenta. Se usará el código de sesión{" "}
              <span className="font-mono font-semibold">{fallbackCodeCuenta || "—"}</span> como destino (asigná
              bodegas en «Asignar bodegas» si hace falta).
            </p>
          )}

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500">
              Producto primario (insumo)
            </label>
            {primariosOrdenados.length === 0 ? (
              <p className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                No hay productos primarios. El catálogo solo puede listar aquí ítems cuyo tipo no sea «Secundario».
              </p>
            ) : (
              <select
                value={primarioId}
                onChange={(e) => setPrimarioId(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                {primariosOrdenados.map((p) => (
                  <option key={p.id} value={p.id}>
                    {etiquetaProducto(p)}
                  </option>
                ))}
              </select>
            )}
            {primario ? (
              <p className="mt-1 text-xs text-gray-500">
                Unidad de visualización del catálogo:{" "}
                <span className="font-semibold text-gray-800">
                  {unidadVisualizacionDe(primario) === "peso" ? "Peso (kg en mapa)" : "Cantidad (piezas o cajas)"}
                </span>
                {mapaBodegaLoading ? (
                  <> · Leyendo mapa de bodega…</>
                ) : warehouseFirestoreId ? (
                  <>
                    {" "}
                    · Stock en bodega:{" "}
                    <span className="font-semibold tabular-nums">
                      {unidadPrim === "peso"
                        ? `${stockPrim.toLocaleString("es-CO", { maximumFractionDigits: 4 })} kg`
                        : `${stockPrim} ud.`}
                    </span>
                    {stockDesdeMapa.cajasCoincidentes > 0 ? (
                      <span className="text-gray-400">
                        {" "}
                        ({stockDesdeMapa.cajasCoincidentes}{" "}
                        {stockDesdeMapa.cajasCoincidentes === 1 ? "caja" : "cajas"} en mapa)
                      </span>
                    ) : null}
                  </>
                ) : (
                  <> · Elegí bodega interna para ver stock del mapa</>
                )}
              </p>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500">
              Producto secundario (resultado esperado)
            </label>
            {secundariosOrdenados.length === 0 ? (
              <p className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                No hay secundarios vinculados a este primario. En <strong>Catálogo → Crear secundario</strong> elegí
                este producto en «Incluido primario» y la regla de conversión.
              </p>
            ) : (
              <select
                value={secundarioId}
                onChange={(e) => setSecundarioId(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                {secundariosOrdenados.map((p) => (
                  <option key={p.id} value={p.id}>
                    {etiquetaProducto(p)}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="rounded-xl border border-sky-100 bg-sky-50/80 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-wide text-sky-900">
              Cantidad en primario a transformar
              {unidadPrim === "peso" ? " (kg en bodega / alinear regla en kg)" : " (unidades en bodega)"}
            </p>
            {!warehouseFirestoreId ? (
              <p className="mt-2 text-sm text-amber-900">
                Asigná al menos una bodega interna a la cuenta (con código) para leer el mapa y calcular el tope desde
                bodega.
              </p>
            ) : mapaBodegaLoading ? (
              <p className="mt-2 text-sm text-slate-600">Cargando posiciones del mapa…</p>
            ) : maxCantidad <= 0 ? (
              <p className="mt-2 text-sm text-amber-900">
                No hay stock de este primario en el mapa para tu cuenta, o las cajas no tienen kg/piezas. Verificá que
                el <strong>nombre en el mapa</strong> coincida con el <strong>título del catálogo</strong> y que las
                cajas estén asociadas a tu cuenta.
              </p>
            ) : (
              <>
                <div className="mt-3 flex items-center gap-3">
                  <input
                    type="range"
                    min={unidadPrim === "cantidad" ? 1 : 0.0001}
                    max={maxCantidad}
                    step={stepSlider}
                    value={Math.min(cantidadElegida, maxCantidad)}
                    onChange={(e) => setCantidadElegida(Number(e.target.value))}
                    className="min-w-0 flex-1 accent-sky-600"
                  />
                  <span className="w-24 shrink-0 text-right text-lg font-extrabold tabular-nums text-slate-900">
                    {unidadPrim === "cantidad"
                      ? String(Math.round(cantidadElegida))
                      : cantidadElegida.toLocaleString("es-CO", { maximumFractionDigits: 4 })}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-600">
                  Máximo según stock en bodega:{" "}
                  <span className="font-semibold tabular-nums">
                    {unidadPrim === "peso"
                      ? `${maxCantidad.toLocaleString("es-CO", { maximumFractionDigits: 4 })} kg`
                      : maxCantidad}
                  </span>
                </p>
              </>
            )}
          </div>

          <div className="rounded-xl border border-violet-100 bg-violet-50/70 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-wide text-violet-900">Estimado de unidades (secundario)</p>
            {estimado !== null && estimado !== undefined && Number.isFinite(estimado) ? (
              <p className="mt-2 text-2xl font-extrabold tabular-nums text-slate-900">
                {estimado.toLocaleString("es-CO", { maximumFractionDigits: 4 })}
              </p>
            ) : (
              <p className="mt-2 text-sm text-amber-900">
                Definí la regla de conversión en el secundario del catálogo (regla de tres).
              </p>
            )}
            {secundario && Number(reglaA) > 0 && Number(reglaB) > 0 ? (
              <p className="mt-1 text-[11px] text-slate-600">
                Regla: {reglaA} (primario) → {reglaB} (secundario)
              </p>
            ) : null}
          </div>

          <p className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 text-xs text-slate-600">
            El estado inicial será <strong>Iniciado</strong>. Podés cambiarlo a <strong>En curso</strong> o{" "}
            <strong>Terminado</strong> desde la lista después de confirmar.
          </p>

          {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || primariosOrdenados.length === 0 || secundariosOrdenados.length === 0 || !puedeConfirmar}
              className="flex-1 rounded-lg bg-sky-600 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 disabled:opacity-60"
            >
              {saving ? "Guardando…" : "Confirmar y enviar a bodega"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
