import type { RemoveFormProps } from "../../interfaces/bodega/RemoveForm";

export default function RemoveForm({
  slots,
  position,
  onPositionChange,
  onSubmit,
  submitLabel = "Retirar",
  disabled = false,
}: RemoveFormProps) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Retirar objeto</h2>
      <div className="mt-4 grid gap-3">
        <label className="text-sm font-medium text-slate-600">Posición</label>
        <select
          value={position}
          onChange={(event) => onPositionChange(Number(event.target.value))}
          disabled={disabled}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100"
        >
          {slots.map((slot) => (
            <option key={slot.position} value={slot.position}>
              {slot.position}
            </option>
          ))}
        </select>
        <button
          onClick={onSubmit}
          disabled={disabled}
          className="rounded-lg border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:bg-rose-50"
        >
          {submitLabel}
        </button>
      </div>
    </div>
  );
}
