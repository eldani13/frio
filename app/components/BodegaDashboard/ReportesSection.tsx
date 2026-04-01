"use client";
import React from "react";
import ProvidersPage from "@/app/proveedores/page";
import CompradoresPage from "@/app/compradores/page";
import CatalogosPage from "@/app/catalogos/page";
import CamionesPage from "@/app/camiones/page";
import ReportesPage from "@/app/reportes/page";
import AsignarBodegasPage from "@/app/asignarbodegas/page";
import AdminBodegaReportes from "@/app/components/BodegaDashboard/AdminBodegaReportes";
import { CuentaOperadoresSection } from "@/app/components/BodegaDashboard/CuentaOperadoresSection";
import type { Box, Client, Slot } from "@/app/interfaces/bodega";
import { OrdenCompraFormModal } from "@/app/components/ui/ordenes/OrdenCompraFormModal";
import { OrdenCompraDetalleModal } from "@/app/components/ui/ordenes/OrdenCompraDetalleModal";
import { SolicitudCompraFormModal } from "@/app/components/ui/ordenes/SolicitudCompraFormModal";
import { SolicitudDetalleModal } from "@/app/components/ui/ordenes/SolicitudDetalleModal";
import { useAuth } from "@/app/context/AuthContext";
import { CatalogoService } from "@/app/services/catalogoService";
import { OrdenCompraService } from "@/app/services/ordenCompraService";
import { SolicitudCompraService } from "@/app/services/solicitudCompraService";
import { ProviderService } from "@/app/services/providerService";
import type { Catalogo } from "@/app/types/catalogo";
import type { OrdenCompra } from "@/app/types/ordenCompra";
import type { SolicitudCompra } from "@/app/types/solicitudCompra";
import type { Provider } from "@/app/types/provider";

import { MdAssignment, MdBusiness, MdShoppingCart } from "react-icons/md";
import { BiBarChartAlt2, BiCollection, BiUserCheck } from "react-icons/bi";
import {
  HiOutlineArrowLeft,
  HiOutlineArrowRight,
  HiOutlinePlus,
  HiOutlineTruck,
  HiOutlineUsers,
} from "react-icons/hi2";

interface ReportesSectionProps {
  isCliente?: boolean;
  menuResetNonce?: number;
  /** Reservado para reset de vista cliente; sin uso en la vista admin de bodega. */
  setReportDetailModal?: (modal: null) => void;
  inboundBoxes?: Box[];
  outboundBoxes?: Box[];
  dispatchedBoxes?: Box[];
  slots?: Slot[];
  clients?: Client[];
  sortByPosition?: <T extends { position: number }>(items: T[]) => T[];
}

function nombresProductosOrden(o: OrdenCompra): string {
  const names = (o.lineItems ?? []).map((li) => li.titleSnapshot).filter(Boolean);
  return names.length ? names.join(" · ") : "—";
}

function nombresProductosSolicitud(s: SolicitudCompra): string {
  const names = (s.lineItems ?? []).map((li) => li.titleSnapshot).filter(Boolean);
  return names.length ? names.join(" · ") : "—";
}

