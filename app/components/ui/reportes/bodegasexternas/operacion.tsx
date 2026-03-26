type Props = { totalKg: number; loading?: boolean; itemCount?: number };

export default function Operacion({ totalKg, loading, itemCount = 0 }: Props) {
  return (
    <div className="bg-slate-50/50 rounded-2xl border border-slate-100">
      <div className="p-5 text-sm font-bold text-slate-900 text-right uppercase tracking-wider">
        Total Inventario BEX
      </div>
      <div className="p-5 text-[24px] font-extrabold text-slate-950 text-right border-t border-slate-100 bg-white tabular-nums">
        {loading ? "Calculando…" : `${totalKg.toLocaleString("es-CO", { maximumFractionDigits: 2 })} Kg`}
      </div>
      <div className="p-5 text-xs text-slate-500 text-right uppercase tracking-widest">
        {loading ? "" : `${itemCount} registros`}
      </div>
    </div>
  );
}