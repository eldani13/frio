import React from "react";
import ProvidersPage from "@/app/proveedores/page";
import PlantasPage from "@/app/plantas/page";
import CompradoresPage from "@/app/compradores/page";
import CatalogosPage from "@/app/catalogos/page";
import CamionesPage from "@/app/camiones/page";
import ReportesPage from "@/app/reportes/page";

import { MdBusiness, MdFactory, MdShoppingCart } from "react-icons/md";
import { BiBarChartAlt2, BiCollection, BiUserCheck } from "react-icons/bi";
import { HiOutlineArrowRight, HiOutlineTruck } from "react-icons/hi2";

interface ReportesSectionProps {
  isCliente?: boolean;
  menuResetNonce?: number;
  setReportDetailModal: (modal: null) => void;
}

const ReportesSection: React.FC<ReportesSectionProps> = ({
  isCliente = false,
  menuResetNonce,
  setReportDetailModal,
}) => {
  const [viewMode, setViewMode] = React.useState<
    | "reporte"
    | "catalogo"
    | "proveedores"
    | "plantas"
    | "compradores"
    | "asignarBodegas"
    | "camiones"
    | null
  >(isCliente ? null : "reporte");

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
  }, [isCliente, menuResetNonce, setReportDetailModal]);

  // Vista de Menú Principal (Solo para clientes o cuando no hay vista seleccionada)
  if (isCliente && viewMode === null) {
    return (
      <section className="rounded-2xl bg-white p-8 shadow-sm border border-slate-200">
        <div className="flex flex-col items-center text-center gap-6 w-full px-4">
          
          <div className="flex flex-col w-full max-w-4xl gap-3">
            
            {/* Botón Reporte */}
            <button
              type="button"
              onClick={() => setViewMode("reporte")}
              className="group w-full rounded-2xl bg-[#b8d1f6] p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md flex items-center justify-between cursor-pointer active:scale-95"
            >
              <div className="flex items-center gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/50 text-slate-800 shadow-sm">
                  <BiBarChartAlt2 size={24} />
                </span>
                <p className="text-lg font-bold text-slate-900">Reportes</p>
              </div>
              <HiOutlineArrowRight size={18} className="text-slate-500 group-hover:translate-x-1 transition-transform" />
            </button>

            {/* Botón Catálogo */}
            <button
              type="button"
              onClick={() => setViewMode("catalogo")}
              className="group w-full rounded-2xl bg-[#f8edb1] p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md flex items-center justify-between cursor-pointer active:scale-95"
            >
              <div className="flex items-center gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/50 text-slate-800 shadow-sm">
                  <BiCollection size={24} />
                </span>
                <p className="text-lg font-bold text-slate-900">Catálogo</p>
              </div>
              <HiOutlineArrowRight size={18} className="text-slate-500 group-hover:translate-x-1 transition-transform" />
            </button>

            {/* Botón Asignar bodegas */}
            <button
              type="button"
              onClick={() => setViewMode("asignarBodegas")}
              className="group w-full rounded-2xl bg-[#b0d6c3] p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md flex items-center justify-between cursor-pointer active:scale-95"
            >
              <div className="flex items-center gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/50 text-slate-800 shadow-sm">
                  <BiUserCheck size={24} />
                </span>
                <p className="text-lg font-bold text-slate-900">Asignar Bodegas</p>
              </div>
              <HiOutlineArrowRight size={18} className="text-slate-500 group-hover:translate-x-1 transition-transform" />
            </button>

            {/* Botón Proveedores */}
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

            {/* Botón Plantas */}
            <button
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

            {/* Botón Compradores */}
            <button
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

            {/* Botón Camiones */}
            <button
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
          
          </div>

        </div>
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
        </div>
      
    </section>
  );
};

export default ReportesSection;