const ReportesSection: React.FC<ReportesSectionProps> = ({
  isCliente = false,
  menuResetNonce,
  setReportDetailModal,
  inboundBoxes = [],
  outboundBoxes = [],
  dispatchedBoxes = [],
  slots = [],
  clients = [],
  sortByPosition = (items) => [...items].sort((a, b) => a.position - b.position),
}) => {
  const { session } = useAuth();
  const idCliente = session?.clientId ?? "";
  const codeCuenta = session?.codeCuenta ?? "";
  const esOperadorCuentas = session?.role === "operadorCuentas";

  const [viewMode, setViewMode] = React.useState<
    | "reporte"
    | "catalogo"
    | "asignaciones"
    | "usuarios"
    | "ordenesCompra"
    | "proveedorHubOperador"
    | "realizarSolicitudOperador"
    | "proveedores"
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
  const [solicitudModalOpen, setSolicitudModalOpen] = React.useState(false);
  const [ordenDetalle, setOrdenDetalle] = React.useState<OrdenCompra | null>(null);
  const [solicitudesCompra, setSolicitudesCompra] = React.useState<SolicitudCompra[]>([]);
  const [solicitudDetalle, setSolicitudDetalle] = React.useState<SolicitudCompra | null>(null);

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
    setReportDetailModal?.(null);
    setOrdenCompraModalOpen(false);
    setSolicitudModalOpen(false);
    setOrdenDetalle(null);
    setSolicitudDetalle(null);
  }, [isCliente, menuResetNonce, setReportDetailModal]);

  React.useEffect(() => {
    const vistaOrdenes = viewMode === "ordenesCompra";
    const vistaSolicitudes = viewMode === "realizarSolicitudOperador";
    if (!isCliente || (!vistaOrdenes && !vistaSolicitudes)) return;
    if (!idCliente.trim()) {
      setOrdenesCompra([]);
      setSolicitudesCompra([]);
      setCatalogosOrden([]);
      setProveedoresOrden([]);
      return;
    }
    let cancelled = false;
    setOrdenesDataLoading(true);
    const ordenesP = vistaOrdenes
      ? OrdenCompraService.getAll(idCliente, codeCuenta)
      : Promise.resolve([] as OrdenCompra[]);
    const solicitudesP = vistaSolicitudes
      ? SolicitudCompraService.getAll(idCliente, codeCuenta)
      : Promise.resolve([] as SolicitudCompra[]);
    void Promise.all([
      ordenesP,
      solicitudesP,
      CatalogoService.getAll(idCliente, codeCuenta),
      ProviderService.getAll(idCliente, codeCuenta),
    ])
      .then(([ordenes, solicitudes, cats, provs]) => {
        if (cancelled) return;
        if (vistaOrdenes) setOrdenesCompra(ordenes);
        else setOrdenesCompra([]);
        if (vistaSolicitudes) setSolicitudesCompra(solicitudes);
        else setSolicitudesCompra([]);
        setCatalogosOrden(cats);
        setProveedoresOrden(provs);
      })
      .catch(() => {
        if (!cancelled) {
          setOrdenesCompra([]);
          setSolicitudesCompra([]);
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

  const reloadSolicitudesCompra = React.useCallback(() => {
    if (!idCliente.trim()) return;
    void SolicitudCompraService.getAll(idCliente, codeCuenta).then(setSolicitudesCompra);
  }, [idCliente, codeCuenta]);

  // Menú cliente (administrador de cuentas): paleta alineada a diseño de referencia
  const cuentaMenuText = "text-[#1A2B48]";
  const cuentaMenuTile =
    "group flex min-h-[200px] flex-col items-center justify-center gap-5 rounded-[24px] border border-white/60 px-6 py-8 text-center transition-all duration-300 hover:-translate-y-1 active:scale-[0.98] sm:min-h-0 sm:aspect-square sm:p-8";
  const cuentaMenuIconWrap =
    "flex h-[4.75rem] w-[4.75rem] shrink-0 items-center justify-center rounded-2xl bg-white/80 shadow-[0_2px_14px_rgba(26,43,72,0.08)] ring-1 ring-[#1A2B48]/[0.06] backdrop-blur-[2px] transition-transform duration-300 group-hover:scale-[1.04]";

  if (isCliente && viewMode === null) {
    if (esOperadorCuentas) {
      return (
        <section className="p-4 sm:p-8">
          <div className="mx-auto grid max-w-6xl grid-cols-1 justify-items-center gap-4">
            <button
              type="button"
              onClick={() => setViewMode("proveedorHubOperador")}
              style={{
                backgroundColor: "#e2d5f3",
                boxShadow: "0 14px 40px -10px rgba(106, 13, 173, 0.26)",
              }}
              className={`${cuentaMenuTile} w-full max-w-sm hover:shadow-[0_20px_48px_-12px_rgba(106,13,173,0.3)]`}
            >
              <span className={cuentaMenuIconWrap}>
                <MdBusiness size={38} className="text-[#6A0DAD]" aria-hidden />
              </span>
              <h3 className={`max-w-[13rem] text-lg font-bold leading-snug tracking-tight sm:text-xl ${cuentaMenuText}`}>
                Proveedor
              </h3>
            </button>
          </div>
        </section>
      );
    }

    return (
      <section className="p-4 sm:p-8">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
          <button
            type="button"
            onClick={() => setViewMode("asignaciones")}
            style={{
              backgroundColor: "#C2E3CD",
              boxShadow: "0 14px 40px -10px rgba(0, 109, 62, 0.28)",
            }}
            className={`${cuentaMenuTile} hover:shadow-[0_20px_48px_-12px_rgba(0,109,62,0.32)]`}
          >
            <span className={cuentaMenuIconWrap}>
              <BiUserCheck size={38} className="text-[#006D3E]" aria-hidden />
            </span>
            <h3 className={`max-w-[13rem] text-lg font-bold leading-snug tracking-tight sm:text-xl ${cuentaMenuText}`}>
              Asignación y creación
            </h3>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("catalogo")}
            style={{
              backgroundColor: "#FEF6CD",
              boxShadow: "0 14px 40px -10px rgba(133, 91, 17, 0.28)",
            }}
            className={`${cuentaMenuTile} hover:shadow-[0_20px_48px_-12px_rgba(133,91,17,0.3)]`}
          >
            <span className={cuentaMenuIconWrap}>
              <BiCollection size={38} className="text-[#855B11]" aria-hidden />
            </span>
            <h3 className={`max-w-[13rem] text-lg font-bold leading-snug tracking-tight sm:text-xl ${cuentaMenuText}`}>
              Catálogo
            </h3>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("reporte")}
            style={{
              backgroundColor: "#D2E0FB",
              boxShadow: "0 14px 40px -10px rgba(0, 71, 171, 0.26)",
            }}
            className={`${cuentaMenuTile} hover:shadow-[0_20px_48px_-12px_rgba(0,71,171,0.3)]`}
          >
            <span className={cuentaMenuIconWrap}>
              <BiBarChartAlt2 size={38} className="text-[#0047AB]" aria-hidden />
            </span>
            <h3 className={`max-w-[13rem] text-lg font-bold leading-snug tracking-tight sm:text-xl ${cuentaMenuText}`}>
              Reportes
            </h3>
          </button>
        </div>
      </section>
    );
  }

  // Operador: submenú bajo Proveedor (misma cuenta / clientId que el administrador)
  if (isCliente && esOperadorCuentas && viewMode === "proveedorHubOperador") {
    return (
      <section className="rounded-2xl bg-white p-8 shadow-sm border border-slate-200">
        <div className="flex flex-col w-full max-w-4xl mx-auto px-4 gap-4">
          <button
            type="button"
            onClick={() => setViewMode(null)}
            className="self-start flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <HiOutlineArrowLeft size={18} />
            Volver
          </button>

          <div className="flex flex-col gap-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 pl-1">
              Proveedor
            </h2>
            <p className="pl-1 text-sm text-slate-600">
              Usás los mismos datos de la cuenta que tu administrador (proveedores, catálogo y órdenes).
            </p>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => setViewMode("realizarSolicitudOperador")}
                className="group w-full rounded-2xl bg-[#cffafe] p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md flex items-center justify-between cursor-pointer active:scale-95 border border-cyan-100/80"
              >
                <div className="flex items-center gap-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/70 text-cyan-800 shadow-sm">
                    <HiOutlinePlus strokeWidth={2.5} size={24} />
                  </span>
                  <p className="text-lg font-bold text-slate-900">Realizar solicitud</p>
                </div>
                <HiOutlineArrowRight size={18} className="text-slate-500 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                type="button"
                onClick={() => setViewMode("ordenesCompra")}
                className="group w-full rounded-2xl bg-[#e3d2f1] p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md flex items-center justify-between cursor-pointer active:scale-95"
              >
                <div className="flex items-center gap-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/50 text-violet-900 shadow-sm">
                    <MdAssignment size={24} />
                  </span>
                  <p className="text-lg font-bold text-slate-900">Órdenes de compra</p>
                </div>
                <HiOutlineArrowRight size={18} className="text-slate-500 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Usuarios → operadores de cuenta (tabla + alta; solo el rol cliente crea)
  if (isCliente && viewMode === "usuarios") {
    return (
      <section className="rounded-2xl bg-white p-8 shadow-sm border border-slate-200">
        <div className="flex flex-col w-full max-w-4xl mx-auto px-4 gap-4">
          <button
            type="button"
            onClick={() => setViewMode("asignaciones")}
            className="self-start flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <HiOutlineArrowLeft size={18} />
            Volver
          </button>
          <CuentaOperadoresSection />
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

                {/* Plantas: oculto temporalmente. Para volver a mostrar: importar PlantasPage y MdFactory,
                    añadir "plantas" al union de viewMode, este botón y {viewMode === "plantas" && <PlantasPage />}. */}

                {!esOperadorCuentas ? (
                  <button
                    type="button"
                    onClick={() => setViewMode("ordenesCompra")}
                    className="group w-full rounded-2xl bg-[#e3d2f1] p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md flex items-center justify-between cursor-pointer active:scale-95"
                  >
                    <div className="flex items-center gap-4">
                      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/50 text-violet-900 shadow-sm">
                        <MdAssignment size={24} />
                      </span>
                      <p className="text-lg font-bold text-slate-900">Órdenes de compra</p>
                    </div>
                    <HiOutlineArrowRight size={18} className="text-slate-500 group-hover:translate-x-1 transition-transform" />
                  </button>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200 pt-10">
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 pl-1">
                Asignaciones
              </h2>
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => setViewMode("usuarios")}
                  className="group w-full rounded-2xl bg-[#cffafe] p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md flex items-center justify-between cursor-pointer active:scale-95 border border-cyan-100/80"
                >
                  <div className="flex items-center gap-4">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/70 text-cyan-800 shadow-sm">
                      <HiOutlineUsers size={24} />
                    </span>
                    <p className="text-lg font-bold text-slate-900">Usuarios</p>
                  </div>
                  <HiOutlineArrowRight size={18} className="text-slate-500 group-hover:translate-x-1 transition-transform" />
                </button>

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

  // Operador: nueva solicitud (misma cuenta que el administrador)
  if (isCliente && esOperadorCuentas && viewMode === "realizarSolicitudOperador") {
    return (
      <section className="rounded-2xl bg-white p-6 sm:p-8 shadow-sm border border-slate-200">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
          <button
            type="button"
            onClick={() => {
              setSolicitudModalOpen(false);
              setSolicitudDetalle(null);
              setViewMode("proveedorHubOperador");
            }}
            className="self-start flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <HiOutlineArrowLeft size={18} />
            Volver
          </button>

          <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="rounded-2xl bg-cyan-100 p-3 text-cyan-900">
                <HiOutlinePlus strokeWidth={2.5} className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
                  Realizar solicitud
                </h1>
                <p className="text-sm text-slate-500">
                  Registrá solicitudes con peso por producto; se guardan aparte de las órdenes de compra.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSolicitudModalOpen(true)}
              disabled={!idCliente.trim() || proveedoresOrden.length === 0 || catalogosOrden.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-[10px] bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-cyan-700 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
            >
              <HiOutlinePlus strokeWidth={2.5} className="h-5 w-5" />
              Nueva solicitud
            </button>
          </header>

          {!idCliente.trim() ? (
            <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
              No hay cuenta vinculada a tu usuario. Contactá al administrador de la cuenta.
            </p>
          ) : proveedoresOrden.length === 0 || catalogosOrden.length === 0 ? (
            <p className="rounded-xl border border-amber-100 bg-amber-50/80 p-4 text-sm text-amber-900">
              Tu administrador de cuenta debe registrar al menos un <strong>proveedor</strong> y productos en el{" "}
              <strong>catálogo</strong> (Asignación y creación) para poder armar solicitudes.
            </p>
          ) : null}

          {idCliente.trim() && proveedoresOrden.length > 0 && catalogosOrden.length > 0 ? (
            <div className="overflow-hidden rounded-xl border border-cyan-100">
              <p className="border-b border-cyan-100 bg-cyan-50/60 px-4 py-2 text-xs font-semibold text-cyan-900">
                Tus solicitudes
              </p>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="whitespace-nowrap px-4 py-3 font-bold uppercase tracking-wide text-[11px] text-slate-500">
                        Solicitud
                      </th>
                      <th className="min-w-[120px] px-4 py-3 font-bold uppercase tracking-wide text-[11px] text-slate-500">
                        Proveedor
                      </th>
                      <th className="px-4 py-3 font-bold uppercase tracking-wide text-[11px] text-slate-500">
                        Productos
                      </th>
                      <th className="px-4 py-3 font-bold uppercase tracking-wide text-[11px] text-slate-500">
                        Estado
                      </th>
                      <th className="whitespace-nowrap px-4 py-3 font-bold uppercase tracking-wide text-[11px] text-slate-500">
                        Fecha
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {ordenesDataLoading ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                          Cargando solicitudes…
                        </td>
                      </tr>
                    ) : solicitudesCompra.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                          No hay solicitudes. Usá &quot;Nueva solicitud&quot; para crear la primera.
                        </td>
                      </tr>
                    ) : (
                      solicitudesCompra.map((sol) => (
                        <tr
                          key={sol.id ?? sol.numero}
                          role="button"
                          tabIndex={0}
                          onClick={() => setSolicitudDetalle(sol)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setSolicitudDetalle(sol);
                            }
                          }}
                          className="cursor-pointer border-b border-slate-100 transition-colors hover:bg-cyan-50/60 focus-visible:bg-cyan-50/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-cyan-400"
                          aria-label={`Ver detalle de solicitud ${sol.numero}`}
                        >
                          <td className="whitespace-nowrap px-4 py-3 font-mono text-[13px] font-semibold text-cyan-900">
                            {sol.numero}
                          </td>
                          <td className="max-w-[160px] px-4 py-3 text-slate-800">
                            <span className="line-clamp-2 text-[13px]" title={sol.proveedorNombre}>
                              {sol.proveedorNombre || "—"}
                            </span>
                          </td>
                          <td
                            className="max-w-md px-4 py-3 text-slate-800"
                            title={nombresProductosSolicitud(sol)}
                          >
                            <span className="line-clamp-2 text-[13px] font-medium">
                              {nombresProductosSolicitud(sol)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                sol.estado === "Terminado"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-cyan-100 text-cyan-900"
                              }`}
                            >
                              {sol.estado}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-slate-600">{sol.fecha}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>

        <SolicitudDetalleModal
          solicitud={solicitudDetalle}
          onClose={() => setSolicitudDetalle(null)}
        />

        <SolicitudCompraFormModal
          isOpen={solicitudModalOpen}
          onClose={() => setSolicitudModalOpen(false)}
          idCliente={idCliente}
          codeCuenta={codeCuenta}
          productos={catalogosOrden}
          proveedores={proveedoresOrden}
          onSuccess={reloadSolicitudesCompra}
        />
      </section>
    );
  }

  // Vista Órdenes de Compra (administrador de cuenta u operador)
  if (isCliente && viewMode === "ordenesCompra") {
    return (
      <section className="rounded-2xl bg-white p-6 sm:p-8 shadow-sm border border-slate-200">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
          <button
            type="button"
            onClick={() => {
              setOrdenCompraModalOpen(false);
              setOrdenDetalle(null);
              setViewMode(esOperadorCuentas ? "proveedorHubOperador" : "asignaciones");
            }}
            className="self-start flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <HiOutlineArrowLeft size={18} />
            Volver
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
              onClick={() => {
                setOrdenDetalle(null);
                setOrdenCompraModalOpen(true);
              }}
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
              {esOperadorCuentas ? (
                <>
                  Tu administrador de cuenta debe registrar al menos un <strong>proveedor</strong> y productos en el{" "}
                  <strong>catálogo</strong> (Asignación y creación) para poder usar órdenes de compra.
                </>
              ) : (
                <>
                  Necesitás al menos un <strong>proveedor</strong> (Asignaciones → Proveedores) y productos en el{" "}
                  <strong>catálogo</strong> para armar órdenes vinculadas al catálogo.
                </>
              )}
            </p>
          ) : null}

          <div className="overflow-hidden rounded-xl border border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="whitespace-nowrap px-4 py-3 font-bold uppercase tracking-wide text-[11px] text-slate-500">
                      Orden
                    </th>
                    <th className="min-w-[120px] px-4 py-3 font-bold uppercase tracking-wide text-[11px] text-slate-500">
                      Proveedor
                    </th>
                    <th className="px-4 py-3 font-bold uppercase tracking-wide text-[11px] text-slate-500">
                      Productos
                    </th>
                    <th className="px-4 py-3 font-bold uppercase tracking-wide text-[11px] text-slate-500">
                      Estado
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 font-bold uppercase tracking-wide text-[11px] text-slate-500">
                      Fecha
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
                        role="button"
                        tabIndex={0}
                        onClick={() => setOrdenDetalle(oc)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setOrdenDetalle(oc);
                          }
                        }}
                        className="cursor-pointer border-b border-slate-100 transition-colors hover:bg-violet-50/80 focus-visible:bg-violet-50/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-violet-400"
                        aria-label={`Ver detalle de orden ${oc.numero}`}
                      >
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-[13px] font-semibold text-slate-900">
                          {oc.numero}
                        </td>
                        <td className="max-w-[160px] px-4 py-3 text-slate-800">
                          <span className="line-clamp-2 text-[13px]" title={oc.proveedorNombre}>
                            {oc.proveedorNombre || "—"}
                          </span>
                        </td>
                        <td
                          className="max-w-md px-4 py-3 text-slate-800"
                          title={nombresProductosOrden(oc)}
                        >
                          <span className="line-clamp-2 text-[13px] font-medium">{nombresProductosOrden(oc)}</span>
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
                        <td className="whitespace-nowrap px-4 py-3 text-slate-600">{oc.fecha}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <OrdenCompraDetalleModal orden={ordenDetalle} onClose={() => setOrdenDetalle(null)} />

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
          {viewMode === "reporte" &&
            (isCliente ? (
              <ReportesPage />
            ) : (
              <AdminBodegaReportes
                inboundBoxes={inboundBoxes}
                outboundBoxes={outboundBoxes}
                dispatchedBoxes={dispatchedBoxes}
                slots={slots}
                clients={clients}
                sortByPosition={sortByPosition}
              />
            ))}
          {viewMode === "catalogo" && <CatalogosPage />}
          {viewMode === "proveedores" && <ProvidersPage />}
          {viewMode === "compradores" && <CompradoresPage />}
          {viewMode === "camiones" && <CamionesPage />}
          {viewMode === "asignarBodegasInterna" && (<AsignarBodegasPage estado="interna" /> )}
          {viewMode === "asignarBodegasExterna" && (<AsignarBodegasPage estado="externa" /> )}
        </div>
    </section>
  );
};

export default ReportesSection;