"use client";

import React from "react";
import { HiOutlineArrowLeft, HiOutlineChevronDown, HiOutlinePlus } from "react-icons/hi2";
import { MdShoppingCart } from "react-icons/md";
import {
  ORDEN_COMPRA_ESTADOS,
  ordenCompraEstadoBadgeClass,
} from "@/app/types/ordenCompra";
import type { VentaEnCurso } from "@/app/types/ventaCuenta";
import { compareOrdenCompraByCodigoDesc } from "@/lib/ordenCompraSort";
import type { Catalogo } from "@/app/types/catalogo";
import type { Comprador } from "@/app/types/comprador";
import { VentaManualFormModal } from "@/app/components/ui/ventas/VentaManualFormModal";

function productosResumen(v: VentaEnCurso): string {
  const items = v.lineItems ?? [];
  if (!items.length) return "—";
  return items.map((li) => `${li.titleSnapshot} × ${li.cantidad}`).join(" · ");
}

function opcionesEstadoSelect(estadoActual: string): string[] {
  const cur = estadoActual.trim();
  if (cur && !ORDEN_COMPRA_ESTADOS.some((x) => x === cur)) {
    return [cur, ...ORDEN_COMPRA_ESTADOS];
  }
  return [...ORDEN_COMPRA_ESTADOS];
}

const PAGE_SIZE = 10;

function compareVentasByNumeroDesc(a: VentaEnCurso, b: VentaEnCurso): number {
  return compareOrdenCompraByCodigoDesc(
    { numericId: a.numericId },
    { numericId: b.numericId },
  );
}

