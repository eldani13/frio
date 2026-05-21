"use client";

import { useState } from "react";

type Props = {
  src: string;
  title?: string;
};

export default function ReporteLookerEmbed({
  src,
  title = "Reporte Looker Studio",
}: Props) {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-300">
      
      {/* Estado de Carga (Spinner / Skeleton) */}
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50/80 backdrop-blur-sm z-10 animate-fade-in">
          {/* Spinner animado */}
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
          <p className="mt-3 text-sm font-medium text-slate-500 animate-pulse">
            Cargando reporte de datos...
          </p>
        </div>
      )}

      {/* Iframe del Reporte */}
      <iframe
        title={title}
        src={src}
        // Agregamos opacity-0 mientras carga para evitar que se vea el iframe vacío
        className={`h-[min(70vh,720px)] w-full min-h-[450px] border-0 transition-opacity duration-500 ${
          isLoading ? "opacity-0" : "opacity-100"
        }`}
        allowFullScreen
        // onLoad detecta exactamente cuándo Looker Studio terminó de procesar el contenedor
        onLoad={() => setIsLoading(false)}
        sandbox="allow-storage-access-by-user-activation allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      />
    </div>
  );
}