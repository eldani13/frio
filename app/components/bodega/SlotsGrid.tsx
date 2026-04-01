import { useState } from "react";
import { FiArchive } from "react-icons/fi";
import type { SlotsGridProps } from "../../interfaces/bodega/SlotsGrid";
import type { Role } from "../../interfaces/bodega";
import SlotCard from "./SlotCard";

type ExtendedSlotsGridProps = SlotsGridProps & {
  occupiedCount?: number;
  totalSlots?: number;
  role?: Role;
};

export default function SlotsGrid({
  slots,
  selectedPosition,
  onSelect,
  headerActions,
  occupiedCount,
  totalSlots,
  role,
  page = 0,
  pageSize = slots.length,
  onPageChange,
}: ExtendedSlotsGridProps) {
  const [procesamientoModalOpen, setProcesamientoModalOpen] = useState(false);
  const showProcesamientoStrip = role === "administrador" || role === "jefe";
  const totalPages = Math.max(1, Math.ceil(slots.length / pageSize));
  const currentPage = Math.min(Math.max(page, 0), totalPages - 1);
  const start = currentPage * pageSize;
  const end = start + pageSize;
  const visibleSlots = slots.slice(start, end);
  return (
    <div className="self-start rounded-2xl bg-white p-2 sm:p-4 shadow-md border border-blue-200 w-full">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3 relative mb-3 sm:mb-4">
        <h2 className="text-sm sm:text-lg font-semibold text-slate-900 mb-2 sm:mb-4 flex items-center gap-1 sm:gap-2">
          <span className="inline-block">
            <FiArchive className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />
          </span>
          Mapa de Bodega
        </h2>
        <div className="flex items-center gap-2 sm:gap-3 sm:ml-auto relative z-10 mt-1 sm:mt-0">
          {headerActions ? <div>{headerActions}</div> : null}
          {(role === "administrador" || role === "jefe") && typeof occupiedCount === "number" && typeof totalSlots === "number" && (
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1 shadow text-xs font-semibold text-blue-900">
              <FiArchive className="w-4 h-4 text-blue-500" />
              Ocupadas: {occupiedCount} / {totalSlots}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-2 sm:gap-4">
        {visibleSlots.map((slot) => (
          <SlotCard
            key={slot.position}
            slot={slot}
            isSelected={slot.position === selectedPosition}
            onSelect={onSelect}
          />
        ))}
      </div>
      {showProcesamientoStrip ? (
        <button
          type="button"
          onClick={() => setProcesamientoModalOpen(true)}
          className="mt-3 w-full rounded-xl border border-blue-200 bg-slate-50 py-3 px-4 text-center text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-blue-50 hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          Procesamiento
        </button>
      ) : null}
      {totalPages > 1 ? (
        <div className="flex items-center justify-between mt-3 text-xs text-slate-700">
          <button
            type="button"
            className="rounded-lg border border-slate-200 px-3 py-1 bg-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => onPageChange?.(Math.max(0, currentPage - 1))}
            disabled={currentPage === 0}
          >
            Anterior
          </button>
          <span className="font-semibold">
            {currentPage + 1} de {totalPages}
          </span>
          <button
            type="button"
            className="rounded-lg border border-slate-200 px-3 py-1 bg-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => onPageChange?.(Math.min(totalPages - 1, currentPage + 1))}
            disabled={currentPage >= totalPages - 1}
          >
            Siguiente
          </button>
        </div>
      ) : null}
      {/* Indicador de estado alineado a la derecha debajo del grid */}
      <div className="flex justify-end mt-2 sm:mt-4">
        <div className="flex flex-wrap items-center gap-1 sm:gap-3">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-cyan-400 inline-block"></span>
            <span className="text-[10px] sm:text-xs text-slate-600">
              Ocupada
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-slate-300 inline-block"></span>
            <span className="text-[10px] sm:text-xs text-slate-600">Vacía</span>
          </div>
        </div>
      </div>
      {procesamientoModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="procesamiento-modal-title"
          onClick={() => setProcesamientoModalOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-blue-200 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="procesamiento-modal-title" className="text-lg font-semibold text-slate-900 text-center">
              Procesamiento
            </h3>
            <p className="mt-3 text-center text-sm text-slate-600">Disponible próximamente</p>
            <button
              type="button"
              onClick={() => setProcesamientoModalOpen(false)}
              className="mt-6 w-full rounded-lg border border-slate-200 bg-white py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cerrar
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
