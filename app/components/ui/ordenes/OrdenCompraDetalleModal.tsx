"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FiShoppingCart } from "react-icons/fi";
import { ModalPlantilla } from "@/app/components/ui/ModalPlantilla";
import {
  ORDEN_COMPRA_ESTADOS,
  ordenCompraEstadoBadgeClass,
  type OrdenCompra,
} from "@/app/types/ordenCompra";
import type { WarehouseMeta } from "@/app/interfaces/bodega";
import { AsignarBodegaService } from "@/app/services/asignarbodegaService";
import { OrdenCompraService } from "@/app/services/ordenCompraService";
import { formatKgEs } from "@/app/lib/decimalEs";

function mergeWarehousesForClient(
  byCode: WarehouseMeta[],
  fallback: WarehouseMeta[],
  clientId: string,
  accountCode: string,
): WarehouseMeta[] {
  const map = new Map<string, WarehouseMeta>();
  const add = (w: WarehouseMeta) => {
    if (!w?.id || w.disabled) return;
    map.set(w.id, w);
  };
  byCode.forEach(add);
  const codeTrim = accountCode.trim();
  fallback.forEach((w) => {
    const cc = (w.codeCuenta ?? "").trim();
    if (!cc) return;
    if (codeTrim && cc === codeTrim) add(w);
    if (cc === clientId) add(w);
  });
  return Array.from(map.values()).sort((a, b) =>
    (a.name ?? a.id).localeCompare(b.name ?? b.id, "es", { sensitivity: "base" }),
  );
}

function warehouseOptionLabel(w: WarehouseMeta) {
  const name = w.name?.trim() || w.id;
  const st = w.status?.trim();
  if (st === "externa" || st === "external") return `${name} · externa`;
  if (st === "interna") return `${name} · interna`;
  return name;
}

function isInterna(w: WarehouseMeta) {
  const s = (w.status ?? "").toLowerCase().trim();
  return s === "interna";
}

function isExterna(w: WarehouseMeta) {
  const s = (w.status ?? "").toLowerCase().trim();
  return s === "externa" || s === "external";
}

interface Props {
  orden: OrdenCompra | null;
  onClose: () => void;
  /** Solo operador de cuenta ve envío y destino. */
  esOperadorCuentas?: boolean;
  idCliente?: string;
  codeCuenta?: string;
  /** Bodegas globales (misma fuente que el custodio) para cruzar por codeCuenta. */
  warehousesFallback?: WarehouseMeta[];
  onEnviada?: () => void;
  /** Tras guardar el estado manual (p. ej. refrescar lista en Reportes). */
  onEstadoActualizado?: () => void;
}

