"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { HiArrowRight } from "react-icons/hi2";
import {
  FORMULARIO_CREACION_BODY,
  FORMULARIO_CREACION_INPUT,
  FORMULARIO_CREACION_LABEL,
  FORMULARIO_CREACION_SELECT,
  FormularioPlantilla,
  FormularioPlantillaAcciones,
} from "@/app/components/ui/FormularioPlantilla";
import type { Catalogo } from "@/app/types/catalogo";
import type { Slot, WarehouseMeta } from "@/app/interfaces/bodega";
import { PROCESAMIENTO_ESTADOS } from "@/app/types/solicitudProcesamiento";
import {
  catalogosPrimarios,
  catalogosSecundariosDePrimario,
  estimadoSecundarioAplicarPerdidaPct,
  mermaPctDesdeCatalogoSecundario,
  reglaConversionDesdeCatalogoSecundario,
  unidadesSecundarioPorRegla,
} from "@/lib/catalogoProcesamiento";
import { etiquetaUnidadVisualizacion } from "@/lib/unidadVisualizacionCatalogo";
import { formatoPrecioCatalogo } from "@/lib/catalogoPrecio";
import { subscribeWarehouseState } from "@/lib/bodegaCloudState";
import { stockPrimarioDesdeSlotsPreferirKgCuandoExisten } from "@/lib/stockPrimarioBodega";
import { swalConfirm } from "@/lib/swal";

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
  /** Regla de tres definida al crear la solicitud (misma unidad de visualización del primario). */
  reglaConversionCantidadPrimario: number;
  reglaConversionUnidadesSecundario: number;
  /** % de merma (0–100): copiado del catálogo del secundario al crear la solicitud. */
  perdidaProcesamientoPct: number;
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

