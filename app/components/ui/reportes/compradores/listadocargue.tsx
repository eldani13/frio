"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { CatalogoService } from "@/app/services/catalogoService";
import { OrdenVentaService } from "@/app/services/ordenVentaService";
import { kgEsperadoLineaVentaEnViaje } from "@/app/services/viajeVentaTransporteService";
import type { Catalogo } from "@/app/types/catalogo";
import { ordenCompraEstadoBadgeClass } from "@/app/types/ordenCompra";
import type { VentaEnCurso, VentaEnCursoLineItem } from "@/app/types/ventaCuenta";

const PAGE_SIZE = 10;

const numberFormatter = new Intl.NumberFormat("es-CO", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** Solo ventas ya cerradas (custodío / entrega); el resto de estados no se listan acá. */
const ESTADOS_VENTA_LISTADO = new Set(["cerrado(ok)", "cerrado(no ok)"]);

function normalizeEstado(s: string): string {
  return s.trim().toLowerCase();
}

function ventaIncluidaEnListado(v: VentaEnCurso): boolean {
  return ESTADOS_VENTA_LISTADO.has(normalizeEstado(v.estado ?? ""));
}

function strTrim(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

function rdVenta(v: VentaEnCurso): string {
  const n = strTrim(v.numero);
  if (n) return n;
  const id = Number(v.numericId);
  if (Number.isFinite(id) && id > 0) return `V-${String(id).padStart(4, "0")}`;
  return strTrim(v.id) || "—";
}

function shortLoteVentaLine(li: VentaEnCursoLineItem): string {
  const id = strTrim(li.catalogoProductId);
  if (id.length >= 4) return `L-${id.slice(0, 4).toUpperCase()}`;
  return id ? `L-${id.slice(0, 8)}` : "—";
}

function fechaIngresoVenta(v: VentaEnCurso): string {
  const f = strTrim(v.fecha);
  if (f) return f;
  if (v.createdAt && Number.isFinite(v.createdAt)) {
    return new Date(v.createdAt).toLocaleDateString("es-CO");
  }
  return "—";
}

/** Mismas columnas que proveedor / transporte (reportes de cuenta). */
export type FilaVentaInventario = {
  id: string;
  rd: string;
  renglon: number;
  lote: string;
  descripcion: string;
  marca: string;
  embalaje: string;
  pesoUnitario: number | null;
  kilosActual: number;
  caducidad: string;
  fechaIngreso: string;
  llaveUnica: string;
  estado: string;
};

function filasDesdeVentas(ventas: VentaEnCurso[], catalogById: Map<string, Catalogo>, catalogos: Catalogo[]) {
  const out: FilaVentaInventario[] = [];
  for (const v of ventas) {
    if (!ventaIncluidaEnListado(v)) continue;
    const oid = v.id ?? "";
    const items = v.lineItems ?? [];
    items.forEach((li, idx) => {
      const pid = strTrim(li.catalogoProductId);
      const cat = pid ? catalogById.get(pid) : undefined;
      const kilosActual = kgEsperadoLineaVentaEnViaje(li, catalogos);
      const cantRaw = Number(li.cantidad);
      const hasCantidad = Number.isFinite(cantRaw) && cantRaw > 0;

      let pesoUnit: number | null = null;
      if (hasCantidad && kilosActual > 0) {
        pesoUnit = kilosActual / cantRaw;
      } else if (cat?.weightValue != null && Number.isFinite(Number(cat.weightValue))) {
        const w = Number(cat.weightValue);
        if (w > 0) pesoUnit = w;
      }

      const marca = strTrim(v.compradorNombre) || "—";
      const embalaje =
        (cat?.logisticService && String(cat.logisticService).trim()) ||
        (cat?.inventoryTracker && String(cat.inventoryTracker).trim()) ||
        "";

      out.push({
        id: `${oid}-${pid || "sin-id"}-${idx}`,
        rd: rdVenta(v),
        renglon: idx + 1,
        lote: shortLoteVentaLine(li),
        descripcion: strTrim(li.titleSnapshot) || "—",
        marca,
        embalaje,
        pesoUnitario: pesoUnit,
        kilosActual: Number.isFinite(kilosActual) ? kilosActual : 0,
        caducidad: "",
        fechaIngreso: fechaIngresoVenta(v),
        llaveUnica: `${oid}::${pid || "sin-id"}::${idx}`,
        estado: strTrim(v.estado) || "—",
      });
    });
  }
  return out;
}

export default function ListadoCargue() {
  const { session, loading: authLoading } = useAuth();
  const idCliente = session?.clientId ?? "";
  const codeCuenta = session?.codeCuenta ?? "";

  const [ventas, setVentas] = useState<VentaEnCurso[]>([]);
  const [catalogos, setCatalogos] = useState<Catalogo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const catalogById = useMemo(() => {
    const m = new Map<string, Catalogo>();
    for (const c of catalogos) {
      if (c.id) m.set(c.id, c);
    }
    return m;
  }, [catalogos]);

  useEffect(() => {
    if (!idCliente.trim() || !codeCuenta.trim()) {
      setVentas([]);
      setCatalogos([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const cc = codeCuenta.trim();
    let ventasRaw: VentaEnCurso[] = [];
    let cats: Catalogo[] = [];
    const emit = () => {
      setVentas(ventasRaw.filter((v) => String(v.codeCuenta ?? "").trim() === cc));
      setCatalogos(cats);
      setLoading(false);
    };
    const u1 = OrdenVentaService.subscribe(idCliente, (list) => {
      ventasRaw = list;
      emit();
    });
    const u2 = CatalogoService.subscribeByCodeCuenta(idCliente, codeCuenta, (list) => {
      cats = list;
      emit();
    });
    return () => {
      u1();
      u2();
    };
  }, [idCliente, codeCuenta]);

  useEffect(() => {
    setPage(1);
  }, [idCliente, codeCuenta]);

  const filas = useMemo(
    () => filasDesdeVentas(ventas, catalogById, catalogos),
    [ventas, catalogById, catalogos],
  );

  const pageCount = Math.max(1, Math.ceil(filas.length / PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, page), pageCount);
  const pageItems = useMemo(
    () => filas.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filas, currentPage],
  );

  const totalKgPedido = useMemo(() => {
    let kg = 0;
    for (const r of filas) {
      const n = Number.isFinite(r.kilosActual) ? r.kilosActual : 0;
      kg += n;
    }
    return kg;
  }, [filas]);

  const showEmpty = !loading && !error && filas.length === 0;

  if (authLoading) {
    return <p className="py-8 text-center text-sm italic text-slate-500">Cargando sesión…</p>;
  }

  if (!idCliente.trim() || !codeCuenta.trim()) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
        Tu sesión no tiene cuenta vinculada. No se puede cargar el inventario en venta.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white  shadow-sm">
      <div className="border-b border-slate-100 bg-[#A8D5BA]/20 p-5">
        <h3 className="app-title uppercase tracking-tight">En inventario venta</h3>
        <p className="mt-1 text-xs text-slate-600">
          Solo órdenes de venta en <strong>Cerrado (ok)</strong> o <strong>Cerrado (no ok)</strong>. Misma grilla que{" "}
          <strong>proveedor</strong>. La columna <strong>Proveedor</strong> muestra el nombre del{" "}
          <strong>comprador</strong> de cada orden.
          {filas.length > 0 ? (
            <span className="tabular-nums">
              {" "}
              · {filas.length} {filas.length === 1 ? "línea" : "líneas"} · Página {currentPage} de {pageCount}
            </span>
          ) : null}
        </p>
        {error ? <p className="mt-2 text-xs font-semibold text-rose-700">{error}</p> : null}
      </div>

      <div className="overflow-x-auto">
        <table className="w-max min-w-full border-separate border-spacing-0 text-left">
          <thead>
            <tr className="bg-white">
              <th className="whitespace-nowrap border-b border-slate-200 px-4 py-3 text-xs font-bold uppercase tracking-widest text-slate-400">
                RD
              </th>
              <th className="whitespace-nowrap border-b border-slate-200 px-4 py-3 text-xs font-bold uppercase tracking-widest text-slate-400">
                Renglón
              </th>
              <th className="whitespace-nowrap border-b border-slate-200 px-4 py-3 text-xs font-bold uppercase tracking-widest text-slate-400">
                Lote
              </th>
              <th className="whitespace-nowrap border-b border-slate-200 px-4 py-3 text-xs font-bold uppercase tracking-widest text-slate-400">
                Descripción
              </th>
              <th className="whitespace-nowrap border-b border-slate-200 px-4 py-3 text-xs font-bold uppercase tracking-widest text-slate-400">
                Proveedor
              </th>
              <th className="whitespace-nowrap border-b border-slate-200 px-4 py-3 text-xs font-bold uppercase tracking-widest text-slate-400">
                Embalaje
              </th>
              <th className="whitespace-nowrap border-b border-slate-200 px-4 py-3 text-right text-xs font-bold uppercase tracking-widest text-slate-400">
                Peso Unit.
              </th>
              <th className="whitespace-nowrap border-b border-slate-200 px-4 py-3 text-right text-xs font-bold uppercase tracking-widest text-slate-400">
                Kilos actual
              </th>
              <th className="whitespace-nowrap border-b border-slate-200 px-4 py-3 text-xs font-bold uppercase tracking-widest text-slate-400">
                Caducidad
              </th>
              <th className="whitespace-nowrap border-b border-slate-200 px-4 py-3 text-xs font-bold uppercase tracking-widest text-slate-400">
                Fecha ingreso
              </th>
              <th className="whitespace-nowrap border-b border-slate-200 px-4 py-3 text-xs font-bold uppercase tracking-widest text-slate-400">
                Llave única
              </th>
              <th className="whitespace-nowrap border-b border-slate-200 px-4 py-3 text-center text-xs font-bold uppercase tracking-widest text-slate-400">
                Estado
              </th>
            </tr>
          </thead>
          <tbody className="text-base text-slate-700">
            {loading ? (
              Array.from({ length: 4 }).map((_, idx) => (
                <tr key={`sk-${idx}`} className="animate-pulse">
                  {Array.from({ length: 12 }).map((__, i) => (
                    <td key={i} className="whitespace-nowrap border-b border-slate-100 px-4 py-4">
                      <div className="h-4 w-16 rounded bg-slate-200" />
                    </td>
                  ))}
                </tr>
              ))
            ) : null}

            {showEmpty ? (
              <tr>
                <td colSpan={12} className="px-4 py-8 text-center text-sm text-slate-500">
                  No hay líneas de ventas cerradas (ok o no ok) para esta cuenta.
                </td>
              </tr>
            ) : null}

            {!loading && !showEmpty
              ? pageItems.map((d) => (
                  <tr key={d.id} className="transition-colors hover:bg-slate-50/80">
                    <td className="whitespace-nowrap border-b border-slate-100 px-4 py-4 tabular-nums text-slate-700">
                      {d.rd}
                    </td>
                    <td className="whitespace-nowrap border-b border-slate-100 px-4 py-4 tabular-nums text-slate-700">
                      {d.renglon}
                    </td>
                    <td className="whitespace-nowrap border-b border-slate-100 px-4 py-4 font-bold text-slate-900">
                      {d.lote}
                    </td>
                    <td
                      className="max-w-[20rem] whitespace-nowrap border-b border-slate-100 px-4 py-4"
                      title={d.descripcion}
                    >
                      <span className="inline-block max-w-full truncate rounded-lg bg-slate-100 px-3 py-1.5 text-base font-semibold text-slate-700">
                        {d.descripcion}
                      </span>
                    </td>
                    <td className="whitespace-nowrap border-b border-slate-100 px-4 py-4 text-slate-700">
                      {d.marca || "—"}
                    </td>
                    <td className="whitespace-nowrap border-b border-slate-100 px-4 py-4 text-slate-700">
                      {d.embalaje || "—"}
                    </td>
                    <td className="whitespace-nowrap border-b border-slate-100 px-4 py-4 text-right tabular-nums">
                      {d.pesoUnitario !== null ? `${numberFormatter.format(d.pesoUnitario)} Kg` : "—"}
                    </td>
                    <td className="whitespace-nowrap border-b border-slate-100 px-4 py-4 text-right font-bold tabular-nums text-slate-900">
                      {`${numberFormatter.format(d.kilosActual)} Kg`}
                    </td>
                    <td className="whitespace-nowrap border-b border-slate-100 px-4 py-4 text-slate-700">
                      {d.caducidad || "—"}
                    </td>
                    <td className="whitespace-nowrap border-b border-slate-100 px-4 py-4 text-slate-700">
                      {d.fechaIngreso}
                    </td>
                    <td
                      className="max-w-[10rem] truncate whitespace-nowrap border-b border-slate-100 px-4 py-4 text-slate-700"
                      title={d.llaveUnica}
                    >
                      {d.llaveUnica}
                    </td>
                    <td className="whitespace-nowrap border-b border-slate-100 px-4 py-4 text-center">
                      <span
                        className={`inline-flex rounded-full border-0 px-2.5 py-0.5 text-xs font-semibold ${ordenCompraEstadoBadgeClass(d.estado)}`}
                      >
                        {d.estado}
                      </span>
                    </td>
                  </tr>
                ))
              : null}
          </tbody>
        </table>
      </div>

      {filas.length > 0 ? (
        <div
          className="shrink-0 border-t-2 border-[#A8D5BA]/50 bg-linear-to-r from-slate-50 via-white to-[#A8D5BA]/25 px-5 py-4"
          role="region"
          aria-label="Total de inventario"
        >
          <div className="flex flex-col items-stretch sm:flex-row sm:items-center sm:justify-end sm:gap-4">
            <span className="text-center text-base font-bold uppercase tracking-[0.2em] text-slate-500 sm:pt-1 sm:text-right">
              Total pedido (líneas mostradas)
            </span>
            <div className="mt-2 flex flex-col items-center gap-1 sm:mt-0 sm:items-end">
              <span className="inline-flex min-w-[10rem] items-center justify-center rounded-xl border border-[#A8D5BA]/60 bg-white px-5 py-2 text-right text-xl font-extrabold tracking-tight text-slate-900 shadow-sm tabular-nums sm:min-w-[12rem] sm:text-2xl">
                {`${totalKgPedido.toLocaleString("es-CO", { maximumFractionDigits: 3 })} kg`}
              </span>
            </div>
          </div>
        </div>
      ) : null}

      {filas.length > 0 ? (
        <div className="flex flex-col gap-3 border-t border-slate-100 bg-white px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs text-slate-500 tabular-nums">
            Mostrando {pageItems.length} de {filas.length} registros
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={loading || currentPage === 1}
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
              disabled={loading || currentPage === pageCount}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold uppercase tracking-wider shadow-sm hover:border-slate-300 disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
