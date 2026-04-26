"use client";

import { useEffect, useState } from "react";
import { CatalogoService } from "@/app/services/catalogoService";
import { formatoPrecioCatalogo } from "@/lib/catalogoPrecio";

/**
 * Resuelve el precio del secundario leyendo `clientes/{clientId}/productos/{productoSecundarioId}`.
 * Útil cuando la UI no tiene el catálogo completo en memoria (cola, modal multi-cuenta).
 */
export function PrecioSecundarioCatalogoLive({
  clientId,
  productoSecundarioId,
  className,
}: {
  clientId?: string | null;
  productoSecundarioId?: string | null;
  className?: string;
}) {
  const [texto, setTexto] = useState<string | null>(null);

  useEffect(() => {
    const cid = String(clientId ?? "").trim();
    const sid = String(productoSecundarioId ?? "").trim();
    if (!cid || !sid) {
      setTexto("—");
      return;
    }
    let cancel = false;
    setTexto(null);
    void CatalogoService.getById(cid, sid).then((p) => {
      if (cancel) return;
      setTexto(p ? formatoPrecioCatalogo(p) : "—");
    });
    return () => {
      cancel = true;
    };
  }, [clientId, productoSecundarioId]);

  if (texto === null) {
    return <span className={className}>…</span>;
  }
  return <span className={className}>{texto}</span>;
}
