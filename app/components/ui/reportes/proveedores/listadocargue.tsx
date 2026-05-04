"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { OrdenCompraService } from "@/app/services/ordenCompraService";
import { CatalogoService } from "@/app/services/catalogoService";
import type { OrdenCompra, OrdenCompraLineItem } from "@/app/types/ordenCompra";
import type { Catalogo } from "@/app/types/catalogo";
import { ordenCompraEstadoBadgeClass } from "@/app/types/ordenCompra";
import { kilosPedidoLineItem } from "@/app/lib/ordenCompraLineKgPedido";

const PAGE_SIZE = 10;

const numberFormatter = new Intl.NumberFormat("es-CO", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** Solo órdenes en estos estados aparecen en el inventario proveedor (reporte). */
const ESTADOS_OC_PROVEEDOR = new Set(["iniciado", "en curso", "transporte"]);

function normalizeEstado(s: string): string {
  return s.trim().toLowerCase();
}

function ordenEnEstadoProveedor(o: OrdenCompra): boolean {
  return ESTADOS_OC_PROVEEDOR.has(normalizeEstado(o.estado ?? ""));
}

/** Firestore / datos viejos pueden traer códigos como número u otro tipo. */
function strTrim(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

function shortLoteFromLine(li: OrdenCompraLineItem): string {
  const code = strTrim(li.codeSnapshot);
  if (code) return `L-${code}`;
  const sku = strTrim(li.skuSnapshot);
  if (sku) return `L-${sku}`;
  const id = strTrim(li.catalogoProductId);
  if (id.length >= 4) return `L-${id.slice(0, 4).toUpperCase()}`;
  return id ? `L-${id}` : "—";
}

function fechaIngresoLabel(o: OrdenCompra): string {
  const f = (o.fecha ?? "").trim();
  if (f) return f;
  if (o.createdAt && Number.isFinite(o.createdAt)) {
    return new Date(o.createdAt).toLocaleDateString("es-CO");
  }
  return "—";
}

export type FilaProveedorInventario = {
  id: string;
  rd: string;
  renglon: number;
  lote: string;
  descripcion: string;
  marca: string;
  embalaje: string;
  pesoUnitario: number | null;
  /** Peso pedido en kg (desde la línea o piezas × peso unitario del catálogo). */
  kilosActual: number;
  caducidad: string;
  fechaIngreso: string;
  llaveUnica: string;
  estado: string;
};

function filasFromOrdenes(
  ordenes: OrdenCompra[],
  catalogById: Map<string, Catalogo>,
): FilaProveedorInventario[] {
  const out: FilaProveedorInventario[] = [];
  for (const o of ordenes) {
    const oid = o.id ?? "";
    const items = o.lineItems ?? [];
    items.forEach((li, idx) => {
      const pid = strTrim(li.catalogoProductId);
      const cat = pid ? catalogById.get(pid) : undefined;
      const kilosActual = kilosPedidoLineItem(li);
      const cantRaw = Number(li.cantidad);
      const hasCantidad = Number.isFinite(cantRaw) && cantRaw > 0;

      let pesoUnit: number | null = null;
      if (hasCantidad && kilosActual > 0) {
        pesoUnit = kilosActual / cantRaw;
      } else if (cat?.weightValue != null && Number.isFinite(Number(cat.weightValue))) {
        const w = Number(cat.weightValue);
        if (w > 0) pesoUnit = w;
      }

      const marca = strTrim(o.proveedorNombre) || "—";
      const embalaje =
        (cat?.logisticService && String(cat.logisticService).trim()) ||
        (cat?.inventoryTracker && String(cat.inventoryTracker).trim()) ||
        "";

      out.push({
        id: `${oid}-${pid || "sin-id"}-${idx}`,
        rd: o.numero || "—",
        renglon: idx + 1,
        lote: shortLoteFromLine(li),
        descripcion: strTrim(li.titleSnapshot) || "—",
        marca,
        embalaje,
        pesoUnitario: pesoUnit,
        kilosActual,
        caducidad: "",
        fechaIngreso: fechaIngresoLabel(o),
        llaveUnica: `${oid}::${pid || "sin-id"}::${idx}`,
        estado: (o.estado ?? "").trim() || "—",
      });
    });
  }
  return out;
}

export default function ListadoCargue() {
  const { session, loading: authLoading } = useAuth();
  const idCliente = session?.clientId ?? "";
  const codeCuenta = session?.codeCuenta ?? "";

  const [ordenes, setOrdenes] = useState<OrdenCompra[]>([]);
  const [catalogMap, setCatalogMap] = useState<Map<string, Catalogo>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!idCliente.trim() || !codeCuenta.trim()) {
      setOrdenes([]);
      setCatalogMap(new Map());
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    let ocList: OrdenCompra[] = [];
    let cats: Catalogo[] = [];
    const emit = () => {
      const map = new Map<string, Catalogo>();
      for (const c of cats) {
        if (c.id) map.set(c.id, c);
      }
      setCatalogMap(map);
      setOrdenes(ocList.filter((o) => ordenEnEstadoProveedor(o)));
      setLoading(false);
    };
    const u1 = OrdenCompraService.subscribeByCodeCuenta(idCliente, codeCuenta, (list) => {
      ocList = list;
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

  const filas = useMemo(() => filasFromOrdenes(ordenes, catalogMap), [ordenes, catalogMap]);

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
    return (
      <p className="text-slate-500 text-sm py-8 text-center italic">Cargando sesión…</p>
    );
  }

  if (!idCliente.trim() || !codeCuenta.trim()) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
        Tu sesión no tiene cuenta vinculada. No se puede cargar el inventario proveedor.
      </div>
    );
  }

  return (
    <div className="border border-slate-100 rounded-2xl overflow-hidden  bg-white shadow-sm">
      <div className="bg-[#A8D5BA]/20 p-5 border-b border-slate-100">
        <h3 className="app-title uppercase tracking-tight">
          En inventario proveedores
        </h3>
        <p className="mt-1 text-xs text-slate-600">
          Misma vista para toda la cuenta: órdenes en <strong>Iniciado</strong>, <strong>En curso</strong> o{" "}
          <strong>Transporte</strong> (sin filtrar por bodega interna u externa).
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
        <table className="w-max min-w-full text-left border-separate border-spacing-0">
          <thead>
            <tr className="bg-white">
              <th className="whitespace-nowrap px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200">
                RD
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200">
                Renglón
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200">
                Lote
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200">
                Descripción
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200">
                Proveedor
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200">
                Embalaje
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200 text-right">
                Peso Unit.
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200 text-right">
                Kilos actual
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200">
                Caducidad
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200">
                Fecha ingreso
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200">
                Llave única
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200 text-center">
                Estado
              </th>
            </tr>
          </thead>
          <tbody className="text-slate-700 text-base">
            {loading ? (
              Array.from({ length: 4 }).map((_, idx) => (
                <tr key={`sk-${idx}`} className="animate-pulse">
                  {Array.from({ length: 12 }).map((__, i) => (
                    <td key={i} className="whitespace-nowrap px-4 py-4 border-b border-slate-100">
                      <div className="h-4 w-16 rounded bg-slate-200" />
                    </td>
                  ))}
                </tr>
              ))
            ) : null}

            {showEmpty ? (
              <tr>
                <td colSpan={12} className="px-4 py-8 text-center text-sm text-slate-500">
                  No hay líneas de órdenes de compra en Iniciado, En curso o Transporte para esta cuenta.
                </td>
              </tr>
            ) : null}

            {!loading && !showEmpty
              ? pageItems.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="whitespace-nowrap px-4 py-4 border-b border-slate-100 text-slate-700 tabular-nums">
                      {d.rd}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 border-b border-slate-100 text-slate-700 tabular-nums">
                      {d.renglon}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 border-b border-slate-100 font-bold text-slate-900">
                      {d.lote}
                    </td>
                    <td
                      className="whitespace-nowrap px-4 py-4 border-b border-slate-100 max-w-[20rem]"
                      title={d.descripcion}
                    >
                      <span className="inline-block rounded-lg bg-slate-100 px-3 py-1.5 font-semibold text-base text-slate-700 truncate max-w-full">
                        {d.descripcion}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 border-b border-slate-100 text-slate-700">
                      {d.marca || "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 border-b border-slate-100 text-slate-700">
                      {d.embalaje || "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 border-b border-slate-100 text-right tabular-nums">
                      {d.pesoUnitario !== null ? `${numberFormatter.format(d.pesoUnitario)} Kg` : "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 border-b border-slate-100 text-right font-bold text-slate-900 tabular-nums">
                      {`${numberFormatter.format(d.kilosActual)} Kg`}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 border-b border-slate-100 text-slate-700">
                      {d.caducidad || "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 border-b border-slate-100 text-slate-700">
                      {d.fechaIngreso}
                    </td>
                    <td
                      className="whitespace-nowrap px-4 py-4 border-b border-slate-100 text-slate-700 max-w-[10rem] truncate"
                      title={d.llaveUnica}
                    >
                      {d.llaveUnica}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 border-b border-slate-100 text-center">
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
            <span className="text-center text-base font-bold uppercase tracking-[0.2em] text-slate-500 sm:text-right sm:pt-1">
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
