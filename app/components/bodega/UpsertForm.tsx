import type { UpsertFormProps } from "../../interfaces/bodega/UpsertForm";


export default function UpsertForm({
  slots,
  position,
  itemId,
  temperature,
  onPositionChange,
  onItemIdChange,
  onTemperatureChange,
  onSubmit,
  submitLabel = "Guardar",
  disabled = false,
  helperText,
}: UpsertFormProps) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">
        Registrar o actualizar posición
      </h2>
      {helperText ? (
        <p className="mt-2 text-sm text-slate-600">{helperText}</p>
      ) : null}
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
        <label className="text-sm font-medium text-slate-600">
          Id del objeto
        </label>
        <input
          value={itemId}
          onChange={(event) => onItemIdChange(event.target.value)}
          disabled={disabled}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100"
          placeholder="Ej: LOTE-AX12"
        />
        <label className="text-sm font-medium text-slate-600">
          Temperatura (°C)
        </label>
        <input
          value={temperature}
          onChange={(event) => onTemperatureChange(event.target.value)}
          type="number"
          disabled={disabled}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100"
          placeholder="Ej: -18"
        />
        <button
          onClick={onSubmit}
          disabled={disabled}
          className="mt-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {submitLabel}
        </button>
      </div>
    </div>
  );
}
