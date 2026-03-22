export default function ListadoCargue() {
    const datos = [
      { lote: 'L-992', descripcion: 'HAMBURGUESA DE CARNE', cantidad: 4, estado: 'Buen estado' },
      { lote: 'L-995', descripcion: 'CARNE DE RES FRANCESA', cantidad: 8, estado: 'Buen estado' },
      { lote: 'L-996', descripcion: 'MUSLO DE POLLO', cantidad: 5, estado: 'Buen estado' },
      { lote: 'L-997', descripcion: 'CARNE MOLIDA', cantidad: 1, estado: 'Buen estado' },
    ];
  
    const totalKg = datos.reduce((acc, current) => acc + current.cantidad, 0);
  
    return (
      <div className="border border-slate-100 rounded-2xl overflow-hidden font-['Inter'] bg-white shadow-sm">
        {/* Cabecera sutil */}
        <div className="bg-[#A8D5BA]/20 p-5 border-b border-slate-100">
          <h3 className="text-[18px] font-bold text-slate-800 tracking-tight uppercase">En Inventario COMPR</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-separate border-spacing-0">
            <thead>
              <tr className="bg-white">
                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Lote</th>
                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Descripción</th>
                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Cantidad</th>
                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="text-slate-700 text-[14px]">
              {datos.map((d) => (
                <tr key={d.lote} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 border-b border-slate-50 font-bold text-slate-900">{d.lote}</td>              
                  <td className="p-4 border-b border-slate-50">
                    <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg font-semibold text-[12px]">
                      {d.descripcion}
                    </span>
                  </td>
                  <td className="p-4 border-b border-slate-50 text-right font-bold text-slate-900 tabular-nums">
                    {d.cantidad} Kg
                  </td>
                  <td className="p-4 border-b border-slate-50 text-center">
                    <div className="flex justify-center items-center gap-2 font-medium">
                      <span className="w-2 h-2 rounded-full bg-[#A8D5BA]"></span>
                      {d.estado}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            {/* El tfoot debe ir así, sin texto suelto arriba */}
            <tfoot className="bg-slate-50/50">
              <tr>
                <td colSpan={2} className="p-5 text-sm font-bold text-slate-900 text-right uppercase tracking-wider">
                  Total Inventario
                </td>
                <td className="p-5 text-[18px] font-bold text-slate-950 text-right border-l border-slate-100 bg-white tabular-nums">
                  {totalKg} Kg
                </td>
                <td className="p-5 bg-white border-l border-slate-100"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    );
  }