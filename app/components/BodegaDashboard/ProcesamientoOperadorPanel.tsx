"use client";

import React from "react";
import { HiOutlineArrowLeft, HiOutlineChevronDown, HiOutlinePlus } from "react-icons/hi2";
import { FiCpu } from "react-icons/fi";
import { SolicitudProcesamientoService } from "@/app/services/solicitudProcesamientoService";
import type { SolicitudProcesamiento } from "@/app/types/solicitudProcesamiento";
import {
  PROCESAMIENTO_ESTADOS,
  procesamientoEstadoBadgeClass,
  normalizeProcesamientoEstado,
} from "@/app/types/solicitudProcesamiento";
import { compareOrdenCompraByCodigoDesc } from "@/lib/ordenCompraSort";
import { OrdenProcesamientoFormModal } from "@/app/components/ui/procesamiento/OrdenProcesamientoFormModal";
import type { Catalogo } from "@/app/types/catalogo";
import type { WarehouseMeta } from "@/app/interfaces/bodega";
import { catalogosPrimarios, esCatalogoSecundario } from "@/lib/catalogoProcesamiento";

function opcionesEstadoSelect(estadoActual: string): string[] {
  const cur = estadoActual.trim();
  if (cur && !PROCESAMIENTO_ESTADOS.some((x) => x === cur)) {
    return [cur, ...PROCESAMIENTO_ESTADOS];
  }
  return [...PROCESAMIENTO_ESTADOS];
}

/** En cuenta: el paso a «En curso» lo hace el operario de bodega asignado, no desde aquí. */
function opcionesEstadoVistaCuenta(estadoActual: string): string[] {
  const base = opcionesEstadoSelect(estadoActual);
  if (normalizeProcesamientoEstado(estadoActual) === "Iniciado") {
    return base.filter((o) => o !== "En curso");
  }
  return base;
}

const PAGE_SIZE = 10;

function compareProcDesc(a: SolicitudProcesamiento, b: SolicitudProcesamiento): number {
  return compareOrdenCompraByCodigoDesc(
    { numericId: a.numericId },
    { numericId: b.numericId },
  );
}

function formatCantidad(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return Number.isInteger(n) ? String(n) : n.toLocaleString("es-CO", { maximumFractionDigits: 4 });
}

function cantidadPrimarioEtiqueta(row: SolicitudProcesamiento): string {
  const n = formatCantidad(row.cantidadPrimario);
  const u = row.unidadPrimarioVisualizacion;
  if (u === "peso") return `${n} · peso`;
  if (u === "cantidad") return `${n} · ud.`;
  return n;
}

function catalogoTieneSecundarioVinculado(productos: Catalogo[]): boolean {
  return productos.some(
    (p) => esCatalogoSecundario(p) && String(p.includedPrimarioCatalogoId ?? "").trim(),
  );
}