export function VentasEnCursoOperadorPanel({
  onBack,
  idCliente,
  productos,
  compradores,
  dataLoading,
}: {
  onBack: () => void;
  idCliente: string;
  productos: Catalogo[];
  compradores: Comprador[];
  dataLoading: boolean;
}) {
  const [ventas, setVentas] = React.useState<VentaEnCurso[]>([]);
  const [detalle, setDetalle] = React.useState<VentaEnCurso | null>(null);
  const [page, setPage] = React.useState(1);
  const [ventaModalOpen, setVentaModalOpen] = React.useState(false);

  const tabla = React.useMemo(() => [...ventas].sort(compareVentasByNumeroDesc), [ventas]);
  const pageCount = Math.max(1, Math.ceil(tabla.length / PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, page), pageCount);

  React.useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), pageCount));
  }, [pageCount]);

  const pagina = React.useMemo(
    () => tabla.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [tabla, currentPage],
  );

  const handleEstado = (v: VentaEnCurso, next: string) => {
    if (next === v.estado) return;
    setVentas((list) =>
      list.map((row) => (row.id === v.id ? { ...row, estado: next } : row)),
    );
    setDetalle((d) => (d?.id === v.id ? { ...d, estado: next } : d));
  };

  const compradoresConId = React.useMemo(
    () => compradores.filter((c) => Boolean(c.id?.trim())),
    [compradores],
  );
  const puedeCrearVenta =
    Boolean(idCliente.trim()) && productos.length > 0 && compradoresConId.length > 0;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <button
          type="button"
          onClick={() => {
            setDetalle(null);
            setVentaModalOpen(false);
            onBack();
          }}
          className="flex items-center gap-2 self-start text-sm font-semibold text-slate-600 transition-colors hover:text-slate-900"
        >
          <HiOutlineArrowLeft size={18} />
          Volver
        </button>

        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-800">
              <MdShoppingCart size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
                Ordenes de ventas
              </h1>
              <p className="text-sm text-slate-500">
                El <strong>comprador</strong> se elige entre los registrados por el administrador (Compradores).
                Productos del catálogo en unidades, estado y fecha (mismos estados que órdenes de compra).
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setDetalle(null);
              setVentaModalOpen(true);
            }}
            disabled={!puedeCrearVenta}
            className="inline-flex items-center justify-center gap-2 rounded-[10px] bg-[#A8D5BA] px-5 py-2.5 text-sm font-semibold text-[#2D5A3F] shadow-sm transition hover:bg-[#97c4a9] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
          >
            <HiOutlinePlus strokeWidth={2.5} className="h-5 w-5" />
            
          </button>
        </header>

        {!idCliente.trim() ? (
          <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
            Iniciá sesión con una cuenta vinculada para usar el catálogo y la lista de compradores.
          </p>
        ) : productos.length === 0 ? (
          <p className="rounded-xl border border-amber-100 bg-amber-50/80 p-4 text-sm text-amber-900">
            Necesitás <strong>productos en el catálogo</strong> de la cuenta para crear ventas manuales.
          </p>
        ) : compradoresConId.length === 0 ? (
          <p className="rounded-xl border border-amber-100 bg-amber-50/80 p-4 text-sm text-amber-900">
            Necesitás al menos un <strong>comprador</strong> registrado. El administrador de la cuenta los da de
            alta en <strong>Asignación y creación → Compradores</strong>.
          </p>
        ) : null}

        <div className="overflow-hidden rounded-xl border border-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="whitespace-nowrap px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    Venta
                  </th>
                  <th className="min-w-[120px] px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    Comprador
                  </th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    Productos
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
                    <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                      Cargando datos de cuenta…
                    </td>
                  </tr>
                ) : tabla.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                      No hay órdenes de venta. Usá &quot;Agregar venta manual&quot; para crear la primera.
                    </td>
                  </tr>
                ) : (
                  pagina.map((v) => (
                    <tr
                      key={v.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setDetalle(v)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setDetalle(v);
                        }
                      }}
                      className="cursor-pointer border-b border-slate-100 transition-colors hover:bg-emerald-50/70 focus-visible:bg-emerald-50/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-emerald-400"
                      aria-label={`Ver detalle de venta ${v.numero}`}
                    >
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-[13px] font-semibold text-slate-900">
                        {v.numero}
                      </td>
                      <td className="max-w-[160px] px-4 py-3 text-slate-800">
                        <span className="line-clamp-2 text-[13px]" title={v.compradorNombre}>
                          {v.compradorNombre || "—"}
                        </span>
                      </td>
                      <td
                        className="max-w-md px-4 py-3 text-slate-800"
                        title={productosResumen(v)}
                      >
                        <span className="line-clamp-2 text-[13px] font-medium">
                          {productosResumen(v)}
                        </span>
                      </td>
                      <td
                        className="px-4 py-3"
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      >
                        <div className="relative inline-flex max-w-full align-middle">
                          <select
                            aria-label={`Estado de la venta ${v.numero}`}
                            title="Cambiar estado"
                            value={v.estado}
                            onChange={(e) => handleEstado(v, e.target.value)}
                            className={`inline-flex max-w-[12rem] cursor-pointer truncate rounded-full border-0 py-0.5 pl-2.5 pr-7 text-left text-xs font-semibold shadow-none outline-none ring-0 focus-visible:ring-2 focus-visible:ring-emerald-400/50 [appearance:none] ${ordenCompraEstadoBadgeClass(v.estado)}`}
                          >
                            {opcionesEstadoSelect(v.estado).map((opt) => (
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
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">{v.fecha}</td>
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

      <VentaManualFormModal
        isOpen={ventaModalOpen}
        onClose={() => setVentaModalOpen(false)}
        productos={productos}
        compradores={compradores}
        onCreate={(draft) => {
          setVentas((prev) => {
            const nextNum = Math.max(0, ...prev.map((x) => x.numericId)) + 1;
            const nuevo: VentaEnCurso = {
              id: `local-${Date.now()}`,
              numero: `V-${String(nextNum).padStart(4, "0")}`,
              numericId: nextNum,
              compradorId: draft.compradorId,
              compradorNombre: draft.compradorNombre,
              fecha: draft.fecha,
              estado: draft.estado,
              lineItems: draft.lineItems,
            };
            return [nuevo, ...prev];
          });
          setPage(1);
        }}
      />

      {detalle ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="venta-detalle-titulo"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Cerrar"
            onClick={() => setDetalle(null)}
          />
          <div className="relative z-10 w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <h2 id="venta-detalle-titulo" className="text-lg font-bold text-slate-900">
              {detalle.numero}
            </h2>
            <p className="mt-2 text-sm text-slate-700">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Comprador</span>
              <br />
              <span className="font-medium text-slate-900">{detalle.compradorNombre || "—"}</span>
            </p>
            <p className="mt-2 text-xs text-slate-400">Fecha: {detalle.fecha}</p>
            <span
              className={`mt-3 inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${ordenCompraEstadoBadgeClass(detalle.estado)}`}
            >
              {detalle.estado}
            </span>
            <div className="mt-4 border-t border-slate-100 pt-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Productos</p>
              <ul className="mt-2 space-y-2 text-sm text-slate-800">
                {(detalle.lineItems ?? []).map((li, i) => (
                  <li
                    key={`${detalle.id}-${i}`}
                    className="flex justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2"
                  >
                    <span className="font-medium">{li.titleSnapshot}</span>
                    <span className="shrink-0 tabular-nums text-slate-600">× {li.cantidad}</span>
                  </li>
                ))}
              </ul>
            </div>
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
