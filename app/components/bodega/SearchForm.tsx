import type { SearchFormProps } from "../../interfaces/bodega/SearchForm";

export default function SearchForm({
  value,
  onChange,
  onSubmit,
}: SearchFormProps) {
  return (
    <div className="flex items-center rounded-lg bg-slate-100 px-4 py-2 w-full max-w-xs">
      {/* Icono de búsqueda */}
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-5 w-5 text-slate-400 mr-2"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="11" cy="11" r="7" />
        <line x1="16.65" y1="16.65" x2="21" y2="21" />
      </svg>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="bg-transparent text-slate-600 placeholder:text-slate-400 outline-none w-full text-sm"
        placeholder="Buscar id o nombre"
        aria-label="Buscar por id o nombre"
        onKeyDown={e => e.key === 'Enter' && onSubmit()}
      />
    </div>
  );
}