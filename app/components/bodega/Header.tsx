import { FiLogOut, FiMenu, FiX } from "react-icons/fi";
import { useState } from "react";
import type { HeaderProps } from "../../interfaces/bodega/Header";
import type { Role } from "../../interfaces/bodega";
import SearchForm from "./SearchForm";

interface ExtendedHeaderProps extends HeaderProps {
  userDisplayName?: string;
  onLogout?: () => void;
  role?: Role;
  onGoMenu?: () => void;
}

export default function Header({
  dateLabel,
  warehouseId,
  warehouses,
  onSelectWarehouse,
  canSearch,
  searchValue,
  onSearchChange,
  onSearchSubmit,
  userDisplayName,
  onLogout,
  role,
  onGoMenu,
}: ExtendedHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const canSelectWarehouse =
    role === "administrador" &&
    Array.isArray(warehouses) &&
    warehouses.length > 0 &&
    onSelectWarehouse;

  return (
    <header className="w-full bg-white shadow-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 py-3">

        {/* ===== DESKTOP ===== */}
        <div className="hidden md:flex items-center justify-between">

          {/* LEFT SECTION */}
          <div className="flex items-center gap-8">

            {/* Warehouse */}
            <div className="flex flex-col">
              <span className="text-xs text-slate-400 uppercase tracking-wide">
                Bodega
              </span>

              {canSelectWarehouse ? (
                <select
                  className="mt-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium shadow-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none"
                  value={warehouseId}
                  onChange={(event) =>
                    onSelectWarehouse?.(event.target.value)
                  }
                >
                  {warehouses?.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name ? `${item.name} (${item.id})` : item.id}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="font-semibold text-slate-700 mt-1">
                  {warehouseId ?? "--"}
                </div>
              )}
            </div>

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
              className="ml-4 flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm font-semibold text-slate-700 transition"
            >
              <span className="text-base">🏠</span>
              Menú
            </button>

          </div>

          {/* RIGHT SECTION */}
          <div className="flex items-center gap-3 flex-nowrap">

            {canSearch &&
              searchValue !== undefined &&
              onSearchChange &&
              onSearchSubmit && (
                <div className="w-60 bg-slate-50 rounded-lg px-2 py-1 border border-slate-200">
                  <SearchForm
                    value={searchValue}
                    onChange={onSearchChange}
                    onSubmit={onSearchSubmit}
                  />
                </div>
              )}

            <div className="h-8 w-px bg-slate-200" />

            {/* USER */}
            {userDisplayName && (
              <div className="flex items-center gap-2 whitespace-nowrap">

                <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs font-bold">
                  {userDisplayName.charAt(0).toUpperCase()}
                </div>

                <span className="font-medium text-slate-700 text-sm">
                  {userDisplayName}
                </span>

              </div>
            )}

            {/* LOGOUT */}
            {onLogout && (
              <button
                onClick={onLogout}
                className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap"
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

            {/* Warehouse */}
            <div className="flex flex-col">
              <span className="text-xs text-slate-400 uppercase">Bodega</span>

              {canSelectWarehouse ? (
                <select
                  className="rounded-lg border border-slate-300 px-3 py-2 mt-1"
                  value={warehouseId}
                  onChange={(event) =>
                    onSelectWarehouse?.(event.target.value)
                  }
                >
                  {warehouses?.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name ? `${item.name} (${item.id})` : item.id}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="font-semibold mt-1">
                  {warehouseId ?? "--"}
                </div>
              )}
            </div>

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