export default function Operacion() {
  const datos = [
    { lote: 'L-992', descripcion: 'HAMBURGUESA DE CARNE', cantidad: 4, estado: 'Buen estado' },
    { lote: 'L-995', descripcion: 'CARNE DE RES FRANCESA', cantidad: 8, estado: 'Buen estado' },
    { lote: 'L-996', descripcion: 'MUSLO DE POLLO', cantidad: 5, estado: 'Buen estado' },
    { lote: 'L-996', descripcion: 'CARNE MOLIDA', cantidad: 1, estado: 'Buen estado' },
  ];
  
    const totalKg = datos.reduce((acc, current) => acc + current.cantidad, 0);
  
    return (
      <div className="bg-slate-50/50">
        <div>
          <div className="p-5 text-sm font-bold text-slate-900 text-right uppercase tracking-wider">
            Total inventario venta
          </div>
          <div className="p-5 text-base font-bold text-slate-950 text-right border-l border-slate-100 bg-white tabular-nums">
            {totalKg} Kg
          </div>
          
        </div>
      </div>
    );
  }