/** Lado primario de la relación fijado a 1 (1 kg o 1 ud., según el mapa). */
const RELACION_PRIMARIO_BASE = 1;

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
  /** Unidades de secundario que salen de 1 unidad de insumo del primario (1 kg si el mapa usa peso, 1 ud. si usa cantidad). */
  const [unidadesSecundarioPorUnoPrimarioInput, setUnidadesSecundarioPorUnoPrimarioInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const bodegasConCodigo = useMemo(
    () =>
      bodegasInternas.filter(
        (w) => String(w.codeCuenta ?? "").trim() && String(w.id ?? "").trim(),
      ),
    [bodegasInternas],
  );

  const warehouseFirestoreId = bodegaWarehouseId.trim();

  const primariosCatalogo = useMemo(() => catalogosPrimarios(productos), [productos]);

  /** Primarios con stock mayor que 0 en el mapa de la bodega elegida y con al menos un secundario en catálogo. */
  const primariosElegibles = useMemo(() => {
    const cid = clientIdFirestore.trim();
    const wid = warehouseFirestoreId.trim();
    if (!cid || !wid || mapaBodegaLoading) return [];
    return primariosCatalogo.filter((p) => {
      if (!p.id?.trim()) return false;
      if (catalogosSecundariosDePrimario(productos, p.id).length === 0) return false;
      const { total } = stockPrimarioDesdeSlotsPreferirKgCuandoExisten(slotsBodega, cid, p);
      return Number.isFinite(total) && total > 0;
    });
  }, [
    primariosCatalogo,
    productos,
    clientIdFirestore,
    warehouseFirestoreId,
    slotsBodega,
    mapaBodegaLoading,
  ]);

  const primariosOrdenados = useMemo(
    () =>
      [...primariosElegibles].sort((a, b) =>
        (a.title || "").localeCompare(b.title || "", "es", { sensitivity: "base" }),
      ),
    [primariosElegibles],
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
    setUnidadesSecundarioPorUnoPrimarioInput("");
    setError(null);
    setSaving(false);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (primariosOrdenados.length === 0) {
      setPrimarioId("");
      return;
    }
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

  /** Si el secundario tiene regla en catálogo, precargar relación (se puede editar). La merma sale solo del catálogo. */
  useEffect(() => {
    if (!isOpen) return;
    const s = secundariosOrdenados.find((p) => p.id === secundarioId);
    if (!s?.id) {
      setUnidadesSecundarioPorUnoPrimarioInput("");
      return;
    }
    const regla = reglaConversionDesdeCatalogoSecundario(s);
    if (regla) {
      const perOne = (regla.unidadesSecundario / regla.cantidadPrimario) * RELACION_PRIMARIO_BASE;
      setUnidadesSecundarioPorUnoPrimarioInput(String(perOne));
    } else {
      setUnidadesSecundarioPorUnoPrimarioInput("");
    }
  }, [isOpen, secundarioId, secundariosOrdenados]);

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

  const primario = useMemo(
    () => primariosOrdenados.find((p) => p.id === primarioId),
    [primariosOrdenados, primarioId],
  );
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
    return Math.max(0, Math.floor(stockPrim));
  }, [stockPrim, unidadPrim]);

  useEffect(() => {
    if (!isOpen || !primario?.id) return;
    setCantidadElegida((prev) => {
      if (maxCantidad <= 0) return unidadPrim === "cantidad" ? 1 : 0;
      if (unidadPrim === "cantidad") {
        return Math.min(Math.max(1, Math.floor(prev)), maxCantidad);
      }
      const clamped = Math.min(Math.max(1, Math.round(prev)), maxCantidad);
      return clamped;
    });
  }, [isOpen, primario?.id, maxCantidad, unidadPrim, secundarioId]);

  const unidadesSecundarioPorUnoPrimarioNum = useMemo(() => {
    const n = Number(String(unidadesSecundarioPorUnoPrimarioInput).replace(",", "."));
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [unidadesSecundarioPorUnoPrimarioInput]);

  const estimadoTeorico = useMemo(() => {
    if (!secundario) return null;
    return unidadesSecundarioPorRegla(
      cantidadElegida,
      RELACION_PRIMARIO_BASE,
      unidadesSecundarioPorUnoPrimarioNum ?? undefined,
    );
  }, [cantidadElegida, unidadesSecundarioPorUnoPrimarioNum, secundario]);

  const perdidaPctDelCatalogo = useMemo(() => {
    if (!secundario) return 0;
    const mp = mermaPctDesdeCatalogoSecundario(secundario);
    return mp !== null ? mp : 0;
  }, [secundario]);

  const estimado = useMemo(() => {
    return estimadoSecundarioAplicarPerdidaPct(estimadoTeorico, perdidaPctDelCatalogo);
  }, [estimadoTeorico, perdidaPctDelCatalogo]);

  /** Unidades enteras, sobrante en kg (fracción de u. → primario) y merma en u./kg para el bloque Estimado. */
  const desgloseEstimado = useMemo(() => {
    if (estimado === null || estimado === undefined || !Number.isFinite(estimado) || estimado < 0) return null;
    const uInt = Math.max(0, Math.floor(estimado + 1e-9));
    const frac = Math.max(0, estimado - uInt);
    const kgPorU = estimado > 1e-12 ? cantidadElegida / estimado : 0;
    const sobranteKg = frac * kgPorU;

    let mermaUnidades: number | null = null;
    let mermaKg: number | null = null;
    if (
      estimadoTeorico !== null &&
      estimadoTeorico !== undefined &&
      Number.isFinite(estimadoTeorico) &&
      estimadoTeorico >= 0
    ) {
      mermaUnidades = Math.max(0, estimadoTeorico - estimado);
      if (estimadoTeorico > 1e-12) {
        mermaKg = mermaUnidades * (cantidadElegida / estimadoTeorico);
      } else {
        mermaKg = 0;
      }
    }

    return { uInt, sobranteKg, mermaUnidades, mermaKg };
  }, [estimado, estimadoTeorico, cantidadElegida]);

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
        setError(
          "No hay primarios elegibles: necesitás stock en el mapa de esta bodega para tu cuenta y al menos un producto secundario vinculado en catálogo.",
        );
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
            ? "No hay bodega interna vinculada a la cuenta para leer el mapa y validar stock (asigná una en «Asignar bodegas»)."
            : "No hay stock de este primario en el almacenamiento para tu cuenta (o las cajas no tienen kg/piezas). Revisá que el nombre en almacenamiento coincida con el título del catálogo.",
        );
        return;
      }
      const a = RELACION_PRIMARIO_BASE;
      const b = unidadesSecundarioPorUnoPrimarioNum;
      if (b === null) {
        setError(
          unidadPrim === "peso"
            ? "Indicá cuántas unidades de secundario obtenés con 1 kg de primario."
            : "Indicá cuántas unidades de secundario obtenés con 1 unidad de primario.",
        );
        return;
      }
      const q =
        unidadPrim === "cantidad"
          ? Math.round(cantidadElegida)
          : Math.round(cantidadElegida);
      if (!Number.isFinite(q) || q <= 0) {
        setError("Elegí una cantidad válida en primario.");
        return;
      }
      if (q > maxCantidad) {
        setError("La cantidad supera el stock disponible en bodega para este primario.");
        return;
      }
      if (unidadPrim === "cantidad" && (!Number.isInteger(q) || q < 1)) {
        setError("Con unidad «Cantidad» usá solo números enteros.");
        return;
      }
      const estTeo = unidadesSecundarioPorRegla(q, a, b);
      if (estTeo === null) {
        setError("No se pudo calcular el estimado del secundario. Revisá la regla de conversión.");
        return;
      }
      const pct = mermaPctDesdeCatalogoSecundario(secundario) ?? 0;
      const est = estimadoSecundarioAplicarPerdidaPct(estTeo, pct);
      if (est === null) {
        setError("No se pudo aplicar la pérdida al estimado. Revisá los valores.");
        return;
      }
      const ok = await swalConfirm(
        "¿Confirmar y enviar a bodega?",
        "Se creará la orden de procesamiento con el primario, secundario y cantidades indicadas.",
      );
      if (!ok) return;
      setSaving(true);
      try {
        await Promise.resolve(
          onCreate({
            productoPrimarioId: primario.id,
            productoPrimarioTitulo: (primario.title || "").trim() || "Sin título",
            productoSecundarioId: secundario.id,
            productoSecundarioTitulo: (secundario.title || "").trim() || "Sin título",
            cantidadPrimario: q,
            unidadPrimarioVisualizacion: unidadPrim,
            codeCuenta: codeCuentaDestino,
            warehouseId: warehouseFirestoreId || undefined,
            estimadoUnidadesSecundario: est,
            reglaConversionCantidadPrimario: a,
            reglaConversionUnidadesSecundario: b,
            perdidaProcesamientoPct: pct,
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
      unidadesSecundarioPorUnoPrimarioNum,
    ],
  );

  const puedeConfirmar =
    Boolean(primario?.id && secundario?.id && codeCuentaDestino) &&
    Boolean(warehouseFirestoreId) &&
    !mapaBodegaLoading &&
    maxCantidad > 0 &&
    Number.isFinite(cantidadElegida) &&
    cantidadElegida > 0 &&
    Math.round(cantidadElegida) <= maxCantidad &&
    unidadesSecundarioPorUnoPrimarioNum !== null;

  return (
    <FormularioPlantilla
      isOpen={isOpen}
      onClose={onClose}
      titulo="Nueva orden de procesamiento"
      subtitulo="Insumo → resultado"
      titleId="orden-procesamiento-modal-title"
      maxWidthClass="max-w-lg"
      zIndexClass="z-[60]"
      footer={
        <FormularioPlantillaAcciones
          formId="orden-procesamiento-form"
          onCancel={onClose}
          submitLabel="Confirmar y enviar a bodega"
          loading={saving}
          submitDisabled={
            primariosOrdenados.length === 0 || secundariosOrdenados.length === 0 || !puedeConfirmar
          }
        />
      }
    >
      <form
        id="orden-procesamiento-form"
        onSubmit={(e) => void handleSubmit(e)}
        className={`${FORMULARIO_CREACION_BODY} flex flex-col gap-5`}
      >
          <div>
            <label className={FORMULARIO_CREACION_LABEL}>Fecha</label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className={FORMULARIO_CREACION_INPUT}
              required
            />
          </div>

          {bodegasConCodigo.length > 0 ? (
            <p className="text-xs text-gray-500">
              Mapa:{" "}
              <span className="font-medium text-gray-800">
                {String(bodegasConCodigo.find((w) => w.id === bodegaWarehouseId)?.name ?? "").trim() ||
                  bodegasConCodigo.find((w) => w.id === bodegaWarehouseId)?.codeCuenta ||
                  "—"}
              </span>
            </p>
          ) : (
            <p className="rounded-lg border border-amber-100 bg-amber-50/80 px-3 py-2 text-xs text-amber-900">
              Sin bodega.{" "}
              <span className="font-mono font-semibold">{fallbackCodeCuenta || "—"}</span>
            </p>
          )}

          <div>
            <label className={FORMULARIO_CREACION_LABEL}>
              Insumo
            </label>
            {primariosCatalogo.length === 0 ? (
              <p className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                Sin primarios cat.
              </p>
            ) : !clientIdFirestore.trim() ? (
              <p className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                Sin cliente sesión.
              </p>
            ) : !warehouseFirestoreId ? (
              <p className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                Sin bodega interna.
              </p>
            ) : mapaBodegaLoading ? (
              <p className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                Consultando…
              </p>
            ) : primariosOrdenados.length === 0 ? (
              <p className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                Sin primario válido.
              </p>
            ) : (
              <select
                value={primarioId}
                onChange={(e) => setPrimarioId(e.target.value)}
                className={FORMULARIO_CREACION_SELECT}
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
                {mapaBodegaLoading ? (
                  "Leyendo…"
                ) : warehouseFirestoreId ? (
                  <>
                    Stock:{" "}
                    <span className="font-medium tabular-nums text-gray-800">
                      {unidadPrim === "peso"
                        ? `${Math.floor(stockPrim).toLocaleString("es-CO")} kg`
                        : `${stockPrim} ud.`}
                    </span>
                    {stockDesdeMapa.cajasCoincidentes > 0 ? (
                      <span className="text-gray-400">
                        {" "}
                        · {stockDesdeMapa.cajasCoincidentes}{" "}
                        {stockDesdeMapa.cajasCoincidentes === 1 ? "caja" : "cajas"}
                      </span>
                    ) : null}
                  </>
                ) : (
                  "Sin bodega lectura."
                )}
              </p>
            ) : null}
          </div>

          <div>
            <label className={FORMULARIO_CREACION_LABEL}>
              Resultado
            </label>
            {!primarioId ? (
              <p className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                Elegí primario.
              </p>
            ) : secundariosOrdenados.length === 0 ? (
              <p className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                Sin secundarios.
              </p>
            ) : (
              <select
                value={secundarioId}
                onChange={(e) => setSecundarioId(e.target.value)}
                className={FORMULARIO_CREACION_SELECT}
              >
                {secundariosOrdenados.map((p) => (
                  <option key={p.id} value={p.id}>
                    {etiquetaProducto(p)}
                  </option>
                ))}
              </select>
            )}
            {secundario ? (
              <p className="mt-2 text-xs text-gray-600">
                Precio:{" "}
                <span className="font-semibold tabular-nums text-gray-900">
                  {formatoPrecioCatalogo(secundario)}
                </span>
              </p>
            ) : null}
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50/50 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-600">Conversión</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold tabular-nums text-gray-900">
                {unidadPrim === "peso" ? "1 kg" : "1 ud."} →
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={unidadesSecundarioPorUnoPrimarioInput}
                onChange={(e) => setUnidadesSecundarioPorUnoPrimarioInput(e.target.value)}
                placeholder={unidadPrim === "peso" ? "0" : "0"}
                className="min-w-[5rem] flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold tabular-nums"
                required
                aria-label={
                  unidadPrim === "peso"
                    ? "Unidades de secundario por 1 kg de primario"
                    : "Unidades de secundario por 1 unidad de primario"
                }
              />
              <span className="text-sm text-gray-600">
                {etiquetaUnidadVisualizacion(secundario?.unidadVisualizacion)}
              </span>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50/50 px-4 py-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-600">
                Cantidad a procesar{unidadPrim === "peso" ? " (kg)" : ""}
              </p>
              {!warehouseFirestoreId || mapaBodegaLoading || maxCantidad <= 0 ? null : (
                <span className="text-xs text-gray-500">
                  Máx.{" "}
                  <span className="font-medium tabular-nums text-gray-800">
                    {unidadPrim === "peso"
                      ? `${maxCantidad.toLocaleString("es-CO")} kg`
                      : maxCantidad}
                  </span>
                </span>
              )}
            </div>
            {!warehouseFirestoreId ? (
              <p className="mt-2 text-sm text-amber-900">Sin bodega interna.</p>
            ) : mapaBodegaLoading ? (
              <p className="mt-2 text-sm text-gray-500">Cargando…</p>
            ) : maxCantidad <= 0 ? (
              <p className="mt-2 text-sm text-amber-900">Sin stock mapa.</p>
            ) : (
              <div className="mt-3 flex items-center gap-3">
                <input
                  type="range"
                  min={1}
                  max={maxCantidad}
                  step={1}
                  value={Math.min(Math.round(cantidadElegida), maxCantidad)}
                  onChange={(e) => {
                    const v = Math.round(Number(e.target.value));
                    setCantidadElegida(v);
                  }}
                  className="min-w-0 flex-1 accent-[#2D5A3F]"
                />
                <span className="w-24 shrink-0 text-right text-lg font-bold tabular-nums text-gray-900">
                  {Math.round(cantidadElegida).toLocaleString("es-CO")}
                </span>
              </div>
            )}
          </div>

          <div className="rounded-[12px] border border-gray-200 bg-gray-50/80 px-4 py-3">
            <p className={FORMULARIO_CREACION_LABEL}>Estimado</p>
            {desgloseEstimado ? (
              <ul className="mt-3 space-y-2.5 text-sm text-gray-800">
                <li className="flex items-start gap-2.5">
                  <HiArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-[#2D5A3F]" aria-hidden />
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Ud. netas
                    </span>
                    <p className="text-lg font-bold tabular-nums text-gray-900">
                      {desgloseEstimado.uInt.toLocaleString("es-CO")}{" "}
                      <span className="text-sm font-semibold text-gray-600">
                        ({etiquetaUnidadVisualizacion(secundario?.unidadVisualizacion)})
                      </span>
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-2.5">
                  <HiArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-[#2D5A3F]" aria-hidden />
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Sobrante</span>
                    <p className="font-bold tabular-nums text-gray-900">
                      {desgloseEstimado.sobranteKg.toLocaleString("es-CO", { maximumFractionDigits: 3 })} kg
                    </p>
                    <p className="text-base leading-snug text-gray-500">Fracción sobrante.</p>
                  </div>
                </li>
                <li className="flex items-start gap-2.5">
                  <HiArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-[#2D5A3F]" aria-hidden />
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Merma</span>
                    {desgloseEstimado.mermaUnidades !== null && desgloseEstimado.mermaKg !== null ? (
                      <p className="font-semibold tabular-nums text-gray-900">
                        ≈{" "}
                        {desgloseEstimado.mermaUnidades.toLocaleString("es-CO", {
                          maximumFractionDigits: 4,
                        })}{" "}
                        u. · ≈{" "}
                        {desgloseEstimado.mermaKg.toLocaleString("es-CO", { maximumFractionDigits: 3 })} kg
                        {perdidaPctDelCatalogo > 0 ? (
                          <span className="ml-1 text-xs font-normal text-gray-500">
                            ({Math.round(perdidaPctDelCatalogo).toLocaleString("es-CO")}% cat.)
                          </span>
                        ) : null}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-600">—</p>
                    )}
                  </div>
                </li>
              </ul>
            ) : (
              <p className="mt-2 text-sm text-amber-900">Indicá conversión.</p>
            )}
          </div>

          {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-base text-red-700">{error}</p> : null}
        </form>
    </FormularioPlantilla>
  );
}
