import type { SearchFormProps } from "../../interfaces/bodega/SearchForm";

export default function SearchForm({
  value,
  onChange,
  onSubmit,
}: SearchFormProps) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-sm text-slate-600 shadow-sm">
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-40 bg-transparent text-slate-700 outline-none"
        placeholder="Buscar id o nombre"
        aria-label="Buscar por id o nombre"
      />
      <button
        type="button"
        onClick={onSubmit}
        className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-50"
        aria-label="Buscar"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-3.5 w-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="7" />
          <line x1="16.65" y1="16.65" x2="21" y2="21" />
        </svg>
      </button>
    </div>
  );
}
