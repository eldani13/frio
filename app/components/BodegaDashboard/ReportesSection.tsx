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
import { VentasEnCursoOperadorPanel } from "@/app/components/BodegaDashboard/VentasEnCursoOperadorPanel";
import { ProcesamientoOperadorPanel } from "@/app/components/BodegaDashboard/ProcesamientoOperadorPanel";
import type { Box, Client, Slot, WarehouseMeta } from "@/app/interfaces/bodega";
import { OrdenCompraFormModal } from "@/app/components/ui/ordenes/OrdenCompraFormModal";
import { OrdenCompraDetalleModal } from "@/app/components/ui/ordenes/OrdenCompraDetalleModal";
import { SolicitudCompraFormModal } from "@/app/components/ui/ordenes/SolicitudCompraFormModal";
import { SolicitudDetalleModal } from "@/app/components/ui/ordenes/SolicitudDetalleModal";
import { useAuth } from "@/app/context/AuthContext";
import { CatalogoService } from "@/app/services/catalogoService";
import { OrdenCompraService } from "@/app/services/ordenCompraService";
import { SolicitudCompraService } from "@/app/services/solicitudCompraService";
import { ProviderService } from "@/app/services/providerService";
import { CompradorService } from "@/app/services/compradorService";
import type { Catalogo } from "@/app/types/catalogo";
import type { Comprador } from "@/app/types/comprador";
import {
  ORDEN_COMPRA_ESTADOS,
  ordenCompraEstadoBadgeClass,
  type OrdenCompra,
} from "@/app/types/ordenCompra";
import type { SolicitudCompra } from "@/app/types/solicitudCompra";
import { formatKgEs } from "@/app/lib/decimalEs";
import type { Provider } from "@/app/types/provider";
import {
  etiquetasTipoIntegracionRow,
  type SolicitudIntegracion,
} from "@/app/types/solicitudIntegracion";
import { SolicitudIntegracionService } from "@/app/services/solicitudIntegracionService";
import { compareOrdenCompraByCodigoDesc } from "@/lib/ordenCompraSort";
import { compareSolicitudCompraByCodigoDesc } from "@/lib/solicitudCompraSort";

import { MdAssignment, MdBusiness, MdShoppingCart, MdWarehouse } from "react-icons/md";
import { BiBarChartAlt2, BiCollection, BiUserCheck } from "react-icons/bi";
import {
  HiOutlineArrowLeft,
  HiOutlineArrowRight,
  HiOutlineChevronDown,
  HiOutlinePlus,
  HiOutlineTruck,
  HiOutlineUsers,
} from "react-icons/hi2";
import { FiCpu, FiExternalLink } from "react-icons/fi";

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
  /** Bodegas del sistema: operador de cuenta cruza por codeCuenta al elegir destino de OC. */
  warehousesFallback?: WarehouseMeta[];
  sortByPosition?: <T extends { position: number }>(items: T[]) => T[];
}

function nombresProductosOrden(o: OrdenCompra): string {
  const names = (o.lineItems ?? []).map((li) => li.titleSnapshot).filter(Boolean);
  return names.length ? names.join(" · ") : "—";
}

function opcionesEstadoSelect(estadoActual: string): string[] {
  const cur = estadoActual.trim();
  if (cur && !ORDEN_COMPRA_ESTADOS.some((x) => x === cur)) {
    return [cur, ...ORDEN_COMPRA_ESTADOS];
  }
  return [...ORDEN_COMPRA_ESTADOS];
}

function nombresProductosSolicitud(s: SolicitudCompra): string {
  const names = (s.lineItems ?? []).map((li) => li.titleSnapshot).filter(Boolean);
  return names.length ? names.join(" · ") : "—";
}

