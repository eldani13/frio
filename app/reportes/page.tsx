"use client";
import React, { useState } from "react";
import { MdBusiness, MdFactory, MdShoppingCart } from "react-icons/md";
import { HiOutlineTruck } from "react-icons/hi2";
import { BiPackage,BiArrowBack } from "react-icons/bi";

// Importación de los contenedores de cada módulo

import BodegaExtModule from "@/app/components/ui/reportes/bodegasexternas/page";
import BodegaIntModule from "@/app/components/ui/reportes/bodegasinternas/page";
import CompradorModule from "@/app/components/ui/reportes/compradores/page";
import ProveedorModule from "@/app/components/ui/reportes/proveedores/page";
import TransportesModule from "@/app/components/ui/reportes/transportes/page";

type ModuloTipo = "PROVEEDOR" | "TRANSPORTE" | "BODEGA_INT" | "BODEGA_EXT" | "COMPRADOR" | null;

const ReportesSection = () => {
  const [activeModule, setActiveModule] = useState<ModuloTipo>(null);

  // Configuración de botones para mapeo dinámico
  const modulos = [
    { id: "PROVEEDOR", label: "Proveedor (77 Kg)", icon: <MdBusiness size={24} />, color: "bg-[#e2d5f3]" },
    { id: "TRANSPORTE", label: "Transporte (81 Kg)", icon: <HiOutlineTruck size={24} />, color: "bg-[#d1f2fb]" },
    { id: "BODEGA_INT", label: "Bodega Interna (152 Kg)", icon: <BiPackage size={24} />, color: "bg-[#b0d6c3]" },
    { id: "BODEGA_EXT", label: "Bodega Externa (69 Kg)", icon: <MdFactory size={24} />, color: "bg-[#f8edb1]" },
    { id: "COMPRADOR", label: "Comprador (18 Kg)", icon: <MdShoppingCart size={24} />, color: "bg-[#b8d1f6]" },
  ];

  // Si no hay módulo seleccionado, muestra el menú de 5 botones
  if (!activeModule) {
    return (
      <section className="rounded-2xl bg-white p-8 shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold text-slate-800 mb-6 text-center">INVENTARIO DE MERCANCIA</h2>
        <div className="flex flex-col w-full max-w-4xl mx-auto gap-3">
          {modulos.map((m) => (
            <button
              key={m.id}
              onClick={() => setActiveModule(m.id as ModuloTipo)}
              className={`group w-full rounded-2xl ${m.color} p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md flex items-center justify-between cursor-pointer active:scale-95`}
            >
              <div className="flex items-center gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/50 text-slate-800 shadow-sm">
                  {m.icon}
                </span>
                <p className="text-lg font-bold text-slate-900">{m.label}</p>
              </div>
            </button>
          ))}
        </div>
      </section>
    );
  }

  // Si hay un módulo seleccionado, renderiza su contenedor específico con botón de volver
  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
     <button
  onClick={() => setActiveModule(null)}
  className="
    flex items-center gap-3 
    px-6 py-3 
    border-2 border-[#A8D5BA] 
    rounded-2xl 
    bg-white
    text-slate-900 
    hover:bg-[#A8D5BA]/10 
    transition-all 
    active:scale-95
    font-['Inter']
    shadow-sm
    cursor-pointer
  "
>
  <div className="text-[#3a5a40] flex items-center justify-center">
    <BiArrowBack size={26} /> 
  </div>
  <span className="text-[18px] font-bold tracking-tight">Regresar</span>
</button>
      {activeModule === "BODEGA_INT" && <BodegaIntModule />}
      {activeModule === "BODEGA_EXT" && <BodegaExtModule />}
      {activeModule === "COMPRADOR" && <CompradorModule />}
      {activeModule === "PROVEEDOR" && <ProveedorModule />}
      {activeModule === "TRANSPORTE" && <TransportesModule />}
    </section>
  );
};

export default ReportesSection;