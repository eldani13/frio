import { FiLogOut, FiMenu, FiPlus, FiX } from "react-icons/fi";
import { useState } from "react";
import type { HeaderProps } from "../../interfaces/bodega/Header";
import type { Role } from "../../interfaces/bodega";
import SearchForm from "./SearchForm";
import {  HiOutlineSquares2X2 } from 'react-icons/hi2';

interface ExtendedHeaderProps extends HeaderProps {
  userDisplayName?: string;
  onLogout?: () => void;
  role?: Role;
  onGoMenu?: () => void;
  /** Solo administrador de cuenta (rol `cliente`): tarea para el configurador. */
  onCrearTarea?: () => void;
}

export default function Header({
  dateLabel,
  warehouseId: _warehouseId,
  warehouses: _warehouses,
  onSelectWarehouse: _onSelectWarehouse,
  canSearch,
  searchValue,
  onSearchChange,
  onSearchSubmit,
  userDisplayName,
  onLogout,
  role,
  onGoMenu,
  onCrearTarea,
}: ExtendedHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const roleLabel =
    role === "operadorCuentas"
      ? "Operador de cuentas"
      : role === "cliente"
        ? "Administrador de cuenta"
        : role;

  return (
    <header className="w-full bg-white shadow-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 py-3">

        {/* ===== DESKTOP ===== */}
        <div className="hidden md:flex items-center justify-between">

          {/* LEFT SECTION */}
          <div className="flex items-center gap-8">

            {/* Date */}
            <div className="flex flex-col">
              <span className="text-xs text-slate-400 uppercase tracking-wide">
                Fecha
              </span>
              <span className="font-semibold text-slate-700 mt-1">
                {dateLabel}
              </span>
            </div>


            {/* Menu button */}
            <button
              type="button"
              onClick={() => onGoMenu?.()}
              
              className="flex items-center gap-2 px-4 py-2 border-4 border-[#A8D5BA] rounded-[10px] text-[#2D5A3F] transition-all hover:bg-[#A8D5BA]/10 cursor-pointer active:scale-95"
            >
              
              <HiOutlineSquares2X2 size={24} />
              <span className="text-[14px] font-medium">Menú</span>
            </button>

          
          </div>

          {/* RIGHT SECTION */}
          <div className="flex items-center gap-3 flex-nowrap">

            <div className="h-8 w-px bg-slate-200" />

            {onCrearTarea ? (
              <button
                type="button"
                onClick={onCrearTarea}
                className="group inline-flex max-w-[9.5rem] flex-col items-center gap-0.5 bg-transparent px-1 py-0.5 text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 focus-visible:ring-offset-2 rounded-md"
                title="Enviar una tarea al configurador"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-slate-400 text-slate-600 transition group-hover:border-[#2D5A3F] group-hover:bg-[#f0fdf4] group-hover:text-[#1B4332]">
                  <FiPlus className="h-4 w-4" strokeWidth={2.5} aria-hidden />
                </span>
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 group-hover:text-[#1B4332]">
                  Crear tarea
                </span>
              </button>
            ) : null}

            {onCrearTarea ? <div className="h-8 w-px bg-slate-200" /> : null}

            {/* PERFIL DE USUARIO */}
            <div className="flex items-center gap-3">
              {userDisplayName && (
                <div className="w-10 h-10 rounded-full bg-[#A8D5BA] flex items-center justify-center text-[#1B3B29] font-bold text-[16px]">
                  {userDisplayName.charAt(0).toUpperCase()}
                </div>
              )}
              
              <div className="flex flex-col">
                <h3 className="text-[16px] font-semibold text-gray-800 leading-tight">
                {userDisplayName}
                </h3>
                <span className="text-[12px] text-gray-400 font-normal">
                {roleLabel}
                </span>
              </div>

              
            </div>
            

            {/* LOGOUT */}
            {onLogout && (
              <button
                onClick={onLogout}
                className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap cursor-pointer active:scale-95 "
              >
                <FiLogOut size={16} />
                Cerrar sesión
              </button>
            )}

          </div>

        </div>

        {/* ===== MOBILE HEADER ===== */}
        <div className="md:hidden flex items-center justify-between">

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 rounded-lg hover:bg-slate-100"
          >
            {menuOpen ? <FiX size={22} /> : <FiMenu size={22} />}
          </button>

          {userDisplayName && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white text-sm font-bold">
                {userDisplayName.charAt(0).toUpperCase()}
              </div>
            </div>
          )}

        </div>

        {/* ===== MOBILE MENU ===== */}
        {menuOpen && (
          <div className="md:hidden mt-4 pt-4 border-t flex flex-col gap-4">
            {/* Date */}
            <div>
              <span className="text-xs text-slate-400 uppercase">Fecha</span>
              <div className="font-semibold">{dateLabel}</div>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => onGoMenu?.()}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 font-medium transition"
            >
              <span className="text-base">🏠</span>
              Volver al menú
            </button>

            {onCrearTarea ? (
              <button
                type="button"
                onClick={onCrearTarea}
                className="flex w-full items-center justify-center gap-2 border border-dashed border-slate-400 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-[#2D5A3F] hover:bg-[#f0fdf4] hover:text-[#1B4332]"
              >
                <FiPlus className="h-4 w-4" />
                Crear tarea
              </button>
            ) : null}

            {canSearch &&
              searchValue !== undefined &&
              onSearchChange &&
              onSearchSubmit && (
                <SearchForm
                  value={searchValue}
                  onChange={onSearchChange}
                  onSubmit={onSearchSubmit}
                />
              )}

            {onLogout && (
              <button
                onClick={onLogout}
                className="flex items-center justify-center gap-2 border border-red-200 text-red-600 hover:bg-red-50 py-2 rounded-lg transition"
              >
                <FiLogOut size={16} />
                Cerrar sesión
              </button>
            )}

          </div>
        )}

      </div>
    </header>
  );
}