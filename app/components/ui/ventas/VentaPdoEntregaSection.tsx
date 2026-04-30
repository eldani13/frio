"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ViajeVentaTransporteService } from "@/app/services/viajeVentaTransporteService";
import type { ViajeVentaTransporte } from "@/app/types/viajeVentaTransporte";
import type { VentaRecepcionBodega } from "@/app/types/ventaCuenta";

function ventaEstaCerrada(estado: string): boolean {
  const e = String(estado ?? "").trim();
  return e === "Cerrado(ok)" || e === "Cerrado(no ok)";
}

function formatoFechaHora(ms?: number): string {
  if (!ms || !Number.isFinite(ms)) return "—";
  try {
    return new Date(ms).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return "—";
  }
}

function etiquetaCamion(v: ViajeVentaTransporte): string {
  const partes = [
    v.truckPlate?.trim(),
    v.truckCode?.trim(),
    [v.truckBrand, v.truckModel].filter(Boolean).join(" ").trim() || undefined,
    v.truckType?.trim(),
  ].filter(Boolean);
  return partes.length ? partes.join(" · ") : "—";
}

/** Última entrega registrada (por `entregadoAt` / `createdAt`). */
function viajeEntregadoMasReciente(viajes: ViajeVentaTransporte[]): ViajeVentaTransporte | null {
  const ent = viajes.filter((x) => String(x.estado ?? "").trim() === "Entregado");
  if (!ent.length) return null;
  return [...ent].sort((a, b) => {
    const tb = Number(b.entregadoAt ?? b.createdAt ?? 0);
    const ta = Number(a.entregadoAt ?? a.createdAt ?? 0);
    return tb - ta;
  })[0];
}

export function VentaPdoEntregaSection({
  clientId,
  ventaId,
  estadoVenta,
  recepcionBodega,
}: {
  clientId: string;
  ventaId: string;
  estadoVenta: string;
  recepcionBodega?: VentaRecepcionBodega;
}) {
  const [viajes, setViajes] = useState<ViajeVentaTransporte[]>([]);
  const [primeraCarga, setPrimeraCarga] = useState(false);

  const cerrada = ventaEstaCerrada(estadoVenta);

  useEffect(() => {
    if (!cerrada) {
      setViajes([]);
      setPrimeraCarga(true);
      return;
    }
    const cid = String(clientId ?? "").trim();
    const vid = String(ventaId ?? "").trim();
    if (!cid || !vid) {
      setViajes([]);
      setPrimeraCarga(true);
      return;
    }
    setPrimeraCarga(false);
    const unsub = ViajeVentaTransporteService.subscribeParaVenta(cid, vid, (list) => {
      setViajes(list);
      setPrimeraCarga(true);
    });
    return () => unsub();
  }, [cerrada, clientId, ventaId]);

  const viaje = useMemo(() => viajeEntregadoMasReciente(viajes), [viajes]);

  if (!cerrada) return null;

  if (!primeraCarga) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
        Cargando constancia de entrega…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Constancia de entrega (PDO)</p>

      {viaje ? (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
            <span>
              Viaje <span className="font-mono font-semibold text-slate-900">{viaje.numero || viaje.id}</span>
            </span>
            {viaje.ventaEstadoResultante ? (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-800">
                Resultado: {viaje.ventaEstadoResultante}
              </span>
            ) : null}
          </div>

          {viaje.evidenciaFotoUrl?.trim() ? (
            <div>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">Foto de la entrega</p>
              <a
                href={viaje.evidenciaFotoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={viaje.evidenciaFotoUrl}
                  alt="Evidencia fotográfica de la entrega"
                  className="max-h-56 w-full object-contain"
                />
              </a>
            </div>
          ) : null}

          {viaje.firmaDataUrl?.trim() ? (
            <div>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                Firma de quien recibe
              </p>
              <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={viaje.firmaDataUrl}
                  alt="Firma del receptor"
                  className="max-h-40 w-full object-contain"
                />
              </div>
            </div>
          ) : null}

          <div className="grid gap-2 text-xs text-slate-700 sm:grid-cols-2">
            <div>
              <span className="font-semibold text-slate-500">Entrega registrada</span>
              <p className="mt-0.5 font-medium text-slate-900">{formatoFechaHora(viaje.entregadoAt)}</p>
            </div>
            <div>
              <span className="font-semibold text-slate-500">Registró (transporte)</span>
              <p className="mt-0.5 font-medium text-slate-900">{viaje.entregadoPorNombre?.trim() || "—"}</p>
            </div>
            <div>
              <span className="font-semibold text-slate-500">Camión</span>
              <p className="mt-0.5 font-medium text-slate-900">{etiquetaCamion(viaje)}</p>
            </div>
            <div>
              <span className="font-semibold text-slate-500">Conforme en destino</span>
              <p className="mt-0.5 font-medium text-slate-900">
                {viaje.entregaConforme === true ? "Sí" : viaje.entregaConforme === false ? "No" : "—"}
              </p>
            </div>
          </div>

          {viaje.descripcionIncidencia?.trim() ? (
            <div className="rounded-lg border border-amber-100 bg-amber-50/90 px-3 py-2 text-xs text-amber-950">
              <span className="font-bold">Incidencia / observación:</span> {viaje.descripcionIncidencia.trim()}
            </div>
          ) : null}

          {viaje.lineItemsEntregados?.length ? (
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                Cantidades en destino
              </p>
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="px-3 py-2 font-bold text-slate-500">Producto</th>
                      <th className="w-16 px-2 py-2 text-right font-bold text-slate-500">Esp.</th>
                      <th className="w-16 px-2 py-2 text-right font-bold text-slate-500">Entr.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {viaje.lineItemsEntregados.map((li, i) => (
                      <tr key={`${li.titleSnapshot}-${i}`}>
                        <td className="px-3 py-2 font-medium text-slate-900">{li.titleSnapshot || "—"}</td>
                        <td className="px-2 py-2 text-right tabular-nums text-slate-600">{li.cantidadEsperada}</td>
                        <td className="px-2 py-2 text-right tabular-nums font-semibold text-slate-900">
                          {li.cantidadEntregada}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {recepcionBodega ? (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 text-sm text-emerald-950">
          <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-800">Recepción en bodega</p>
          <p className="mt-1 text-xs">
            {recepcionBodega.sinDiferencias ? "Sin diferencias respecto al pedido." : "Con diferencias en cantidades."}{" "}
            · Cerrada {formatoFechaHora(recepcionBodega.cerradaAt)}
            {recepcionBodega.cerradaPorNombre?.trim() ? (
              <>
                {" "}
                por <span className="font-semibold">{recepcionBodega.cerradaPorNombre.trim()}</span>
              </>
            ) : null}
          </p>
          {recepcionBodega.lineas?.length ? (
            <ul className="mt-2 space-y-1 border-t border-emerald-200/80 pt-2 text-xs">
              {recepcionBodega.lineas.map((ln, idx) => (
                <li key={idx} className="flex justify-between gap-2">
                  <span className="min-w-0 flex-1">{ln.titleSnapshot || "—"}</span>
                  <span className="shrink-0 tabular-nums font-medium">Recibido: {ln.cantidadRecibida}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {!viaje && !recepcionBodega ? (
        <p className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          No hay constancia de entrega con transporte (foto/firma) asociada a esta venta. Si se cerró solo por otro
          flujo, puede no haberse registrado PDO aquí.
        </p>
      ) : null}
    </div>
  );
}