export function OrdenCompraDetalleModal({
  orden,
  onClose,
  esOperadorCuentas = false,
  idCliente = "",
  codeCuenta = "",
  warehousesFallback = [],
  onEnviada,
  onEstadoActualizado,
}: Props) {
  const [linkedWarehouses, setLinkedWarehouses] = useState<WarehouseMeta[]>([]);
  const [loadingWarehouses, setLoadingWarehouses] = useState(false);
  const [destinoTipo, setDestinoTipo] = useState<"interna" | "externa" | null>(null);
  const [warehouseId, setWarehouseId] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [estadoLocal, setEstadoLocal] = useState(orden?.estado ?? "");
  const [savingEstado, setSavingEstado] = useState(false);
  const [estadoError, setEstadoError] = useState<string | null>(null);
  const [fechaLlegadaEstipulada, setFechaLlegadaEstipulada] = useState("");

  const yaEnviada =
    orden?.estado === "Transporte" ||
    orden?.estado === "Enviada" ||
    (typeof orden?.enviadaAt === "number" && orden.enviadaAt > 0);

  const loadWarehouses = useCallback(async () => {
    if (!idCliente.trim() || !codeCuenta.trim()) {
      setLinkedWarehouses([]);
      return;
    }
    setLoadingWarehouses(true);
    try {
      const byCode = await AsignarBodegaService.getWarehousesByCode(codeCuenta.trim());
      const merged = mergeWarehousesForClient(
        byCode,
        warehousesFallback,
        idCliente.trim(),
        codeCuenta.trim(),
      );
      setLinkedWarehouses(merged);
    } catch {
      setLinkedWarehouses([]);
    } finally {
      setLoadingWarehouses(false);
    }
  }, [idCliente, codeCuenta, warehousesFallback]);

  useEffect(() => {
    if (!orden?.id || !esOperadorCuentas) return;
    void loadWarehouses();
  }, [orden?.id, esOperadorCuentas, loadWarehouses]);

  useEffect(() => {
    if (!orden) return;
    setDestinoTipo(null);
    setWarehouseId("");
    setSendError(null);
    if (orden.destinoTipo === "interna" || orden.destinoTipo === "externa") {
      setDestinoTipo(orden.destinoTipo);
    }
    if (orden.destinoWarehouseId) {
      setWarehouseId(orden.destinoWarehouseId);
    }
  }, [orden?.id]);

  useEffect(() => {
    setEstadoLocal(orden?.estado ?? "");
    setEstadoError(null);
  }, [orden?.id, orden?.estado]);

  useEffect(() => {
    const raw = orden?.fechaLlegadaEstipulada?.trim() ?? "";
    setFechaLlegadaEstipulada(raw.length >= 10 ? raw.slice(0, 10) : raw);
  }, [orden?.id, orden?.fechaLlegadaEstipulada]);

  const opcionesEstado = useMemo(() => {
    const cur = (orden?.estado ?? "").trim();
    if (cur && !ORDEN_COMPRA_ESTADOS.some((x) => x === cur)) {
      return [cur, ...ORDEN_COMPRA_ESTADOS];
    }
    return [...ORDEN_COMPRA_ESTADOS];
  }, [orden?.estado]);

  const puedeEditarEstado = Boolean(idCliente.trim() && orden?.id);

  const handleCambiarEstado = async (next: string) => {
    if (!orden?.id || !idCliente.trim()) return;
    if (next === estadoLocal) return;
    const prev = estadoLocal;
    setEstadoLocal(next);
    setSavingEstado(true);
    setEstadoError(null);
    try {
      await OrdenCompraService.actualizarEstado(idCliente.trim(), orden.id, next);
      onEstadoActualizado?.();
    } catch (e: unknown) {
      setEstadoLocal(prev);
      setEstadoError(e instanceof Error ? e.message : "No se pudo guardar el estado.");
    } finally {
      setSavingEstado(false);
    }
  };

  const filtradasPorTipo = useMemo(() => {
    if (!destinoTipo) return [];
    return linkedWarehouses.filter((w) => (destinoTipo === "interna" ? isInterna(w) : isExterna(w)));
  }, [linkedWarehouses, destinoTipo]);

  useEffect(() => {
    if (yaEnviada) return;
    if (!filtradasPorTipo.length) {
      if (destinoTipo) setWarehouseId("");
      return;
    }
    if (!filtradasPorTipo.some((w) => w.id === warehouseId)) {
      setWarehouseId(filtradasPorTipo[0].id);
    }
  }, [filtradasPorTipo, destinoTipo, warehouseId, yaEnviada]);

  if (!orden) return null;

  const lineItems = orden.lineItems ?? [];

  const handleEnviar = async () => {
    setSendError(null);
    if (!orden.id) {
      setSendError("No se pudo identificar la orden.");
      return;
    }
    if (!destinoTipo) {
      setSendError("Elegí si el destino es bodega interna o externa.");
      return;
    }
    const w = filtradasPorTipo.find((x) => x.id === warehouseId);
    if (!w?.id) {
      setSendError("Elegí una bodega de la lista.");
      return;
    }
    const fecha = fechaLlegadaEstipulada.trim();
    if (!fecha) {
      setSendError("Indicá la fecha de llegada estipulada antes de enviar.");
      return;
    }
    setSending(true);
    try {
      await OrdenCompraService.marcarEnviada(idCliente.trim(), orden.id, {
        destinoTipo,
        destinoWarehouseId: w.id,
        destinoWarehouseNombre: w.name?.trim() || w.id,
        fechaLlegadaEstipulada: fecha,
      });
      onEnviada?.();
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "No se pudo enviar la orden.";
      setSendError(msg);
    } finally {
      setSending(false);
    }
  };

  const mostrarBloqueOperador = esOperadorCuentas && idCliente.trim() && codeCuenta.trim();

  return (
    <ModalPlantilla
      open
      onClose={onClose}
      titulo="Detalle de orden"
      tituloId="orden-detalle-title"
      headerIcon={<FiShoppingCart className="h-7 w-7 text-blue-600" strokeWidth={2} aria-hidden />}
      zIndexClass="z-50"
      maxWidthClass="max-w-lg"
      cardMaxHeightClass="max-h-[90vh]"
      subtitulo={<span className="font-mono font-semibold text-slate-800">{orden.numero}</span>}
      footer={
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-base font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Cerrar
          </button>
        </div>
      }
    >
        <dl className="mb-5 space-y-2 border-b border-slate-100 pb-4 text-base">
          <div className="flex flex-wrap gap-x-2 gap-y-1">
            <dt className="font-semibold text-slate-500">Proveedor</dt>
            <dd className="text-slate-900">{orden.proveedorNombre || "—"}</dd>
          </div>
          <div className="flex flex-wrap gap-x-2 gap-y-1">
            <dt className="font-semibold text-slate-500">Fecha</dt>
            <dd className="text-slate-900">{orden.fecha}</dd>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-2 sm:gap-y-1">
            <dt className="shrink-0 font-semibold text-slate-500">Estado</dt>
            <dd className="min-w-0 flex-1">
              {puedeEditarEstado ? (
                <div className="flex flex-col gap-1.5">
                  <select
                    id="orden-detalle-estado"
                    value={estadoLocal}
                    disabled={savingEstado}
                    onChange={(e) => void handleCambiarEstado(e.target.value)}
                    className="w-full max-w-xs rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-900 disabled:opacity-60"
                    aria-busy={savingEstado}
                  >
                    {opcionesEstado.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                  {savingEstado ? (
                    <span className="text-xs text-slate-500">Guardando…</span>
                  ) : null}
                  {estadoError ? (
                    <span className="text-xs text-red-600">{estadoError}</span>
                  ) : null}
                </div>
              ) : (
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${ordenCompraEstadoBadgeClass(orden.estado)}`}
                >
                  {orden.estado}
                </span>
              )}
            </dd>
          </div>
          {orden.fechaLlegadaEstipulada?.trim() ? (
            <div className="flex flex-wrap gap-x-2 gap-y-1">
              <dt className="font-semibold text-slate-500">Llegada estipulada</dt>
              <dd className="text-slate-900">{orden.fechaLlegadaEstipulada.trim()}</dd>
            </div>
          ) : null}
          {yaEnviada && (orden.destinoWarehouseNombre || orden.destinoTipo) ? (
            <>
              <div className="flex flex-wrap gap-x-2 gap-y-1">
                <dt className="font-semibold text-slate-500">Destino</dt>
                <dd className="text-slate-900">
                  {orden.destinoTipo === "interna"
                    ? "Bodega interna"
                    : orden.destinoTipo === "externa"
                      ? "Bodega externa"
                      : "—"}
                  {orden.destinoWarehouseNombre ? ` · ${orden.destinoWarehouseNombre}` : ""}
                </dd>
              </div>
            </>
          ) : null}
        </dl>

        {mostrarBloqueOperador ? (
          <div className="mb-5 space-y-3 border-b border-slate-100 pb-4">
            <p className="text-base font-bold uppercase tracking-wide text-slate-500">Destino</p>
            <p className="text-xs text-slate-500">
              Elegí si la mercadería va a una bodega interna o externa vinculada a tu cuenta (las mismas
              que asigna el administrador).
            </p>
            {yaEnviada ? (
              <p className="rounded-lg bg-violet-50 px-3 py-2 text-sm text-violet-900">
                Esta orden ya está en camino o fue enviada
                {orden.destinoWarehouseNombre ? ` (${orden.destinoWarehouseNombre})` : ""}.
              </p>
            ) : (
              <>
                <div>
                  <label
                    htmlFor="orden-fecha-llegada"
                    className="mb-1 block text-xs font-semibold text-slate-600"
                  >
                    Fecha de llegada estipulada
                  </label>
                  <input
                    id="orden-fecha-llegada"
                    type="date"
                    value={fechaLlegadaEstipulada}
                    onChange={(e) => setFechaLlegadaEstipulada(e.target.value)}
                    className="w-full max-w-xs rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                  />
                  <p className="mt-1 text-base text-slate-500">
                    Obligatoria antes de enviar. El custodio la verá al recibir en bodega.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDestinoTipo("interna");
                      setWarehouseId("");
                      setSendError(null);
                    }}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                      destinoTipo === "interna"
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    Bodega interna
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDestinoTipo("externa");
                      setWarehouseId("");
                      setSendError(null);
                    }}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                      destinoTipo === "externa"
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    Bodega externa
                  </button>
                </div>

                {loadingWarehouses ? (
                  <p className="text-sm text-slate-500">Cargando bodegas de la cuenta…</p>
                ) : destinoTipo ? (
                  filtradasPorTipo.length === 0 ? (
                    <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                      No hay bodegas{" "}
                      {destinoTipo === "interna" ? "internas" : "externas"} vinculadas a esta cuenta. Pedile al
                      administrador que las asigne en Asignación y creación.
                    </p>
                  ) : (
                    <div>
                      <label htmlFor="orden-destino-bodega" className="mb-1 block text-xs font-semibold text-slate-600">
                        Bodega
                      </label>
                      <select
                        id="orden-destino-bodega"
                        value={warehouseId}
                        onChange={(e) => setWarehouseId(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                      >
                        {filtradasPorTipo.map((w) => (
                          <option key={w.id} value={w.id}>
                            {warehouseOptionLabel(w)}
                          </option>
                        ))}
                      </select>
                    </div>
                  )
                ) : (
                  <p className="text-sm text-slate-500">Seleccioná interna o externa para ver las bodegas.</p>
                )}

                {sendError ? (
                  <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{sendError}</p>
                ) : null}

                <button
                  type="button"
                  onClick={() => void handleEnviar()}
                  disabled={
                    sending ||
                    yaEnviada ||
                    !destinoTipo ||
                    filtradasPorTipo.length === 0 ||
                    !warehouseId.trim() ||
                    !fechaLlegadaEstipulada.trim()
                  }
                  className="w-full rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:hover:bg-slate-300"
                >
                  {sending ? "Enviando…" : "Enviar orden de compra (pasa a transporte)"}
                </button>
              </>
            )}
          </div>
        ) : null}

        <p className="mb-2 text-base font-bold uppercase tracking-wide text-slate-500">Productos</p>
        {lineItems.length === 0 ? (
          <p className="text-sm text-slate-500">Esta orden no tiene líneas registradas.</p>
        ) : (
          <ul className="space-y-3">
            {lineItems.map((li, i) => (
              <li
                key={`${li.catalogoProductId}-${i}`}
                className="rounded-lg border border-slate-100 bg-slate-50/80 px-4 py-3"
              >
                <p className="font-medium text-slate-900">{li.titleSnapshot || "—"}</p>
                <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm text-slate-600">
                  {li.pesoKg != null &&
                  Number.isFinite(Number(li.pesoKg)) &&
                  Number(li.pesoKg) > 0 ? (
                    <span>
                      <span className="text-slate-500">Peso:</span>{" "}
                      <span className="tabular-nums font-semibold text-slate-900">
                        {formatKgEs(Number(li.pesoKg))} kg
                      </span>
                    </span>
                  ) : (
                    <span>
                      <span className="text-slate-500">Cantidad:</span>{" "}
                      <span className="tabular-nums font-semibold text-slate-900">{li.cantidad}</span>
                    </span>
                  )}
                  {li.skuSnapshot ? (
                    <span className="text-xs text-slate-500">SKU {li.skuSnapshot}</span>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}

    </ModalPlantilla>
  );
}