function pesosProductosSolicitud(s: SolicitudCompra): string {
  const items = s.lineItems ?? [];
  if (!items.length) return "—";
  return items.map((li) => `${formatKgEs(Number(li.pesoKg))} kg`).join(" · ");
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
  warehousesFallback = [],
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
    | "bodegaExternaOperadorHub"
    | "integracionOperador"
    | "realizarSolicitudOperador"
    | "proveedores"
    | "compradores"
    | "asignarBodegasInterna"
    | "asignarBodegasExterna"
    | "camiones"
    | "ventasOperadorHub"
    | "ventasEnCurso"
    | "bodegaInternaOperadorHub"
    | "procesamientoOperador"
    | null
  >(isCliente ? null : "reporte");

  const [ordenesCompra, setOrdenesCompra] = React.useState<OrdenCompra[]>([]);
  const [catalogosOrden, setCatalogosOrden] = React.useState<Catalogo[]>([]);
  const [, setProveedoresOrden] = React.useState<Provider[]>([]);
  const [compradoresCuenta, setCompradoresCuenta] = React.useState<Comprador[]>([]);
  const [ordenesDataLoading, setOrdenesDataLoading] = React.useState(false);
  const [ordenCompraModalOpen, setOrdenCompraModalOpen] = React.useState(false);
  const [solicitudModalOpen, setSolicitudModalOpen] = React.useState(false);
  const [ordenDetalle, setOrdenDetalle] = React.useState<OrdenCompra | null>(null);
  const [ordenEstadoSavingId, setOrdenEstadoSavingId] = React.useState<string | null>(null);
  const [solicitudesCompra, setSolicitudesCompra] = React.useState<SolicitudCompra[]>([]);
  const [solicitudDetalle, setSolicitudDetalle] = React.useState<SolicitudCompra | null>(null);

  const [solicitudesIntegracion, setSolicitudesIntegracion] = React.useState<SolicitudIntegracion[]>([]);
  const [solicitudesIntegracionLoading, setSolicitudesIntegracionLoading] = React.useState(false);
  const [solicitudesIntegracionError, setSolicitudesIntegracionError] = React.useState<string | null>(null);
  const [modalIntegracionOpen, setModalIntegracionOpen] = React.useState(false);
  const [intBodegaId, setIntBodegaId] = React.useState("");
  const [intScraping, setIntScraping] = React.useState(false);
  const [intApi, setIntApi] = React.useState(false);
  const [intCsvPlano, setIntCsvPlano] = React.useState(false);
  const [intFormError, setIntFormError] = React.useState<string | null>(null);
  const [intEnviando, setIntEnviando] = React.useState(false);

  const ORDENES_COMPRA_PAGE_SIZE = 10;
  const [ordenesCompraPage, setOrdenesCompraPage] = React.useState(1);

  const ordenesCompraTabla = React.useMemo(
    () => [...ordenesCompra].sort(compareOrdenCompraByCodigoDesc),
    [ordenesCompra],
  );

  const ordenesCompraPageCount = Math.max(
    1,
    Math.ceil(ordenesCompraTabla.length / ORDENES_COMPRA_PAGE_SIZE),
  );
  const ordenesCompraCurrentPage = Math.min(
    Math.max(1, ordenesCompraPage),
    ordenesCompraPageCount,
  );

  React.useEffect(() => {
    setOrdenesCompraPage((p) => Math.min(Math.max(1, p), ordenesCompraPageCount));
  }, [ordenesCompraPageCount]);

  const ordenesCompraTablaPagina = React.useMemo(
    () =>
      ordenesCompraTabla.slice(
        (ordenesCompraCurrentPage - 1) * ORDENES_COMPRA_PAGE_SIZE,
        ordenesCompraCurrentPage * ORDENES_COMPRA_PAGE_SIZE,
      ),
    [ordenesCompraTabla, ordenesCompraCurrentPage],
  );

  const SOLICITUDES_COMPRA_PAGE_SIZE = 10;
  const [solicitudesCompraPage, setSolicitudesCompraPage] = React.useState(1);

  const solicitudesCompraTabla = React.useMemo(
    () => [...solicitudesCompra].sort(compareSolicitudCompraByCodigoDesc),
    [solicitudesCompra],
  );

  const solicitudesCompraPageCount = Math.max(
    1,
    Math.ceil(solicitudesCompraTabla.length / SOLICITUDES_COMPRA_PAGE_SIZE),
  );
  const solicitudesCompraCurrentPage = Math.min(
    Math.max(1, solicitudesCompraPage),
    solicitudesCompraPageCount,
  );

  React.useEffect(() => {
    setSolicitudesCompraPage((p) => Math.min(Math.max(1, p), solicitudesCompraPageCount));
  }, [solicitudesCompraPageCount]);

  const solicitudesCompraTablaPagina = React.useMemo(
    () =>
      solicitudesCompraTabla.slice(
        (solicitudesCompraCurrentPage - 1) * SOLICITUDES_COMPRA_PAGE_SIZE,
        solicitudesCompraCurrentPage * SOLICITUDES_COMPRA_PAGE_SIZE,
      ),
    [solicitudesCompraTabla, solicitudesCompraCurrentPage],
  );

  const bodegasExternasCuenta = React.useMemo(
    () =>
      warehousesFallback.filter(
        (w) => w.status === "externa" || w.status === "external",
      ),
    [warehousesFallback],
  );

  const bodegasInternasCuenta = React.useMemo(
    () => warehousesFallback.filter((w) => w.status === "interna"),
    [warehousesFallback],
  );

  React.useEffect(() => {
    if (!isCliente || !esOperadorCuentas || !idCliente.trim() || viewMode !== "integracionOperador") {
      return;
    }
    setSolicitudesIntegracionLoading(true);
    setSolicitudesIntegracionError(null);
    const unsub = SolicitudIntegracionService.subscribePorCliente(
      idCliente,
      (items) => {
        setSolicitudesIntegracion(items);
        setSolicitudesIntegracionLoading(false);
        setSolicitudesIntegracionError(null);
      },
      (err) => {
        console.error(err);
        setSolicitudesIntegracion([]);
        setSolicitudesIntegracionError(
          "No se pudieron cargar las solicitudes. Revisá permisos en clientes/{id}/solicitudesIntegracion.",
        );
        setSolicitudesIntegracionLoading(false);
      },
    );
    return () => unsub();
  }, [isCliente, esOperadorCuentas, idCliente, viewMode]);

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
    setModalIntegracionOpen(false);
    setIntFormError(null);
  }, [isCliente, menuResetNonce, setReportDetailModal]);

  React.useEffect(() => {
    const vistaOrdenes = viewMode === "ordenesCompra";
    const vistaSolicitudes = viewMode === "realizarSolicitudOperador";
    const vistaVentas = viewMode === "ventasEnCurso";
    const vistaProcesamiento = viewMode === "procesamientoOperador";
    if (!isCliente || (!vistaOrdenes && !vistaSolicitudes && !vistaVentas && !vistaProcesamiento)) return;
    if (!idCliente.trim()) {
      setOrdenesCompra([]);
      setSolicitudesCompra([]);
      setCatalogosOrden([]);
      setProveedoresOrden([]);
      setCompradoresCuenta([]);
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
    const needProviders = vistaOrdenes || vistaSolicitudes;
    const needCompradores = vistaVentas;
    void Promise.all([
      ordenesP,
      solicitudesP,
      CatalogoService.getAll(idCliente, codeCuenta),
      needProviders
        ? ProviderService.getAll(idCliente, codeCuenta)
        : Promise.resolve(null as Provider[] | null),
      needCompradores
        ? CompradorService.getAll(idCliente, codeCuenta)
        : Promise.resolve(null as Comprador[] | null),
    ])
      .then(([ordenes, solicitudes, cats, provs, comps]) => {
        if (cancelled) return;
        if (vistaOrdenes) setOrdenesCompra(ordenes);
        else setOrdenesCompra([]);
        if (vistaSolicitudes) setSolicitudesCompra(solicitudes);
        else setSolicitudesCompra([]);
        setCatalogosOrden(cats);
        if (provs !== null) setProveedoresOrden(provs);
        if (comps !== null) setCompradoresCuenta(comps);
      })
      .catch(() => {
        if (!cancelled) {
          setOrdenesCompra([]);
          setSolicitudesCompra([]);
          setCatalogosOrden([]);
          setProveedoresOrden([]);
          setCompradoresCuenta([]);
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
    void OrdenCompraService.getAll(idCliente, codeCuenta).then((list) => {
      setOrdenesCompra(list);
      setOrdenDetalle((prev) => {
        if (!prev?.id) return prev;
        return list.find((o) => o.id === prev.id) ?? prev;
      });
    });
  }, [idCliente, codeCuenta]);

  const handleEstadoOrdenDesdeTabla = React.useCallback(
    async (oc: OrdenCompra, next: string) => {
      if (!oc.id || !idCliente.trim() || next === oc.estado) return;
      setOrdenEstadoSavingId(oc.id);
      const prev = oc.estado;
      setOrdenesCompra((list) =>
        list.map((o) => (o.id === oc.id ? ({ ...o, estado: next } as OrdenCompra) : o)),
      );
      setOrdenDetalle((d) =>
        d?.id === oc.id ? ({ ...d, estado: next } as OrdenCompra) : d,
      );
      try {
        await OrdenCompraService.actualizarEstado(idCliente.trim(), oc.id, next);
      } catch {
        setOrdenesCompra((list) =>
          list.map((o) => (o.id === oc.id ? ({ ...o, estado: prev } as OrdenCompra) : o)),
        );
        setOrdenDetalle((d) =>
          d?.id === oc.id ? ({ ...d, estado: prev } as OrdenCompra) : d,
        );
      } finally {
        setOrdenEstadoSavingId(null);
      }
    },
    [idCliente],
  );

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
          <div className="mx-auto grid max-w-6xl grid-cols-1 justify-items-stretch gap-4 sm:grid-cols-2 sm:justify-items-center sm:gap-5 lg:grid-cols-4">
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
              <h3 className={`app-title max-w-[13rem] leading-snug ${cuentaMenuText}`}>
                Proveedor
              </h3>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("bodegaExternaOperadorHub")}
              style={{
                backgroundColor: "#E3D2F1",
                boxShadow: "0 14px 40px -10px rgba(106, 13, 173, 0.26)",
              }}
              className={`${cuentaMenuTile} w-full max-w-sm hover:shadow-[0_20px_48px_-12px_rgba(106,13,173,0.3)]`}
            >
              <span className={cuentaMenuIconWrap}>
                <FiExternalLink size={36} className="text-[#6A0DAD]" aria-hidden />
              </span>
              <h3 className={`app-title max-w-[13rem] leading-snug ${cuentaMenuText}`}>
                Bodega externa
              </h3>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("bodegaInternaOperadorHub")}
              style={{
                backgroundColor: "#e0f2fe",
                boxShadow: "0 14px 40px -10px rgba(2, 132, 199, 0.22)",
              }}
              className={`${cuentaMenuTile} w-full max-w-sm hover:shadow-[0_20px_48px_-12px_rgba(2,132,199,0.28)]`}
            >
              <span className={cuentaMenuIconWrap}>
                <MdWarehouse size={38} className="text-sky-700" aria-hidden />
              </span>
              <h3 className={`app-title max-w-[13rem] leading-snug ${cuentaMenuText}`}>
                Bodega interna
              </h3>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("ventasOperadorHub")}
              style={{
                backgroundColor: "#D1FAE5",
                boxShadow: "0 14px 40px -10px rgba(5, 122, 85, 0.22)",
              }}
              className={`${cuentaMenuTile} w-full max-w-sm hover:shadow-[0_20px_48px_-12px_rgba(5,122,85,0.28)]`}
            >
              <span className={cuentaMenuIconWrap}>
                <MdShoppingCart size={38} className="text-[#047857]" aria-hidden />
              </span>
              <h3 className={`app-title max-w-[13rem] leading-snug ${cuentaMenuText}`}>
                Ventas
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
            <h3 className={`app-title max-w-[13rem] leading-snug ${cuentaMenuText}`}>
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
            <h3 className={`app-title max-w-[13rem] leading-snug ${cuentaMenuText}`}>
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
            <h3 className={`app-title max-w-[13rem] leading-snug ${cuentaMenuText}`}>
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
            <h2 className="app-title pl-1">
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
                  <p className="app-title">Realizar solicitud</p>
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
                  <p className="app-title">Órdenes de compra</p>
                </div>
                <HiOutlineArrowRight size={18} className="text-slate-500 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Operador: hub Ventas → Ordenes de ventas
  if (isCliente && esOperadorCuentas && viewMode === "ventasOperadorHub") {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4">
          <button
            type="button"
            onClick={() => setViewMode(null)}
            className="flex items-center gap-2 self-start text-sm font-semibold text-slate-600 transition-colors hover:text-slate-900"
          >
            <HiOutlineArrowLeft size={18} />
            Volver
          </button>

          <div className="flex flex-col gap-3">
            <h2 className="app-title pl-1">Ventas</h2>
            <p className="pl-1 text-sm text-slate-600">
              Seguimiento de pedidos de venta: productos en unidades y mismos estados operativos que en órdenes de
              compra.
            </p>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => setViewMode("ventasEnCurso")}
                className="group flex w-full cursor-pointer items-center justify-between rounded-2xl border border-emerald-100/90 bg-[#ecfdf5] p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:scale-95"
              >
                <div className="flex items-center gap-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/80 text-emerald-800 shadow-sm">
                    <MdShoppingCart size={24} />
                  </span>
                  <div className="text-left">
                    <p className="app-title">Ordenes de ventas</p>
                    <p className="text-xs text-slate-600">
                      Comprador, productos en unidades, estado y fecha (mismos estados que órdenes de compra).
                    </p>
                  </div>
                </div>
                <HiOutlineArrowRight size={18} className="text-slate-500 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (isCliente && esOperadorCuentas && viewMode === "ventasEnCurso") {
    return (
      <VentasEnCursoOperadorPanel
        onBack={() => setViewMode("ventasOperadorHub")}
        idCliente={idCliente}
        codeCuenta={codeCuenta}
        productos={catalogosOrden}
        compradores={compradoresCuenta}
        dataLoading={ordenesDataLoading}
        warehousesFallback={warehousesFallback}
      />
    );
  }

  // Operador: hub Bodega interna → Procesamiento
  if (isCliente && esOperadorCuentas && viewMode === "bodegaInternaOperadorHub") {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4">
          <button
            type="button"
            onClick={() => setViewMode(null)}
            className="flex items-center gap-2 self-start text-sm font-semibold text-slate-600 transition-colors hover:text-slate-900"
          >
            <HiOutlineArrowLeft size={18} />
            Volver
          </button>

          <div className="flex flex-col gap-3">
            <h2 className="app-title pl-1">Bodega interna</h2>
            
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => setViewMode("procesamientoOperador")}
                className="group flex w-full cursor-pointer items-center justify-between rounded-2xl border border-sky-100/90 bg-sky-50/90 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:scale-95"
              >
                <div className="flex items-center gap-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/80 text-sky-800 shadow-sm">
                    <FiCpu size={24} strokeWidth={2} />
                  </span>
                  <div className="text-left">
                    <p className="app-title">Procesamiento</p>
                    <p className="text-xs text-slate-600">
                      Primario y secundario según catálogo; cantidad hasta inventario; estimado del secundario por
                      regla de conversión.
                    </p>
                  </div>
                </div>
                <HiOutlineArrowRight
                  size={18}
                  className="text-slate-500 transition-transform group-hover:translate-x-1"
                />
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (isCliente && esOperadorCuentas && viewMode === "procesamientoOperador") {
    const nombreCuenta =
      clients.find((c) => c.id === idCliente.trim())?.name?.trim() || idCliente.trim() || "";
    return (
      <ProcesamientoOperadorPanel
        onBack={() => setViewMode("bodegaInternaOperadorHub")}
        idCliente={idCliente}
        codeCuenta={codeCuenta}
        clientName={nombreCuenta}
        productos={catalogosOrden}
        bodegasInternas={bodegasInternasCuenta}
        creadoPorUid={session?.uid ?? ""}
        creadoPorNombre={session?.email?.trim() || "Usuario"}
        dataLoading={ordenesDataLoading}
      />
    );
  }

  // Operador: hub Bodega externa → Integración
  if (isCliente && esOperadorCuentas && viewMode === "bodegaExternaOperadorHub") {
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
            <h2 className="app-title pl-1">
              Bodega externa
            </h2>
            <p className="pl-1 text-sm text-slate-600">
              Integraciones con bodegas externas del sistema (solicitudes compartidas con el configurador).
            </p>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => setViewMode("integracionOperador")}
                className="group w-full rounded-2xl bg-[#e8dff5] p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md flex items-center justify-between cursor-pointer active:scale-95 border border-violet-100/80"
              >
                <div className="flex items-center gap-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/70 text-violet-900 shadow-sm">
                    <MdAssignment size={24} />
                  </span>
                  <p className="app-title">Integración</p>
                </div>
                <HiOutlineArrowRight size={18} className="text-slate-500 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Operador: tabla de solicitudes de integración
  if (isCliente && esOperadorCuentas && viewMode === "integracionOperador") {
    const abrirModalIntegracion = () => {
      setIntFormError(null);
      setIntBodegaId(bodegasExternasCuenta[0]?.id ?? "");
      setIntScraping(false);
      setIntApi(false);
      setIntCsvPlano(false);
      setModalIntegracionOpen(true);
    };

    const enviarSolicitudIntegracion = async (e: React.FormEvent) => {
      e.preventDefault();
      setIntFormError(null);
      const wid = intBodegaId.trim();
      if (!wid) {
        setIntFormError("Elegí una bodega externa.");
        return;
      }
      if (!intScraping && !intApi && !intCsvPlano) {
        setIntFormError("Marcá al menos un tipo de integración.");
        return;
      }
      if (!session?.uid) {
        setIntFormError("No hay sesión.");
        return;
      }
      const cid = idCliente.trim();
      if (!cid) {
        setIntFormError("No hay cuenta asignada.");
        return;
      }
      const w = bodegasExternasCuenta.find((x) => x.id === wid);
      const clientName = clients.find((c) => c.id === cid)?.name?.trim() ?? "";
      setIntEnviando(true);
      try {
        await SolicitudIntegracionService.crear({
          bodegaExternaId: wid,
          bodegaExternaNombre: w?.name?.trim() || w?.id || wid,
          scraping: intScraping,
          api: intApi,
          csvPlano: intCsvPlano,
          clientId: cid,
          clientName,
          codeCuenta: codeCuenta.trim(),
          creadoPorNombre:
            (session as { displayName?: string }).displayName?.trim() || session.email?.trim() || "Usuario",
          creadoPorUid: session.uid,
        });
        setModalIntegracionOpen(false);
      } catch (err) {
        console.error(err);
        setIntFormError("No se pudo enviar la solicitud. Reintentá.");
      } finally {
        setIntEnviando(false);
      }
    };

    const formatIntFecha = (s: SolicitudIntegracion) => {
      const ts = s.createdAt;
      if (!ts || typeof ts.toDate !== "function") return "—";
      try {
        return ts.toDate().toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" });
      } catch {
        return "—";
      }
    };

    return (
      <section className="rounded-2xl bg-white p-6 sm:p-8 shadow-sm border border-slate-200">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
          <button
            type="button"
            onClick={() => {
              setModalIntegracionOpen(false);
              setViewMode("bodegaExternaOperadorHub");
            }}
            className="self-start flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <HiOutlineArrowLeft size={18} />
            Volver
          </button>

          <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="rounded-2xl bg-violet-100 p-3 text-violet-900">
                <MdAssignment size={28} />
              </div>
              <div>
                <h1 className="app-title">Integración</h1>
                <p className="text-sm text-slate-500">
                  <strong>Activo</strong> al enviar la solicitud; <strong>Finalizado</strong> cuando el configurador
                  ejecuta la tarea en su panel (se actualiza solo en esta tabla).
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={abrirModalIntegracion}
              disabled={bodegasExternasCuenta.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-[10px] bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
            >
              <HiOutlinePlus strokeWidth={2.5} className="h-5 w-5" />
              Solicitar integración
            </button>
          </header>

          {bodegasExternasCuenta.length === 0 ? (
            <p className="rounded-xl border border-amber-100 bg-amber-50/80 p-4 text-sm text-amber-900">
              No hay <strong>bodegas externas</strong> cargadas en el sistema. El configurador debe crearlas para poder
              armar solicitudes.
            </p>
          ) : null}

          {solicitudesIntegracionError ? (
            <p className="rounded-xl border border-red-100 bg-red-50/80 p-4 text-sm text-red-700">
              {solicitudesIntegracionError}
            </p>
          ) : null}

          <div className="overflow-hidden rounded-xl border border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-4 py-3 font-bold uppercase tracking-wide text-base text-slate-500">
                      Bodega externa
                    </th>
                    <th className="px-4 py-3 font-bold uppercase tracking-wide text-base text-slate-500">
                      Tipo de integración
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 font-bold uppercase tracking-wide text-base text-slate-500">
                      Fecha
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 font-bold uppercase tracking-wide text-base text-slate-500">
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {solicitudesIntegracionLoading ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-12 text-center text-slate-500">
                        Cargando solicitudes…
                      </td>
                    </tr>
                  ) : solicitudesIntegracion.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-12 text-center text-slate-500">
                        No hay solicitudes. Usá <strong>Solicitar integración</strong> para agregar la primera.
                      </td>
                    </tr>
                  ) : (
                    solicitudesIntegracion.map((row) => (
                      <tr key={row.id} className="border-b border-slate-100">
                        <td className="px-4 py-3 font-medium text-slate-900">{row.bodegaExternaNombre}</td>
                        <td className="px-4 py-3 text-slate-700">{etiquetasTipoIntegracionRow(row)}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatIntFecha(row)}</td>
                        <td className="whitespace-nowrap px-4 py-3">
                          {row.estado === "finalizado" ? (
                            <span className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                              Finalizado
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                              Activo
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {modalIntegracionOpen ? (
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/45 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-integracion-titulo"
            onClick={() => setModalIntegracionOpen(false)}
          >
            <div
              className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
              onClick={(ev) => ev.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3">
                <h2 id="modal-integracion-titulo" className="app-title">
                  Solicitar integración
                </h2>
                <button
                  type="button"
                  onClick={() => setModalIntegracionOpen(false)}
                  className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Cerrar"
                >
                  ×
                </button>
              </div>
              <form className="mt-4 grid gap-4" onSubmit={enviarSolicitudIntegracion}>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Bodega externa</label>
                  <select
                    value={intBodegaId}
                    onChange={(ev) => setIntBodegaId(ev.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    required
                  >
                    {bodegasExternasCuenta.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name?.trim() || w.id}
                      </option>
                    ))}
                  </select>
                </div>
                <fieldset>
                  <legend className="text-sm font-medium text-slate-700">Tipo de integración</legend>
                  <div className="mt-2 flex flex-col gap-2">
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-800">
                      <input
                        type="checkbox"
                        checked={intScraping}
                        onChange={(ev) => setIntScraping(ev.target.checked)}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                      Scraping
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-800">
                      <input
                        type="checkbox"
                        checked={intApi}
                        onChange={(ev) => setIntApi(ev.target.checked)}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                      API
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-800">
                      <input
                        type="checkbox"
                        checked={intCsvPlano}
                        onChange={(ev) => setIntCsvPlano(ev.target.checked)}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                      CSV plano
                    </label>
                  </div>
                </fieldset>
                {intFormError ? <p className="text-sm text-red-600">{intFormError}</p> : null}
                <div className="flex flex-wrap justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalIntegracionOpen(false)}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={intEnviando}
                    className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
                  >
                    {intEnviando ? "Enviando…" : "Enviar solicitud"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}
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
              <h2 className="app-title pl-1">
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
                    <p className="app-title">Proveedores</p>
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
                    <p className="app-title">Compradores</p>
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
                    <p className="app-title">Camiones</p>
                  </div>
                  <HiOutlineArrowRight size={20} className="text-slate-500 group-hover:translate-x-1 transition-transform" />
                </button>

                {/* Plantas: oculto temporalmente. Para volver a mostrar: importar PlantasPage y MdFactory,
                    añadir "plantas" al union de viewMode, este botón y {viewMode === "plantas" && <PlantasPage />}. */}
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200 pt-10">
              <h2 className="app-title pl-1">
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
                    <p className="app-title">Usuarios</p>
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
                    <p className="app-title">Bodega interna</p>
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
                    <p className="app-title">Bodega externa</p>
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
                <h1 className="app-title">
                  Realizar solicitud
                </h1>
                <p className="text-sm text-slate-500">
                  Registrá solicitudes con productos del catálogo y peso en kg; se guardan aparte de las órdenes de compra.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSolicitudModalOpen(true)}
              disabled={!idCliente.trim() || catalogosOrden.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-[10px] bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-cyan-700 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
            >
              <HiOutlinePlus strokeWidth={2.5} className="h-5 w-5" />
            </button>
          </header>

          {!idCliente.trim() ? (
            <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
              No hay cuenta vinculada a tu usuario. Contactá al administrador de la cuenta.
            </p>
          ) : catalogosOrden.length === 0 ? (
            <p className="rounded-xl border border-amber-100 bg-amber-50/80 p-4 text-sm text-amber-900">
              Tu administrador de cuenta debe registrar productos en el <strong>catálogo</strong> (Asignación y creación)
              para poder armar solicitudes.
            </p>
          ) : null}

          {idCliente.trim() && catalogosOrden.length > 0 ? (
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="whitespace-nowrap px-4 py-3 font-bold uppercase tracking-wide text-base text-slate-500">
                        Solicitud
                      </th>
                      <th className="px-4 py-3 font-bold uppercase tracking-wide text-base text-slate-500">
                        Productos
                      </th>
                      <th className="whitespace-nowrap px-4 py-3 font-bold uppercase tracking-wide text-base text-slate-500">
                        Peso
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {ordenesDataLoading ? (
                      <tr>
                        <td colSpan={3} className="px-4 py-12 text-center text-slate-500">
                          Cargando solicitudes…
                        </td>
                      </tr>
                    ) : solicitudesCompraTabla.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-4 py-12 text-center text-slate-500">
                          No hay solicitudes. Usá &quot;Nueva solicitud&quot; para crear la primera.
                        </td>
                      </tr>
                    ) : (
                      solicitudesCompraTablaPagina.map((sol) => (
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
                          className="cursor-pointer border-b border-slate-100 transition-colors hover:bg-violet-50/80 focus-visible:bg-violet-50/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-violet-400"
                          aria-label={`Ver detalle de solicitud ${sol.numero}`}
                        >
                          <td className="whitespace-nowrap px-4 py-3 font-mono text-base font-semibold text-slate-900">
                            {sol.numero}
                          </td>
                          <td
                            className="max-w-md px-4 py-3 text-slate-800"
                            title={nombresProductosSolicitud(sol)}
                          >
                            <span className="line-clamp-2 text-base font-medium">
                              {nombresProductosSolicitud(sol)}
                            </span>
                          </td>
                          <td
                            className="whitespace-nowrap px-4 py-3 tabular-nums text-base text-slate-600"
                            title={pesosProductosSolicitud(sol)}
                          >
                            {pesosProductosSolicitud(sol)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {!ordenesDataLoading && solicitudesCompraTabla.length > 0 ? (
                <div className="flex flex-col gap-3 border-t border-slate-100 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-xs text-slate-500 tabular-nums">
                    {solicitudesCompraTabla.length}{" "}
                    {solicitudesCompraTabla.length === 1 ? "registro" : "registros"} · Página{" "}
                    {solicitudesCompraCurrentPage} de {solicitudesCompraPageCount}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSolicitudesCompraPage((p) => Math.max(1, p - 1))}
                      disabled={solicitudesCompraCurrentPage === 1}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold uppercase tracking-wider shadow-sm hover:border-slate-300 disabled:opacity-50"
                    >
                      Anterior
                    </button>
                    <span className="text-xs text-slate-600 tabular-nums">
                      Página {solicitudesCompraCurrentPage} / {solicitudesCompraPageCount}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setSolicitudesCompraPage((p) =>
                          Math.min(solicitudesCompraPageCount, p + 1),
                        )
                      }
                      disabled={solicitudesCompraCurrentPage === solicitudesCompraPageCount}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold uppercase tracking-wider shadow-sm hover:border-slate-300 disabled:opacity-50"
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              ) : null}
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
                <h1 className="app-title">
                  Órdenes de Compras
                </h1>
                <p className="text-sm text-slate-500">
                  Cada orden usa productos de tu catálogo; el proveedor queda asignado automáticamente
                  (mismo que en solicitudes).
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setOrdenDetalle(null);
                setOrdenCompraModalOpen(true);
              }}
              disabled={!idCliente.trim() || catalogosOrden.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-[10px] bg-[#A8D5BA] px-5 py-2.5 text-sm font-semibold text-[#2D5A3F] shadow-sm transition hover:bg-[#97c4a9] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
            >
              <HiOutlinePlus strokeWidth={2.5} className="h-5 w-5" />
            </button>
          </header>

          {!idCliente.trim() ? (
            <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
              Iniciá sesión como cliente para ver y crear órdenes de compra.
            </p>
          ) : catalogosOrden.length === 0 ? (
            <p className="rounded-xl border border-amber-100 bg-amber-50/80 p-4 text-sm text-amber-900">
              {esOperadorCuentas ? (
                <>
                  Tu administrador de cuenta debe registrar productos en el <strong>catálogo</strong> (Asignación y
                  creación) para poder usar órdenes de compra.
                </>
              ) : (
                <>
                  Necesitás productos en el <strong>catálogo</strong> para armar órdenes vinculadas al catálogo.
                </>
              )}
            </p>
          ) : null}

          <div className="overflow-hidden rounded-xl border border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="whitespace-nowrap px-4 py-3 font-bold uppercase tracking-wide text-base text-slate-500">
                      Orden
                    </th>
                    <th className="min-w-[120px] px-4 py-3 font-bold uppercase tracking-wide text-base text-slate-500">
                      Proveedor
                    </th>
                    <th className="px-4 py-3 font-bold uppercase tracking-wide text-base text-slate-500">
                      Productos
                    </th>
                    <th className="px-4 py-3 font-bold uppercase tracking-wide text-base text-slate-500">
                      Estado
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 font-bold uppercase tracking-wide text-base text-slate-500">
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
                  ) : ordenesCompraTabla.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                        No hay órdenes registradas. Usá &quot;Agregar orden de compra&quot; para crear la
                        primera (con líneas del catálogo).
                      </td>
                    </tr>
                  ) : (
                    ordenesCompraTablaPagina.map((oc) => (
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
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-base font-semibold text-slate-900">
                          {oc.numero}
                        </td>
                        <td className="max-w-[160px] px-4 py-3 text-slate-800">
                          <span className="line-clamp-2 text-base" title={oc.proveedorNombre}>
                            {oc.proveedorNombre || "—"}
                          </span>
                        </td>
                        <td
                          className="max-w-md px-4 py-3 text-slate-800"
                          title={nombresProductosOrden(oc)}
                        >
                          <span className="line-clamp-2 text-base font-medium">{nombresProductosOrden(oc)}</span>
                        </td>
                        <td
                          className="px-4 py-3"
                          onClick={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        >
                          <div className="relative inline-flex max-w-full align-middle">
                            <select
                              aria-label={`Estado de la orden ${oc.numero}`}
                              title="Cambiar estado"
                              disabled={!oc.id || ordenEstadoSavingId === oc.id}
                              value={oc.estado}
                              onChange={(e) => void handleEstadoOrdenDesdeTabla(oc, e.target.value)}
                              className={`inline-flex max-w-[12rem] cursor-pointer truncate rounded-full border-0 py-0.5 pl-2.5 pr-7 text-left text-xs font-semibold shadow-none outline-none ring-0 focus-visible:ring-2 focus-visible:ring-violet-400/50 disabled:cursor-wait disabled:opacity-60 [appearance:none] ${ordenCompraEstadoBadgeClass(oc.estado)}`}
                            >
                              {opcionesEstadoSelect(oc.estado).map((opt) => (
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
                        <td className="whitespace-nowrap px-4 py-3 text-slate-600">{oc.fecha}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {!ordenesDataLoading && ordenesCompraTabla.length > 0 ? (
              <div className="flex flex-col gap-3 border-t border-slate-100 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-xs text-slate-500 tabular-nums">
                  {ordenesCompraTabla.length}{" "}
                  {ordenesCompraTabla.length === 1 ? "registro" : "registros"} · Página{" "}
                  {ordenesCompraCurrentPage} de {ordenesCompraPageCount}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setOrdenesCompraPage((p) => Math.max(1, p - 1))}
                    disabled={ordenesCompraCurrentPage === 1}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold uppercase tracking-wider shadow-sm hover:border-slate-300 disabled:opacity-50"
                  >
                    Anterior
                  </button>
                  <span className="text-xs text-slate-600 tabular-nums">
                    Página {ordenesCompraCurrentPage} / {ordenesCompraPageCount}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setOrdenesCompraPage((p) => Math.min(ordenesCompraPageCount, p + 1))
                    }
                    disabled={ordenesCompraCurrentPage === ordenesCompraPageCount}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold uppercase tracking-wider shadow-sm hover:border-slate-300 disabled:opacity-50"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <OrdenCompraDetalleModal
          orden={ordenDetalle}
          onClose={() => setOrdenDetalle(null)}
          esOperadorCuentas={esOperadorCuentas}
          idCliente={idCliente}
          codeCuenta={codeCuenta}
          warehousesFallback={warehousesFallback}
          onEnviada={reloadOrdenesCompra}
          onEstadoActualizado={reloadOrdenesCompra}
        />

        <OrdenCompraFormModal
          isOpen={ordenCompraModalOpen}
          onClose={() => setOrdenCompraModalOpen(false)}
          idCliente={idCliente}
          codeCuenta={codeCuenta}
          productos={catalogosOrden}
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