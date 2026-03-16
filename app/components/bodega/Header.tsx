import { FiLogOut, FiMenu, FiX } from "react-icons/fi";
import { useState } from "react";
import type { HeaderProps } from "../../interfaces/bodega/Header";
import type { Role } from "../../interfaces/bodega";
import SearchForm from "./SearchForm";

interface ExtendedHeaderProps extends HeaderProps {
  userDisplayName?: string;
  onLogout?: () => void;
  role?: Role;
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
}: ExtendedHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const canSelectWarehouse =
    role === "administrador" && Array.isArray(warehouses) && warehouses.length > 0 && onSelectWarehouse;

  return (
    <header className="w-full bg-white rounded-xl shadow-sm border border-slate-200 px-4 py-2">
      {/* ===== HEADER DESKTOP ===== */}
      <div className="hidden md:flex items-center justify-between gap-6">
        {/* Izquierda: icono + ocupadas */}
        {/* Ocupadas eliminado, ahora solo en el mapa */}

        {/* Centro: meta */}
        <div className="flex items-center gap-6 text-sm">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-slate-500">ID Bodega</span>
            {canSelectWarehouse ? (
              <div className="flex items-center gap-2">
                <select
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm shadow-sm focus:border-emerald-500 focus:outline-none"
                  value={warehouseId}
                  onChange={(event) => onSelectWarehouse?.(event.target.value)}
                >
                  {warehouses?.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name ? `${item.name} (${item.id})` : item.id}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="font-semibold">{warehouseId ?? "--"}</div>
            )}
          </div>
          <div>
            <span className="text-xs text-slate-500">Fecha</span>
            <div className="font-semibold">{dateLabel}</div>
          </div>
        </div>

        {/* Derecha: acciones */}
        <div className="flex items-center gap-3">
          {canSearch &&
            searchValue !== undefined &&
            onSearchChange &&
            onSearchSubmit && (
              <div className="w-56">
                <SearchForm
                  value={searchValue}
                  onChange={onSearchChange}
                  onSubmit={onSearchSubmit}
                />
              </div>
            )}
          <div className="mx-2 h-8 w-px bg-slate-200" />
          {userDisplayName && (
            <span className="bg-slate-100 px-3 py-1.5 rounded text-sm font-semibold">
              {userDisplayName}
            </span>
          )}

          {onLogout && (
            <button
              onClick={onLogout}
              className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded flex items-center gap-2 text-sm"
            >
              <FiLogOut className="w-4 h-4" />
              Cerrar sesión
            </button>
          )}
        </div>
      </div>

      {/* ===== HEADER MÓVIL ===== */}
      <div className="md:hidden flex items-center justify-between">
        {/* Ocupadas eliminado, ahora solo en el mapa */}

        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="p-2 rounded-lg hover:bg-slate-100"
        >
          {menuOpen ? <FiX size={20} /> : <FiMenu size={20} />}
        </button>
      </div>

      {/* ===== MENÚ MÓVIL ===== */}
      {menuOpen && (
        <div className="md:hidden mt-4 border-t pt-4 flex flex-col gap-4">
          <div className="flex gap-6 text-sm">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-slate-500">ID Bodega</span>
              {canSelectWarehouse ? (
                <div className="flex items-center gap-2">
                  <select
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm shadow-sm focus:border-emerald-500 focus:outline-none"
                    value={warehouseId}
                    onChange={(event) => onSelectWarehouse?.(event.target.value)}
                  >
                    {warehouses?.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name ? `${item.name} (${item.id})` : item.id}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="font-semibold">{warehouseId ?? "--"}</div>
              )}
            </div>
            <div>
              <span className="text-xs text-slate-500">Fecha</span>
              <div className="font-semibold">{dateLabel}</div>
            </div>
          </div>
          {/* Ocupadas eliminado, ahora solo en el mapa */}
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
          {userDisplayName && (
            <span className="bg-slate-100 px-3 py-2 rounded font-semibold text-sm">
              {userDisplayName}
            </span>
          )}
          {onLogout && (
            <button
              onClick={onLogout}
              className="bg-red-500 text-white px-4 py-2 rounded flex items-center gap-2"
            >
              <FiLogOut />
              Cerrar sesión
            </button>
          )}
        </div>
      )}
    </header>
  );
}
