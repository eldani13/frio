"use client";

import React from "react";
import { HiOutlineArrowLeft, HiOutlineChevronDown, HiOutlinePlus } from "react-icons/hi2";
import { FiCpu } from "react-icons/fi";
import { SolicitudProcesamientoService } from "@/app/services/solicitudProcesamientoService";
import { recordMermaProcesamientoKg } from "@/lib/bodegaCloudState";
import type { SolicitudProcesamiento } from "@/app/types/solicitudProcesamiento";
import {
  PROCESAMIENTO_ESTADOS,
  procesamientoEstadoBadgeClass,
  normalizeProcesamientoEstado,
} from "@/app/types/solicitudProcesamiento";
import { compareOrdenCompraByCodigoDesc } from "@/lib/ordenCompraSort";
import { ModalPlantilla, ModalPlantillaFila } from "@/app/components/ui/ModalPlantilla";
import { OrdenProcesamientoFormModal } from "@/app/components/ui/procesamiento/OrdenProcesamientoFormModal";
import type { Catalogo } from "@/app/types/catalogo";
import type { WarehouseMeta } from "@/app/interfaces/bodega";
import {
  catalogosPrimarios,
  esCatalogoSecundario,
  formatEstimadoUnidadesSecundario,
} from "@/lib/catalogoProcesamiento";
import {
  cantidadPrimarioProcesamientoTexto,
  estimadoUnidadesSecundarioTexto,
  primarioCatalogoPorId,
  textoPrecioSecundarioCatalogo,
} from "@/app/lib/procesamientoDisplay";
import {
  desperdicioKgSugeridoDesdeMerma,
  stringKgInicialDesperdicio,
} from "@/app/lib/desperdicioKgSugerido";
import { swalConfirm, swalWarning } from "@/lib/swal";

function opcionesEstadoSelect(estadoActual: string): string[] {
  const cur = estadoActual.trim();
  const ordered = [...PROCESAMIENTO_ESTADOS];
  const base = cur && !ordered.some((x) => x === cur) ? [cur, ...ordered] : [...ordered];
  const n = normalizeProcesamientoEstado(estadoActual);
  if (n === "Pendiente" || n === "Terminado") {
    return [n];
  }
  if (n === "Iniciado") {
    return base.filter((x) => x !== "Terminado" && x !== "Pendiente");
  }
  if (n === "En curso") {
    return base.filter((x) => x !== "Terminado");
  }
  return base;
}