export function ProcesamientoOperadorPanel({
  onBack,
  idCliente,
  codeCuenta,
  clientName,
  productos,
  bodegasInternas = [],
  creadoPorUid,
  creadoPorNombre,
  dataLoading,
}: {
  onBack: () => void;
  idCliente: string;
  codeCuenta: string;
  clientName: string;
  productos: Catalogo[];
  /** Bodegas internas vinculadas (p. ej. desde `warehousesFallback`). */
  bodegasInternas?: WarehouseMeta[];
  creadoPorUid: string;
  creadoPorNombre: string;
  dataLoading: boolean;
}) {
  const [ordenes, setOrdenes] = React.useState<SolicitudProcesamiento[]>([]);
  const [detalle, setDetalle] = React.useState<SolicitudProcesamiento | null>(null);
  const [page, setPage] = React.useState(1);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [subError, setSubError] = React.useState<string | null>(null);
  const [savingId, setSavingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!idCliente.trim()) {
      setOrdenes([]);
      return;
    }
    setSubError(null);
    return SolicitudProcesamientoService.subscribePorCliente(
      idCliente,
      setOrdenes,
      () => setSubError("No se pudieron cargar las órdenes. Revisá permisos en clientes/{id}/solicitudesProcesamiento."),
    );
  }, [idCliente]);

  const tabla = React.useMemo(() => [...ordenes].sort(compareProcDesc), [ordenes]);
  const pageCount = Math.max(1, Math.ceil(tabla.length / PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, page), pageCount);

  React.useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), pageCount));
  }, [pageCount]);

  const pagina = React.useMemo(
    () => tabla.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [tabla, currentPage],
  );

  const handleEstado = async (row: SolicitudProcesamiento, next: string) => {
    const nextNorm = normalizeProcesamientoEstado(next);
    if (nextNorm === row.estado) return;
    setSubError(null);
    setSavingId(row.id);
    const prev = row.estado;
    setOrdenes((list) => list.map((o) => (o.id === row.id ? { ...o, estado: nextNorm } : o)));
    setDetalle((d) => (d?.id === row.id ? { ...d, estado: nextNorm } : d));
    try {
      await SolicitudProcesamientoService.actualizarEstado(idCliente.trim(), row.id, nextNorm);
    } catch (e) {
      setOrdenes((list) => list.map((o) => (o.id === row.id ? { ...o, estado: prev } : o)));
      setDetalle((d) => (d?.id === row.id ? { ...d, estado: prev } : d));
      const msg = e instanceof Error ? e.message : "";
      if (msg === "solo_operario_asignado" || msg === "sin_operario_asignado") {
        setSubError("El estado «En curso» lo marca el operario de bodega asignado a la orden.");
      } else {
        setSubError("No se pudo actualizar el estado.");
      }
    } finally {
      setSavingId(null);
    }
  };

  const puedeCrear =
    Boolean(idCliente.trim()) &&
    Boolean(creadoPorUid.trim()) &&
    catalogosPrimarios(productos).length >= 1;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <button
          type="button"
          onClick={() => {
            setDetalle(null);
            setModalOpen(false);
            onBack();
          }}
          className="flex items-center gap-2 self-start text-sm font-semibold text-slate-600 transition-colors hover:text-slate-900"
        >
          <HiOutlineArrowLeft size={18} />
          Volver
        </button>

        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-sky-50 p-3 text-sky-800">
              <FiCpu size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
                Órdenes de procesamiento
              </h1>
              <p className="text-sm text-slate-500">
                El primario y el secundario salen del <strong>catálogo</strong>; la cantidad en primario respeta el
                inventario del catálogo y el estimado del secundario usa la <strong>regla de conversión</strong>.
                Elegís la <strong>bodega interna</strong> de destino cuando hay varias asignadas. Estados: Iniciado,
                En curso, Terminado.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setDetalle(null);
              setModalOpen(true);
            }}
            disabled={!puedeCrear}
            className="inline-flex items-center justify-center gap-2 rounded-[10px] bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
          >
            <HiOutlinePlus strokeWidth={2.5} className="h-5 w-5" />
            Nueva orden
          </button>
        </header>

        {subError ? (
          <p className="rounded-xl border border-red-100 bg-red-50/80 p-3 text-sm text-red-700">{subError}</p>
        ) : null}

        {!idCliente.trim() ? (
          <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
            Iniciá sesión con una cuenta vinculada para usar el catálogo.
          </p>
        ) : catalogosPrimarios(productos).length === 0 ? (
          <p className="rounded-xl border border-amber-100 bg-amber-50/80 p-4 text-sm text-amber-900">
            Necesitás al menos un producto <strong>primario</strong> en el catálogo (cuyo tipo no sea «Secundario»).
          </p>
        ) : !catalogoTieneSecundarioVinculado(productos) ? (
          <p className="rounded-xl border border-amber-100 bg-amber-50/80 p-4 text-sm text-amber-900">
            Aún no hay <strong>productos secundarios</strong> vinculados a un primario. En{" "}
            <strong>Catálogo → Crear secundario</strong> elegí «Incluido primario» para poder armar órdenes de
            procesamiento.
          </p>
        ) : null}

        <div className="overflow-hidden rounded-xl border border-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="whitespace-nowrap px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    Orden
                  </th>
                  <th className="min-w-[120px] px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    Primario
                  </th>
                  <th className="min-w-[120px] px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    Secundario
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    Cant. primario
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    Estim. sec.
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    Unidad
                  </th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    Estado
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    Fecha
                  </th>
                </tr>
              </thead>
              <tbody>
                {dataLoading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                      Cargando datos de cuenta…
                    </td>
                  </tr>
                ) : tabla.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                      No hay órdenes. Usá &quot;Nueva orden&quot; para crear la primera (se envía a la bodega interna).
                    </td>
                  </tr>
                ) : (
                  pagina.map((row) => (
                    <tr
                      key={row.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setDetalle(row)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setDetalle(row);
                        }
                      }}
                      className="cursor-pointer border-b border-slate-100 transition-colors hover:bg-sky-50/70 focus-visible:bg-sky-50/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-sky-400"
                      aria-label={`Ver detalle de orden ${row.numero}`}
                    >
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-[13px] font-semibold text-slate-900">
                        {row.numero}
                      </td>
                      <td className="max-w-[180px] px-4 py-3 text-slate-800">
                        <span className="line-clamp-2 text-[13px]" title={row.productoPrimarioTitulo}>
                          {row.productoPrimarioTitulo || "—"}
                        </span>
                      </td>
                      <td className="max-w-[180px] px-4 py-3 text-slate-800">
                        <span className="line-clamp-2 text-[13px]" title={row.productoSecundarioTitulo}>
                          {row.productoSecundarioTitulo || "—"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-medium tabular-nums text-slate-900">
                        {formatCantidad(row.cantidadPrimario)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-medium tabular-nums text-slate-800">
                        {row.estimadoUnidadesSecundario !== undefined &&
                        row.estimadoUnidadesSecundario !== null &&
                        Number.isFinite(row.estimadoUnidadesSecundario)
                          ? formatCantidad(row.estimadoUnidadesSecundario)
                          : "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                        {row.unidadPrimarioVisualizacion === "peso"
                          ? "Peso"
                          : row.unidadPrimarioVisualizacion === "cantidad"
                            ? "Cantidad"
                            : "—"}
                      </td>
                      <td
                        className="px-4 py-3"
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      >
                        <div className="relative inline-flex max-w-full align-middle">
                          <select
                            aria-label={`Estado de la orden ${row.numero}`}
                            title="Cambiar estado"
                            value={row.estado}
                            disabled={savingId === row.id}
                            onChange={(e) => void handleEstado(row, e.target.value)}
                            className={`inline-flex max-w-[12rem] cursor-pointer truncate rounded-full border-0 py-0.5 pl-2.5 pr-7 text-left text-xs font-semibold shadow-none outline-none ring-0 focus-visible:ring-2 focus-visible:ring-sky-400/50 [appearance:none] disabled:opacity-60 ${procesamientoEstadoBadgeClass(row.estado)}`}
                          >
                            {opcionesEstadoVistaCuenta(row.estado).map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                          <span
                            className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 text-current opacity-60"
                            aria-hidden
                          >
                            <HiOutlineChevronDown className="h-3.5 w-3.5" strokeWidth={2.25} />
                          </span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">{row.fecha}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {!dataLoading && tabla.length > 0 ? (
            <div className="flex flex-col gap-3 border-t border-slate-100 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-xs text-slate-500 tabular-nums">
                {tabla.length} {tabla.length === 1 ? "registro" : "registros"} · Página {currentPage} de{" "}
                {pageCount}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold uppercase tracking-wider shadow-sm hover:border-slate-300 disabled:opacity-50"
                >
                  Anterior
                </button>
                <span className="text-xs text-slate-600 tabular-nums">
                  Página {currentPage} / {pageCount}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                  disabled={currentPage === pageCount}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold uppercase tracking-wider shadow-sm hover:border-slate-300 disabled:opacity-50"
                >
                  Siguiente
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <OrdenProcesamientoFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        productos={productos}
        clientIdFirestore={idCliente.trim()}
        bodegasInternas={bodegasInternas}
        fallbackCodeCuenta={codeCuenta}
        onCreate={async (draft) => {
          await SolicitudProcesamientoService.create(idCliente.trim(), {
            codeCuenta: draft.codeCuenta.trim(),
            clientName: clientName.trim() || idCliente.trim(),
            creadoPorNombre: creadoPorNombre.trim() || "Usuario",
            creadoPorUid: creadoPorUid.trim(),
            productoPrimarioId: draft.productoPrimarioId,
            productoPrimarioTitulo: draft.productoPrimarioTitulo,
            productoSecundarioId: draft.productoSecundarioId,
            productoSecundarioTitulo: draft.productoSecundarioTitulo,
            cantidadPrimario: draft.cantidadPrimario,
            unidadPrimarioVisualizacion: draft.unidadPrimarioVisualizacion,
            warehouseId: draft.warehouseId,
            estimadoUnidadesSecundario: draft.estimadoUnidadesSecundario,
            fecha: draft.fecha,
            estado: draft.estado,
          });
          setPage(1);
        }}
      />

      {detalle ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="proc-detalle-titulo"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Cerrar"
            onClick={() => setDetalle(null)}
          />
          <div className="relative z-10 w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <h2 id="proc-detalle-titulo" className="text-lg font-bold text-slate-900">
              {detalle.numero}
            </h2>
            <p className="mt-3 text-xs font-bold uppercase tracking-wide text-slate-500">Producto primario</p>
            <p className="mt-1 text-sm font-medium text-slate-900">{detalle.productoPrimarioTitulo}</p>
            <p className="mt-1 text-sm text-slate-700">
              <span className="text-slate-500">Cantidad en primario:</span>{" "}
              <span className="font-semibold tabular-nums">{cantidadPrimarioEtiqueta(detalle)}</span>
            </p>
            <p className="mt-3 text-xs font-bold uppercase tracking-wide text-slate-500">Producto secundario</p>
            <p className="mt-1 text-sm font-medium text-slate-900">{detalle.productoSecundarioTitulo}</p>
            {detalle.estimadoUnidadesSecundario !== undefined &&
            detalle.estimadoUnidadesSecundario !== null &&
            Number.isFinite(detalle.estimadoUnidadesSecundario) ? (
              <p className="mt-2 text-sm text-slate-700">
                <span className="text-slate-500">Estimado unidades secundario:</span>{" "}
                <span className="font-semibold tabular-nums">
                  {formatCantidad(detalle.estimadoUnidadesSecundario)}
                </span>
              </p>
            ) : null}
            <p className="mt-2 text-xs text-slate-400">
              Fecha: {detalle.fecha} · Destino (codeCuenta):{" "}
              <span className="font-mono">{detalle.codeCuenta || "—"}</span>
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Operario bodega:{" "}
              <span className="font-medium text-slate-700">
                {detalle.operarioBodegaNombre?.trim() || detalle.operarioBodegaUid || "—"}
              </span>
            </p>
            <span
              className={`mt-3 inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${procesamientoEstadoBadgeClass(detalle.estado)}`}
            >
              {detalle.estado}
            </span>
            <button
              type="button"
              onClick={() => setDetalle(null)}
              className="mt-6 w-full rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Cerrar
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
