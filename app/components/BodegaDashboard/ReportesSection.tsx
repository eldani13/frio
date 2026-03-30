"use client";
import React from "react";
import ProvidersPage from "@/app/proveedores/page";
import PlantasPage from "@/app/plantas/page";
import CompradoresPage from "@/app/compradores/page";
import CatalogosPage from "@/app/catalogos/page";
import CamionesPage from "@/app/camiones/page";
import ReportesPage from "@/app/reportes/page";
import AsignarBodegasPage from "@/app/asignarbodegas/page";
import { OrdenCompraFormModal } from "@/app/components/ui/ordenes/OrdenCompraFormModal";
import { useAuth } from "@/app/context/AuthContext";
import { CatalogoService } from "@/app/services/catalogoService";
import { OrdenCompraService } from "@/app/services/ordenCompraService";
import { ProviderService } from "@/app/services/providerService";
import type { Catalogo } from "@/app/types/catalogo";
import type { OrdenCompra } from "@/app/types/ordenCompra";
import type { Provider } from "@/app/types/provider";

import { MdAssignment, MdBusiness, MdFactory, MdShoppingCart } from "react-icons/md";
import { BiBarChartAlt2, BiCollection, BiUserCheck } from "react-icons/bi";
import {
  HiOutlineArrowLeft,
  HiOutlineArrowRight,
  HiOutlinePlus,
  HiOutlineTruck,
} from "react-icons/hi2";

interface ReportesSectionProps {
  isCliente?: boolean;
  menuResetNonce?: number;
  setReportDetailModal: (modal: null) => void;
}

function resumenOrdenCatalogo(o: OrdenCompra): string {
  return (o.lineItems ?? [])
    .map((li) => `${li.titleSnapshot} ×${li.cantidad}`)
    .join(" · ");
}