/** En cuenta: el paso a «En curso» lo hace el operario de bodega asignado, no desde aquí. */
function opcionesEstadoVistaCuenta(estadoActual: string): string[] {
  const base = opcionesEstadoSelect(estadoActual);
  const n = normalizeProcesamientoEstado(estadoActual);
  if (n === "Iniciado") {
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

function cantidadPrimarioEtiqueta(row: SolicitudProcesamiento, productos: Catalogo[]): string {
  return cantidadPrimarioProcesamientoTexto(row, primarioCatalogoPorId(productos, row.productoPrimarioId));
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
  const [modalDesperdicioRow, setModalDesperdicioRow] = React.useState<SolicitudProcesamiento | null>(null);
  const [modalDesperdicioKg, setModalDesperdicioKg] = React.useState("0");

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

  const handleEstado = async (row: SolicitudProcesamiento, next: string, desperdicioKgArg?: number) => {
    const nextNorm = normalizeProcesamientoEstado(next);
    if (nextNorm === row.estado) return;
    const prevNorm = normalizeProcesamientoEstado(row.estado);
    if (nextNorm === "Pendiente" && prevNorm === "En curso" && desperdicioKgArg === undefined) {
      setModalDesperdicioRow(row);
      setModalDesperdicioKg(stringKgInicialDesperdicio(desperdicioKgSugeridoDesdeMerma(row)));
      return;
    }
    setSubError(null);
    setSavingId(row.id);
    const prev = row.estado;
    setOrdenes((list) =>
      list.map((o) =>
        o.id === row.id
          ? {
              ...o,
              estado: nextNorm,
          ...(nextNorm === "Pendiente" && prevNorm === "En curso"
            ? { desperdicioKg: Number(desperdicioKgArg), cierreDesdeProcesador: false }
            : {}),
            }
          : o,
      ),
    );
    setDetalle((d) =>
      d?.id === row.id
        ? {
            ...d,
            estado: nextNorm,
          ...(nextNorm === "Pendiente" && prevNorm === "En curso"
            ? { desperdicioKg: Number(desperdicioKgArg), cierreDesdeProcesador: false }
            : {}),
          }
        : d,
    );
    try {
      await SolicitudProcesamientoService.actualizarEstado(
        idCliente.trim(),
        row.id,
        nextNorm,
        nextNorm === "Pendiente" && prevNorm === "En curso"
          ? { desperdicioKg: Number(desperdicioKgArg), cierreDesdeProcesador: false }
          : undefined,
      );
      if (nextNorm === "Pendiente" && prevNorm === "En curso") {
        const mk = Number(desperdicioKgArg);
        if (Number.isFinite(mk) && mk > 0) {
          void recordMermaProcesamientoKg(String(row.warehouseId ?? "").trim(), mk);
        }
      }
    } catch (e) {
      setOrdenes((list) => list.map((o) => (o.id === row.id ? { ...o, estado: prev } : o)));
      setDetalle((d) => (d?.id === row.id ? { ...d, estado: prev } : d));
      const msg = e instanceof Error ? e.message : "";
      if (msg === "solo_operario_asignado" || msg === "sin_operario_asignado") {
        setSubError("El estado «En curso» lo marca el operario de bodega asignado a la orden.");
      } else if (msg === "desperdicio_requerido") {
        setSubError("Indicá la merma en kg (puede ser 0) al pasar a «Pendiente».");
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
      {modalDesperdicioRow ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-3 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pop-proc-desperdicio-titulo"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Cerrar"
            onClick={() => setModalDesperdicioRow(null)}
          />
          <div
            className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="pop-proc-desperdicio-titulo" className="app-title">
              Merma (kg)
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              Orden <span className="font-mono font-semibold">{modalDesperdicioRow.numero}</span>. Es la merma del
              proceso (<strong>no vuelve al mapa</strong>; reporte en bodega). Se precarga con el % del secundario;
              ajustá si corresponde.
            </p>
            {(() => {
              const sug = desperdicioKgSugeridoDesdeMerma(modalDesperdicioRow);
              const pct = modalDesperdicioRow.perdidaProcesamientoPct;
              if (sug !== null && pct !== undefined && Number(pct) > 0) {
                return (
                  <p className="mt-2 text-xs text-slate-500">
                    kg primario × {Number(pct).toLocaleString("es-CO", { maximumFractionDigits: 2 })}% →{" "}
                    <span className="font-mono font-semibold text-slate-700">{sug}</span> kg.
                  </p>
                );
              }
              if (modalDesperdicioRow.unidadPrimarioVisualizacion === "cantidad") {
                return (
                  <p className="mt-2 text-xs text-amber-900/85">
                    Primario en <strong>unidades</strong>: ingresá kg de desperdicio a mano.
                  </p>
                );
              }
              return null;
            })()}
            <label className="mt-4 block text-xs font-semibold text-slate-700" htmlFor="pop-proc-desperdicio-kg">
              Kilogramos
            </label>
            <input
              id="pop-proc-desperdicio-kg"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
              value={modalDesperdicioKg}
              onChange={(e) => setModalDesperdicioKg(e.target.value)}
            />
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                onClick={() => setModalDesperdicioRow(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"
                onClick={() => {
                  void (async () => {
                    const raw = String(modalDesperdicioKg).replace(",", ".").trim();
                    const kg = Number(raw);
                    if (!Number.isFinite(kg) || kg < 0) {
                      void swalWarning("Validación", "Ingresá un número de kg mayor o igual a 0.");
                      return;
                    }
                    const ok = await swalConfirm(
                      "¿Confirmar orden como pendiente?",
                      `Se registrará merma de ${kg} kg. Revisá el valor antes de continuar.`,
                    );
                    if (!ok) return;
                    const r = modalDesperdicioRow;
                    setModalDesperdicioRow(null);
                    void handleEstado(r, "Pendiente", kg);
                  })();
                }}
              >
                Confirmar pendiente
              </button>
            </div>
          </div>
        </div>
      ) : null}
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
              <h1 className="app-title">
                Órdenes de procesamiento
              </h1>
              
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
                  <th className="whitespace-nowrap px-4 py-3 text-base font-bold uppercase tracking-wide text-slate-500">
                    Orden
                  </th>
                  <th className="min-w-[120px] px-4 py-3 text-base font-bold uppercase tracking-wide text-slate-500">
                    Primario
                  </th>
                  <th className="min-w-[120px] px-4 py-3 text-base font-bold uppercase tracking-wide text-slate-500">
                    Secundario
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-base font-bold uppercase tracking-wide text-slate-500">
                    Insumo primario
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-base font-bold uppercase tracking-wide text-slate-500">
                    Estim. sec.
                  </th>
                  <th className="px-4 py-3 text-base font-bold uppercase tracking-wide text-slate-500">
                    Estado
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-base font-bold uppercase tracking-wide text-slate-500">
                    Fecha
                  </th>
                </tr>
              </thead>
              <tbody>
                {dataLoading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                      Cargando datos de cuenta…
                    </td>
                  </tr>
                ) : tabla.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
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
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-base font-semibold text-slate-900">
                        {row.numero}
                      </td>
                      <td className="max-w-[180px] px-4 py-3 text-slate-800">
                        <span className="line-clamp-2 text-base" title={row.productoPrimarioTitulo}>
                          {row.productoPrimarioTitulo || "—"}
                        </span>
                      </td>
                      <td className="max-w-[180px] px-4 py-3 text-slate-800">
                        <span className="line-clamp-2 text-base" title={row.productoSecundarioTitulo}>
                          {row.productoSecundarioTitulo || "—"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-medium tabular-nums text-slate-900">
                        {cantidadPrimarioEtiqueta(row, productos)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-medium tabular-nums text-slate-800">
                        {estimadoUnidadesSecundarioTexto(row.estimadoUnidadesSecundario)}
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
                            onChange={(e) => {
                              const v = e.target.value;
                              if (
                                normalizeProcesamientoEstado(v) === "Pendiente" &&
                                normalizeProcesamientoEstado(row.estado) === "En curso"
                              ) {
                                setModalDesperdicioRow(row);
                                setModalDesperdicioKg(
                                  stringKgInicialDesperdicio(desperdicioKgSugeridoDesdeMerma(row)),
                                );
                                return;
                              }
                              void handleEstado(row, v);
                            }}
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
            reglaConversionCantidadPrimario: draft.reglaConversionCantidadPrimario,
            reglaConversionUnidadesSecundario: draft.reglaConversionUnidadesSecundario,
            perdidaProcesamientoPct: draft.perdidaProcesamientoPct,
            fecha: draft.fecha,
            estado: draft.estado,
          });
          setPage(1);
        }}
      />

      {detalle ? (
        <ModalPlantilla
          open
          onClose={() => setDetalle(null)}
          titulo={String(detalle.numero ?? "").trim() || detalle.id}
          tituloId="proc-detalle-titulo"
          tituloClassName="font-mono"
          headerIcon={<FiCpu className="h-7 w-7 text-blue-600" strokeWidth={2} aria-hidden />}
          subtitulo={
            <div className="flex flex-col items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${procesamientoEstadoBadgeClass(detalle.estado)}`}
              >
                {detalle.estado}
              </span>
              <p className="text-xs leading-relaxed text-slate-500">
                Fecha: {detalle.fecha || "—"} · Destino (codeCuenta):{" "}
                <span className="font-mono text-slate-600">{detalle.codeCuenta || "—"}</span>
              </p>
            </div>
          }
          maxWidthClass="max-w-lg"
          footer={
            <button
              type="button"
              onClick={() => setDetalle(null)}
              className="w-full rounded-xl bg-slate-900 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              Cerrar
            </button>
          }
        >
          <dl className="space-y-4 text-base">
            <ModalPlantillaFila
              label="Producto primario"
              value={(detalle.productoPrimarioTitulo || "—").trim() || "—"}
            />
            <ModalPlantillaFila label="Cantidad en primario" value={cantidadPrimarioEtiqueta(detalle, productos)} />
            <ModalPlantillaFila
              label="Producto secundario"
              value={(detalle.productoSecundarioTitulo || "—").trim() || "—"}
            />
            <ModalPlantillaFila
              label="Precio (catálogo)"
              value={textoPrecioSecundarioCatalogo(productos, detalle.productoSecundarioId)}
            />
            {detalle.estimadoUnidadesSecundario !== undefined &&
            detalle.estimadoUnidadesSecundario !== null &&
            Number.isFinite(detalle.estimadoUnidadesSecundario) ? (
              <ModalPlantillaFila
                label="Estimado unidades secundario"
                value={formatEstimadoUnidadesSecundario(detalle.estimadoUnidadesSecundario)}
              />
            ) : null}
            {Number(detalle.reglaConversionCantidadPrimario) > 0 &&
            Number(detalle.reglaConversionUnidadesSecundario) > 0 ? (
              <ModalPlantillaFila
                label="Regla al crear"
                value={`${detalle.reglaConversionCantidadPrimario} (primario) → ${detalle.reglaConversionUnidadesSecundario} (secundario)`}
              />
            ) : null}
            {detalle.perdidaProcesamientoPct !== undefined &&
            detalle.perdidaProcesamientoPct !== null &&
            Number(detalle.perdidaProcesamientoPct) > 0 ? (
              <ModalPlantillaFila
                label="Pérdida / merma (catálogo)"
                value={`${formatCantidad(detalle.perdidaProcesamientoPct)} % (sobre estimado teórico de uds. secundario)`}
              />
            ) : null}
            <ModalPlantillaFila
              label="Operario bodega"
              value={detalle.operarioBodegaNombre?.trim() || detalle.operarioBodegaUid || "—"}
            />
          </dl>
        </ModalPlantilla>
      ) : null}
    </section>
  );
}
