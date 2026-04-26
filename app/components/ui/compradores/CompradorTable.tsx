"use client";
import { HiOutlinePencilSquare, HiOutlineTrash } from "react-icons/hi2";
import { Comprador } from "@/app/types/comprador";

interface Props {
  compradores: Comprador[];
  onEdit: (comprador: Comprador) => void;
  onDelete: (id: string) => void;
}

export const CompradorTable = ({ compradores, onEdit, onDelete }: Props) => {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Código
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Comprador
              </th>
              <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {compradores.map((c) => (
              <tr key={c.id} className="border-b border-slate-100 transition-colors hover:bg-violet-50/80">
                <td className="whitespace-nowrap px-4 py-3 font-mono text-[13px] font-semibold text-slate-900">
                  {String(c.code ?? "").trim() || "—"}
                </td>
                <td className="px-4 py-3 text-[13px] font-medium text-slate-800">{c.name}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => onEdit(c)}
                      className="rounded-lg p-2 text-sky-600 transition-colors hover:bg-sky-50 hover:text-sky-800"
                      title="Editar Comprador"
                    >
                      <HiOutlinePencilSquare size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={() => c.id && onDelete(c.id)}
                      className="rounded-lg p-2 text-rose-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                      title="Eliminar Comprador"
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

      {compradores.length === 0 && (
        <div className="border-t border-slate-100 px-4 py-12 text-center text-sm text-slate-500">
          No hay compradores registrados.
        </div>
      )}
    </div>
  );
};