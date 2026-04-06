import { HiOutlinePencilSquare, HiOutlineTrash } from "react-icons/hi2";
import { Provider } from "@/app/types/provider";

interface Props {
  providers: Provider[];
  onEdit: (provider: Provider) => void;
  onDelete: (id: string) => void;
  /** Al hacer clic en la fila (no en acciones) se selecciona el proveedor. */
  onSelectProvider?: (provider: Provider) => void;
}

export const ProviderTable = ({ providers, onEdit, onDelete, onSelectProvider }: Props) => {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                ID
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Código
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Proveedor
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Nombre
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Teléfono
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Email
              </th>
              <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {providers.map((p) => (
              <tr
                key={p.id}
                className={`border-b border-slate-100 transition-colors hover:bg-violet-50/80 ${onSelectProvider ? "cursor-pointer" : ""}`}
                onClick={() => onSelectProvider?.(p)}
              >
                <td className="whitespace-nowrap px-4 py-3 text-[13px] tabular-nums text-slate-600">
                  {p.numericId}
                </td>
                <td className="whitespace-nowrap px-4 py-3 font-mono text-[13px] font-semibold text-slate-900">
                  {p.code}
                </td>
                <td className="px-4 py-3 text-[13px] font-medium text-slate-800">{p.name}</td>
                <td className="px-4 py-3 text-[13px] text-slate-700">{p.nombre?.trim() || "—"}</td>
                <td className="px-4 py-3 text-[13px] text-slate-700">{p.telefono?.trim() || "—"}</td>
                <td className="max-w-[200px] break-all px-4 py-3 text-[13px] text-slate-700">
                  {p.email?.trim() || "—"}
                </td>
                <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => onEdit(p)}
                      className="rounded-lg p-2 text-sky-600 transition-colors hover:bg-sky-50 hover:text-sky-800"
                      title="Editar"
                    >
                      <HiOutlinePencilSquare size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={() => p.id && onDelete(p.id)}
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
      {providers.length === 0 && (
        <div className="border-t border-slate-100 px-4 py-12 text-center text-sm text-slate-500">
          No hay proveedores registrados.
        </div>
      )}
    </div>
  );
};