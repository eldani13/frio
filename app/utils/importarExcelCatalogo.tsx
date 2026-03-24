import * as XLSX from 'xlsx';

interface ImportExcelProps {
  onDataLoaded: (data: any[]) => void;
}

export const ImportExcel = ({ onDataLoaded }: ImportExcelProps) => {
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (evt) => {
      // 1. Obtenemos el resultado como ArrayBuffer
      const arrayBuffer = evt.target?.result;
      if (!arrayBuffer) return;

      // 2. Leemos el buffer con XLSX (tipo 'buffer' o 'array')
      const wb = XLSX.read(arrayBuffer, { type: 'buffer' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      
      // 3. Convertir a JSON
      const rawData = XLSX.utils.sheet_to_json(ws);
      
      // Validación de campos obligatorios
      const validatedData = rawData.filter((row: any) => {
        return (
          row.title && 
          row.description && 
          row.provider && 
          row.category && 
          row.productType && 
          row.status
        );
      });

      if (validatedData.length < rawData.length) {
        alert(`${rawData.length - validatedData.length} filas omitidas por datos incompletos.`);
      }

      onDataLoaded(validatedData);
      
      // Limpiar el input para permitir cargar el mismo archivo dos veces
      e.target.value = "";
    };

    // La alternativa moderna y no depreciada:
    reader.readAsArrayBuffer(file);
  };

  return (
    <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-[14px] font-bold text-[14px] border border-gray-300 transition-all flex items-center gap-2">
      <span>📥 Importar Excel</span>
      <input 
        type="file" 
        accept=".xlsx, .xls" 
        className="hidden" 
        onChange={handleFileUpload} 
      />
    </label>
  );
};