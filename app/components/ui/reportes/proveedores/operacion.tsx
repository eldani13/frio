export default function Operacion() {
    const datos = [
      { lote: 'L-992', descripcion: 'HAMBURGUESA DE CARNE', cantidad: 45, estado: 'Buen estado' },
      { lote: 'L-995', descripcion: 'CARNE DE RES FRANCESA', cantidad: 12, estado: 'Buen estado' },
      { lote: 'L-996', descripcion: 'MUSLO DE POLLO', cantidad: 20, estado: 'Buen estado' },
    ];
  
    const totalKg = datos.reduce((acc, current) => acc + current.cantidad, 0);
  
    return (
      <div className="bg-slate-50/50">
        <div>
          <div className="p-5 text-sm font-bold text-slate-900 text-right uppercase tracking-wider">
            Total Inventario PROVEEDORES
          </div>
          <div className="p-5 text-[18px] font-bold text-slate-950 text-right border-l border-slate-100 bg-white tabular-nums">
            {totalKg} Kg
          </div>
          
        </div>
      </div>
    );
  }