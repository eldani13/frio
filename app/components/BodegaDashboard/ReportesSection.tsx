"use client";
import React from "react";
import ProvidersPage from "@/app/proveedores/page";
import PlantasPage from "@/app/plantas/page";
import CompradoresPage from "@/app/compradores/page";
import CatalogosPage from "@/app/catalogos/page";
import CamionesPage from "@/app/camiones/page";
import ReportesPage from "@/app/reportes/page";
import AsignarBodegasPage from "@/app/asignarbodegas/page";

import { MdBusiness, MdFactory, MdShoppingCart } from "react-icons/md";
import { BiBarChartAlt2, BiCollection, BiUserCheck } from "react-icons/bi";
import {
  HiOutlineArrowLeft,
  HiOutlineArrowRight,
  HiOutlineTruck,
} from "react-icons/hi2";

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
    | "asignaciones"
    | "proveedores"
    | "plantas"
    | "compradores"
    | "asignarBodegasInterna"
    | "asignarBodegasExterna"
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

  // Menú principal cliente: Reportes, Catálogo, Asignaciones
  if (isCliente && viewMode === null) {
    return (
      <section className="p-4 sm:p-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          

           {/* BOTÓN ASIGNACIONES */}
           <button
            type="button"
            onClick={() => setViewMode("asignaciones")}
            className="group relative flex flex-col items-center justify-center gap-4 rounded-[2rem] bg-gradient-to-br from-[#d1ede0] to-[#b0d6c3] p-10 shadow-lg shadow-emerald-100/50 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-emerald-200 active:scale-95 sm:col-span-2 lg:col-span-1"
          >
            <span className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/60 text-emerald-700 shadow-inner group-hover:scale-110 transition-transform duration-300">
              <BiUserCheck size={40} />
            </span>
            <div className="text-center">
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">Asignaciones</h3>              
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
         

        </div>
      </section>
    );
  }

  // Submenú Asignaciones (cliente)
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