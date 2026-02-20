import { FiAlertTriangle, FiClipboard } from "react-icons/fi";
import type { HeaderProps } from "../../interfaces/bodega/Header";
import SearchForm from "./SearchForm";

interface ExtendedHeaderProps extends HeaderProps {
  userDisplayName?: string;
  onLogout?: () => void;
  alertCount?: number;
  onAlertsClick?: () => void;
  listCount?: number;
  onListClick?: () => void;
}

export default function Header({
  occupiedCount,
  totalSlots,
  dateLabel,
  warehouseId,
  warehouseName,
  showIntro = true,
  showMeta = true,
  canSearch,
  searchValue,
  onSearchChange,
  onSearchSubmit,
  userDisplayName,
  onLogout,
  alertCount,
  onAlertsClick,
  listCount,
  onListClick,
}: ExtendedHeaderProps) {
  return (
    <header className="relative flex flex-col gap-3">
      <div className="absolute right-0 -top-4 flex items-center gap-3">
        {onListClick && (listCount ?? 0) > 0 ? (
          <button
            type="button"
            onClick={onListClick}
            className="flex items-center gap-2 rounded-full bg-amber-500 px-3 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-amber-400"
            aria-label="Ver alertas asignadas"
          >
            <FiClipboard className="h-4 w-4" />
            {listCount ?? 0}
          </button>
        ) : null}
        {onAlertsClick && (alertCount ?? 0) > 0 ? (
          <button
            type="button"
            onClick={onAlertsClick}
            className="flex items-center gap-2 rounded-full bg-rose-600 px-3 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-rose-500"
            aria-label="Ver alertas"
          >
            <FiAlertTriangle className="h-4 w-4" />
            {alertCount ?? 0}
          </button>
        ) : null}
        {userDisplayName && (
          <span className="text-sm font-semibold text-slate-700">
            {userDisplayName}
          </span>
        )}
        {onLogout && (
          <button
            className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded"
            onClick={onLogout}
          >
            Cerrar sesión
          </button>
        )}
      </div>
      {/* {showIntro ? (
        <>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
            Bodega de frío
          </p>
          <h1 className="text-3xl font-semibold text-slate-900 sm:text-4xl">
            Control de {totalSlots} posiciones
          </h1>
          <p className="max-w-2xl text-base text-slate-600">
            Administra la temperatura y la posición de cada objeto almacenado.
            Puedes registrar, mover o retirar objetos y buscar por id.
          </p>
        </>
      ) : null} */}
      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
        {showMeta ? (
          <>
            <span className="rounded-full bg-white px-3 py-1 shadow-sm">
              Ocupadas: {occupiedCount} / {totalSlots}
            </span>
            {warehouseId ? (
              <span className="rounded-full bg-white px-3 py-1 shadow-sm">
                Id bodega: {warehouseId}
              </span>
            ) : null}
            {warehouseName ? (
              <span className="rounded-full bg-white px-3 py-1 shadow-sm">
                Nombre: {warehouseName}
              </span>
            ) : null}
            <span className="rounded-full bg-white px-3 py-1 shadow-sm">
              Fecha: {dateLabel}
            </span>
          </>
        ) : null}
        {canSearch && searchValue !== undefined && onSearchChange && onSearchSubmit ? (
          <SearchForm
            value={searchValue}
            onChange={onSearchChange}
            onSubmit={onSearchSubmit}
          />
        ) : null}
      </div>
    </header>
  );
}