const ReportesSection: React.FC<ReportesSectionProps> = ({
  isCliente = false,
  menuResetNonce,
  setReportDetailModal,
}) => {
  const { session } = useAuth();
  const idCliente = session?.clientId ?? "";
  const codeCuenta = session?.codeCuenta ?? "";

  const [viewMode, setViewMode] = React.useState<
    | "reporte"
    | "catalogo"
    | "asignaciones"
    | "ordenesCompra"
    | "proveedores"
    | "plantas"
    | "compradores"
    | "asignarBodegasInterna"
    | "asignarBodegasExterna"
    | "camiones"
    | null
  >(isCliente ? null : "reporte");

  const [ordenesCompra, setOrdenesCompra] = React.useState<OrdenCompra[]>([]);
  const [catalogosOrden, setCatalogosOrden] = React.useState<Catalogo[]>([]);
  const [proveedoresOrden, setProveedoresOrden] = React.useState<Provider[]>([]);
  const [ordenesDataLoading, setOrdenesDataLoading] = React.useState(false);
  const [ordenCompraModalOpen, setOrdenCompraModalOpen] = React.useState(false);

  // Resetear vista cuando cambia el rol de cliente
  React.useEffect(() => {
    setViewMode(isCliente ? null : "reporte");
  }, [isCliente]);

  // Manejar el reset desde el Header
  const prevMenuNonce = React.useRef<number | null>(null);
  React.useEffect(() => {
    if (!isCliente || menuResetNonce === undefined) return;
    if (prevMenuNonce.current === null) {
      prevMenuNonce.current = menuResetNonce;
      return;
    }
    if (prevMenuNonce.current === menuResetNonce) return;
    
    prevMenuNonce.current = menuResetNonce;
    setViewMode(null);
    setReportDetailModal(null);
    setOrdenCompraModalOpen(false);
  }, [isCliente, menuResetNonce, setReportDetailModal]);

  React.useEffect(() => {
    if (!isCliente || viewMode !== "ordenesCompra") return;
    if (!idCliente.trim()) {
      setOrdenesCompra([]);
      setCatalogosOrden([]);
      setProveedoresOrden([]);
      return;
    }
    let cancelled = false;
    setOrdenesDataLoading(true);
    void Promise.all([
      OrdenCompraService.getAll(idCliente, codeCuenta),
      CatalogoService.getAll(idCliente, codeCuenta),
      ProviderService.getAll(idCliente, codeCuenta),
    ])
      .then(([ordenes, cats, provs]) => {
        if (cancelled) return;
        setOrdenesCompra(ordenes);
        setCatalogosOrden(cats);
        setProveedoresOrden(provs);
      })
      .catch(() => {
        if (!cancelled) {
          setOrdenesCompra([]);
          setCatalogosOrden([]);
          setProveedoresOrden([]);
        }
      })
      .finally(() => {
        if (!cancelled) setOrdenesDataLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isCliente, viewMode, idCliente, codeCuenta]);

  const reloadOrdenesCompra = React.useCallback(() => {
    if (!idCliente.trim()) return;
    void OrdenCompraService.getAll(idCliente, codeCuenta).then(setOrdenesCompra);
  }, [idCliente, codeCuenta]);

  // Menú principal cliente: Asignaciones, Catálogo, Reportes, Órdenes de compra
  if (isCliente && viewMode === null) {
    return (
      <section className="p-4 sm:p-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
           {/* BOTÓN ASIGNACIONES */}
           <button
            type="button"
            onClick={() => setViewMode("asignaciones")}
            className="group relative flex flex-col items-center justify-center gap-4 rounded-[2rem] bg-gradient-to-br from-[#d1ede0] to-[#b0d6c3] p-10 shadow-lg shadow-emerald-100/50 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-emerald-200 active:scale-95"
          >
            <span className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/60 text-emerald-700 shadow-inner group-hover:scale-110 transition-transform duration-300">
              <BiUserCheck size={40} />
            </span>
            <div className="text-center">
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">Asignacion y Creacion</h3>              
            </div>
          </button>       

          {/* BOTÓN CATÁLOGO */}
          <button
            type="button"
            onClick={() => setViewMode("catalogo")}
            className="group relative flex flex-col items-center justify-center gap-4 rounded-[2rem] bg-gradient-to-br from-[#fdf6d8] to-[#f8edb1] p-10 shadow-lg shadow-yellow-100/50 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-yellow-200 active:scale-95"
          >
            <span className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/60 text-yellow-700 shadow-inner group-hover:scale-110 transition-transform duration-300">
              <BiCollection size={40} />
            </span>
            <div className="text-center">
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">Catálogo</h3>             
            </div>
          </button>

          {/* BOTÓN REPORTES */}
          <button
            type="button"
            onClick={() => setViewMode("reporte")}
            className="group relative flex flex-col items-center justify-center gap-4 rounded-[2rem] bg-gradient-to-br from-[#d0e1fd] to-[#b8d1f6] p-10 shadow-lg shadow-blue-100/50 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-blue-200 active:scale-95"
          >
            <span className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/60 text-blue-700 shadow-inner group-hover:scale-110 transition-transform duration-300">
              <BiBarChartAlt2 size={40} />
            </span>
            <div className="text-center">
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">Reportes</h3>              
            </div>
          </button>

          {/* BOTÓN ÓRDENES DE COMPRA */}
          <button
            type="button"
            onClick={() => setViewMode("ordenesCompra")}
            className="group relative flex flex-col items-center justify-center gap-4 rounded-[2rem] bg-gradient-to-br from-[#ebe4f5] to-[#d4c4eb] p-10 shadow-lg shadow-violet-100/50 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-violet-200/80 active:scale-95"
          >
            <span className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/60 text-violet-800 shadow-inner group-hover:scale-110 transition-transform duration-300">
              <MdAssignment size={40} />
            </span>
            <div className="text-center">
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">Órdenes de compra</h3>
            </div>
          </button>

        </div>
      </section>
    );
  }

  // Submenú Asignaciones (cliente): Creación vs Asignaciones
  if (isCliente && viewMode === "asignaciones") {
    return (
      <section className="rounded-2xl bg-white p-8 shadow-sm border border-slate-200">
        <div className="flex flex-col w-full max-w-4xl mx-auto px-4 gap-4">
          <button
            type="button"
            onClick={() => setViewMode(null)}
            className="self-start flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <HiOutlineArrowLeft size={18} />
            Volver al menú
          </button>

          <div className="flex flex-col gap-10">
            <div className="flex flex-col gap-3">
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 pl-1">
                Creación
              </h2>
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => setViewMode("proveedores")}
                  className="group w-full rounded-2xl bg-[#e2d5f3] p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md flex items-center justify-between cursor-pointer active:scale-95"
                >
                  <div className="flex items-center gap-4">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/50 text-slate-800 shadow-sm">
                      <MdBusiness size={24} />
                    </span>
                    <p className="text-lg font-bold text-slate-900">Proveedores</p>
                  </div>
                  <HiOutlineArrowRight size={18} className="text-slate-500 group-hover:translate-x-1 transition-transform" />
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode("compradores")}
                  className="group w-full rounded-2xl bg-[#d1f2fb] p-4 transition-all hover:-translate-y-0.5 hover:shadow-md flex items-center justify-between cursor-pointer active:scale-95"
                >
                  <div className="flex items-center gap-4">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/40 text-slate-800 shadow-sm">
                      <MdShoppingCart size={24} />
                    </span>
                    <p className="text-lg font-bold text-slate-900">Compradores</p>
                  </div>
                  <HiOutlineArrowRight size={20} className="text-slate-500 group-hover:translate-x-1 transition-transform" />
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode("camiones")}
                  className="group w-full rounded-2xl bg-[#d1f2fb] p-4 transition-all hover:-translate-y-0.5 hover:shadow-md flex items-center justify-between cursor-pointer active:scale-95"
                >
                  <div className="flex items-center gap-4">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/40 text-slate-800 shadow-sm">
                      <HiOutlineTruck size={24} />
                    </span>
                    <p className="text-lg font-bold text-slate-900">Camiones</p>
                  </div>
                  <HiOutlineArrowRight size={20} className="text-slate-500 group-hover:translate-x-1 transition-transform" />
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode("plantas")}
                  className="group w-full rounded-2xl bg-[#e2d5f3] p-4 transition-all hover:-translate-y-0.5 hover:shadow-md flex items-center justify-between cursor-pointer active:scale-95"
                >
                  <div className="flex items-center gap-4">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/40 text-slate-800 shadow-sm">
                      <MdFactory size={24} />
                    </span>
                    <p className="text-lg font-bold text-slate-900">Plantas</p>
                  </div>
                  <HiOutlineArrowRight size={20} className="text-slate-500 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200 pt-10">
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 pl-1">
                Asignaciones
              </h2>
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => setViewMode("asignarBodegasInterna")}
                  className="group w-full rounded-2xl bg-[#b0d6c3] p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md flex items-center justify-between cursor-pointer active:scale-95"
                >
                  <div className="flex items-center gap-4">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/50 text-slate-800 shadow-sm">
                      <BiUserCheck size={24} />
                    </span>
                    <p className="text-lg font-bold text-slate-900">Bodega interna</p>
                  </div>
                  <HiOutlineArrowRight size={18} className="text-slate-500 group-hover:translate-x-1 transition-transform" />
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode("asignarBodegasExterna")}
                  className="group w-full rounded-2xl bg-[#b0d6c3] p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md flex items-center justify-between cursor-pointer active:scale-95"
                >
                  <div className="flex items-center gap-4">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/50 text-slate-800 shadow-sm">
                      <BiUserCheck size={24} />
                    </span>
                    <p className="text-lg font-bold text-slate-900">Bodega externa</p>
                  </div>
                  <HiOutlineArrowRight size={18} className="text-slate-500 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Vista Órdenes de Compra (cliente)
  if (isCliente && viewMode === "ordenesCompra") {
    return (
      <section className="rounded-2xl bg-white p-6 sm:p-8 shadow-sm border border-slate-200">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
          <button
            type="button"
            onClick={() => {
              setOrdenCompraModalOpen(false);
              setViewMode(null);
            }}
            className="self-start flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <HiOutlineArrowLeft size={18} />
            Volver al menú
          </button>

          <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="rounded-2xl bg-[#e8dff5] p-3 text-violet-900">
                <MdAssignment size={28} />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
                  Órdenes de Compras
                </h1>
                <p className="text-sm text-slate-500">
                  Cada orden usa productos de tu catálogo y un proveedor registrado.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOrdenCompraModalOpen(true)}
              disabled={!idCliente.trim() || proveedoresOrden.length === 0 || catalogosOrden.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-[10px] bg-[#A8D5BA] px-5 py-2.5 text-sm font-semibold text-[#2D5A3F] shadow-sm transition hover:bg-[#97c4a9] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
            >
              <HiOutlinePlus strokeWidth={2.5} className="h-5 w-5" />
              Agregar orden de compra
            </button>
          </header>

          {!idCliente.trim() ? (
            <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
              Iniciá sesión como cliente para ver y crear órdenes de compra.
            </p>
          ) : proveedoresOrden.length === 0 || catalogosOrden.length === 0 ? (
            <p className="rounded-xl border border-amber-100 bg-amber-50/80 p-4 text-sm text-amber-900">
              Necesitás al menos un <strong>proveedor</strong> (Asignaciones → Proveedores) y productos en el{" "}
              <strong>catálogo</strong> para armar órdenes vinculadas al catálogo.
            </p>
          ) : null}

          <div className="overflow-hidden rounded-xl border border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-4 py-3 font-bold uppercase tracking-wide text-[11px] text-slate-500">
                      Nº OC
                    </th>
                    <th className="px-4 py-3 font-bold uppercase tracking-wide text-[11px] text-slate-500">
                      Proveedor
                    </th>
                    <th className="px-4 py-3 font-bold uppercase tracking-wide text-[11px] text-slate-500">
                      Fecha
                    </th>
                    <th className="px-4 py-3 font-bold uppercase tracking-wide text-[11px] text-slate-500">
                      Productos (catálogo)
                    </th>
                    <th className="px-4 py-3 font-bold uppercase tracking-wide text-[11px] text-slate-500">
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ordenesDataLoading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                        Cargando órdenes…
                      </td>
                    </tr>
                  ) : ordenesCompra.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                        No hay órdenes registradas. Usá &quot;Agregar orden de compra&quot; para crear la
                        primera (con líneas del catálogo).
                      </td>
                    </tr>
                  ) : (
                    ordenesCompra.map((oc) => (
                      <tr
                        key={oc.id ?? oc.numero}
                        className="border-b border-slate-100 transition-colors hover:bg-slate-50/80"
                      >
                        <td className="px-4 py-3 font-semibold text-slate-900">{oc.numero}</td>
                        <td className="px-4 py-3 text-slate-700">{oc.proveedorNombre}</td>
                        <td className="px-4 py-3 text-slate-600">{oc.fecha}</td>
                        <td
                          className="max-w-md px-4 py-3 text-slate-700"
                          title={resumenOrdenCatalogo(oc)}
                        >
                          <span className="line-clamp-2 text-[13px]">{resumenOrdenCatalogo(oc) || "—"}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              oc.estado === "Terminado"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-sky-100 text-sky-900"
                            }`}
                          >
                            {oc.estado}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <OrdenCompraFormModal
          isOpen={ordenCompraModalOpen}
          onClose={() => setOrdenCompraModalOpen(false)}
          idCliente={idCliente}
          codeCuenta={codeCuenta}
          productos={catalogosOrden}
          proveedores={proveedoresOrden}
          onSuccess={reloadOrdenesCompra}
        />
      </section>
    );
  }

  // Renderizado de las Sub-páginas seleccionadas
  return (
    <section className="rounded-2xl bg-white p-0 shadow-sm">
        <div className="text-sm text-slate-600">
          {viewMode === "reporte" && <ReportesPage />}
          {viewMode === "catalogo" && <CatalogosPage />}
          {viewMode === "proveedores" && <ProvidersPage />}
          {viewMode === "plantas" && <PlantasPage />}
          {viewMode === "compradores" && <CompradoresPage />}
          {viewMode === "camiones" && <CamionesPage />}
          {viewMode === "asignarBodegasInterna" && (<AsignarBodegasPage estado="interna" /> )}
          {viewMode === "asignarBodegasExterna" && (<AsignarBodegasPage estado="externa" /> )}
        </div>
    </section>
  );
};

export default ReportesSection;