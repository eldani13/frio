import { HiOutlinePencilSquare, HiOutlineTrash } from "react-icons/hi2";
import { Camion } from "@/app/types/camion";

interface Props {
  trucks: Camion[];
  onEdit: (truck: Camion) => void;
  onDelete: (id: string) => void;
}

export const TruckTable = ({ trucks, onEdit, onDelete }: Props) => {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1200px] border-collapse text-left text-sm">
          <thead>
            <tr className="bg-slate-50 [&>th]:border-b [&>th]:border-slate-200">
              <th className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                ID / Cód
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Placa
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Marca / Modelo
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-center text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Tipo
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Peso Máx
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Volumen
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-center text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Pallets
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Rango Temp
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-center text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Estado
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Creado
              </th>
              <th className="sticky right-0 z-20 bg-slate-50 px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-500 shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.05)]">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {trucks.map((t) => (
              <tr
                key={t.id}
                className="group border-b border-slate-100 transition-colors hover:bg-violet-50/80"
              >
                <td className="bg-white px-4 py-3 group-hover:bg-violet-50/80">
                  <div className="flex flex-col">
                    <span className="text-[12px] text-slate-500">#{t.numericId}</span>
                    <span className="font-mono text-[13px] font-semibold text-slate-900">{t.code}</span>
                  </div>
                </td>
                <td className="bg-white px-4 py-3 text-[13px] font-semibold uppercase text-slate-900 group-hover:bg-violet-50/80">
                  {t.plate}
                </td>
                <td className="bg-white px-4 py-3 text-[13px] text-slate-700 group-hover:bg-violet-50/80">
                  {t.brand} <span className="text-slate-500">({t.model})</span>
                </td>
                <td className="bg-white px-4 py-3 text-center group-hover:bg-violet-50/80">
                  <span
                    className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                      t.type === "Refrigerado"
                        ? "bg-sky-100 text-sky-800"
                        : t.type === "Seco"
                          ? "bg-amber-100 text-amber-900"
                          : "bg-violet-100 text-violet-800"
                    }`}
                  >
                    {t.type}
                  </span>
                </td>
                <td className="bg-white px-4 py-3 text-right text-[13px] font-medium tabular-nums text-slate-800 group-hover:bg-violet-50/80">
                  {t.maxWeightKg.toLocaleString()} kg
                </td>
                <td className="bg-white px-4 py-3 text-right text-[13px] font-medium tabular-nums text-slate-800 group-hover:bg-violet-50/80">
                  {t.maxVolumeM3} m³
                </td>
                <td className="bg-white px-4 py-3 text-center text-[13px] font-semibold text-slate-900 group-hover:bg-violet-50/80">
                  {t.palletCapacity}
                </td>
                <td className="bg-white px-4 py-3 text-[13px] italic text-slate-600 group-hover:bg-violet-50/80">
                  {t.tempRange || "N/A"}
                </td>
                <td className="bg-white px-4 py-3 text-center group-hover:bg-violet-50/80">
                  <span
                    className={`inline-flex items-center gap-1 text-[12px] font-semibold ${
                      t.isAvailable ? "text-emerald-700" : "text-rose-500"
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${t.isAvailable ? "bg-emerald-500" : "bg-rose-400"}`}
                    />
                    {t.isAvailable ? "Disponible" : "Ocupado"}
                  </span>
                </td>
                <td className="whitespace-nowrap bg-white px-4 py-3 text-[12px] text-slate-500 group-hover:bg-violet-50/80">
                  {new Date(t.createdAt).toLocaleDateString()}
                </td>
                <td className="sticky right-0 z-10 bg-white px-4 py-3 text-right shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.05)] transition-colors group-hover:bg-violet-50/80">
                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => onEdit(t)}
                      className="rounded-lg p-2 text-sky-600 transition-colors hover:bg-sky-50 hover:text-sky-800"
                      title="Editar"
                    >
                      <HiOutlinePencilSquare size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={() => t.id && onDelete(t.id)}
                      className="rounded-lg p-2 text-rose-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                      title="Eliminar"
                    >
                      <HiOutlineTrash size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {trucks.length === 0 && (
        <div className="border-t border-slate-100 px-4 py-12 text-center text-sm text-slate-500">
          No hay camiones registrados en el sistema.
        </div>
      )}
    </div>
  );
};