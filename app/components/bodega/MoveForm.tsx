import type { MoveFormProps } from "../../interfaces/bodega/MoveForm";

export default function MoveForm({
  slots,
  from,
  to,
  onFromChange,
  onToChange,
  onSubmit,
  submitLabel = "Mover",
  disabled = false,
}: MoveFormProps) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">
        Mover objeto de posición
      </h2>
      <div className="mt-4 grid gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-slate-600">Origen</label>
            <select
              value={from}
              onChange={(event) => onFromChange(Number(event.target.value))}
              disabled={disabled}
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100"
            >
              {slots.map((slot) => (
                <option key={slot.position} value={slot.position}>
                  {slot.position}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-600">
              Destino
            </label>
            <select
              value={to}
              onChange={(event) => onToChange(Number(event.target.value))}
              disabled={disabled}
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100"
            >
              {slots.map((slot) => (
                <option key={slot.position} value={slot.position}>
                  {slot.position}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button
          onClick={onSubmit}
          disabled={disabled}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100"
        >
          {submitLabel}
        </button>
      </div>
    </div>
  );
}
