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
  titleActions,
  headerActions,
  occupiedCount,
  totalSlots,
  role,
  page = 0,
  pageSize = slots.length,
  onPageChange,
  clients,
  slotCantidadContext,
}: ExtendedSlotsGridProps) {
  const totalPages = Math.max(1, Math.ceil(slots.length / pageSize));
  const currentPage = Math.min(Math.max(page, 0), totalPages - 1);
  const start = currentPage * pageSize;
  const end = start + pageSize;
  const visibleSlots = slots.slice(start, end);
  return (
    <div className="flex w-full shrink-0 flex-col rounded-xl border border-slate-200 bg-white px-4 pb-4 pt-4 shadow-sm sm:px-6 sm:pb-5 sm:pt-5">
      <div className="mb-5 flex min-w-0 shrink-0 flex-col gap-4 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h2 className="flex min-w-0 items-center gap-2.5 text-[17px] font-bold leading-tight tracking-tight text-slate-900 sm:text-lg">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
              <FiArchive className="h-[18px] w-[18px] sm:h-5 sm:w-5" aria-hidden />
            </span>
            <span>Almacenamiento</span>
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:ml-auto sm:justify-end">
          {headerActions ? <div className="flex items-center gap-2">{headerActions}</div> : null}
          {titleActions ? <div className="flex shrink-0 items-center">{titleActions}</div> : null}
          {typeof occupiedCount === "number" &&
          typeof totalSlots === "number" &&
          role !== "administrador" ? (
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800">
              <FiArchive className="h-4 w-4 text-violet-500" aria-hidden />
              Ocupadas: {occupiedCount} / {totalSlots}
            </div>
          ) : null}
        </div>
      </div>

      <div className="min-w-0 space-y-3">
        <div className="grid w-full min-w-0 grid-cols-2 gap-1.5 sm:grid-cols-3 sm:gap-2 md:grid-cols-4 lg:grid-cols-4">
          {visibleSlots.map((slot) => (
            <SlotCard
              key={slot.position}
              slot={slot}
              isSelected={slot.position === selectedPosition}
              onSelect={onSelect}
              clients={clients}
              slotCantidadContext={slotCantidadContext}
            />
          ))}
        </div>
        {totalPages > 1 ? (
          <div className="flex items-center justify-between pt-1 text-xs text-slate-700">
            <button
              type="button"
              className="rounded-lg border border-slate-200 bg-white px-3 py-1 font-semibold disabled:cursor-not-allowed disabled:opacity-50"
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
              className="rounded-lg border border-slate-200 bg-white px-3 py-1 font-semibold disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => onPageChange?.(Math.min(totalPages - 1, currentPage + 1))}
              disabled={currentPage >= totalPages - 1}
            >
              Siguiente
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
