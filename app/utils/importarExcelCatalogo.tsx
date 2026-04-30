"use client";

import * as XLSX from "xlsx";
import { swalInfo } from "@/lib/swal";
import type { ChangeEvent } from "react";
import { HiOutlineArrowDownTray } from "react-icons/hi2";

interface ImportExcelProps {
  onDataLoaded: (data: Record<string, unknown>[]) => void;
}

export const ImportExcel = ({ onDataLoaded }: ImportExcelProps) => {
  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
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
      const rawData = XLSX.utils.sheet_to_json(ws) as Record<string, unknown>[];
      
      // Validación de campos obligatorios
      const validatedData = rawData.filter((row: Record<string, unknown>) => {
        return Boolean(
          row.title &&
            row.description &&
            row.provider &&
            row.category &&
            row.productType &&
            row.status,
        );
      });

      if (validatedData.length < rawData.length) {
        void swalInfo(
          "Filas omitidas",
          `${rawData.length - validatedData.length} filas omitidas por datos incompletos.`,
        );
      }

      onDataLoaded(validatedData);
      
      // Limpiar el input para permitir cargar el mismo archivo dos veces
      e.target.value = "";
    };

    // La alternativa moderna y no depreciada:
    reader.readAsArrayBuffer(file);
  };

  return (
    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 shadow-none transition hover:border-slate-300 hover:bg-slate-50">
      <HiOutlineArrowDownTray className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
      <span>Importar Excel</span>
      <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleFileUpload} />
    </label>
  );
};