"use client";

import React, { useEffect, useRef, useState } from "react";
import { FiCamera, FiCheckCircle, FiPackage, FiX } from "react-icons/fi";
import { HiOutlineTruck } from "react-icons/hi2";
import { formatKgEs } from "@/app/lib/decimalEs";
import { ViajeVentaTransporteService } from "@/app/services/viajeVentaTransporteService";
import type { ViajeLineaEntrega, ViajeVentaTransporteConContext } from "@/app/types/viajeVentaTransporte";

type Props = {
  uid: string;
  displayName: string;
};

function firmaCanvasToDataUrl(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL("image/jpeg", 0.82);
}

/** Evita que la subida o Firestore queden colgadas sin resolver (red / Storage / reglas). */
function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () =>
        reject(
          new Error(
            `${message} Si ya pasó mucho tiempo, cancelá, revisá la conexión o probá con una foto más liviana.`,
          ),
        ),
      ms,
    );
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

const PASOS_ENTREGA = 4;

export function TransporteViajesPanel({ uid, displayName }: Props) {
  const [viajes, setViajes] = useState<ViajeVentaTransporteConContext[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sel, setSel] = useState<ViajeVentaTransporteConContext | null>(null);
  /** 0 checklist · 1 foto · 2 firma · 3 conforme */
  const [pasoEntrega, setPasoEntrega] = useState(0);
  const [lineaVerificada, setLineaVerificada] = useState<Record<number, boolean>>({});
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [cantidades, setCantidades] = useState<Record<number, string>>({});
  /** null hasta elegir en el último paso */
  const [conforme, setConforme] = useState<boolean | null>(null);
  const [descripcion, setDescripcion] = useState("");
  const [firmaDataUrlCapturada, setFirmaDataUrlCapturada] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const firmaDibujadaRef = useRef(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const unsub = ViajeVentaTransporteService.subscribeEnCursoGlobal(
      (items) => {
        setViajes(items);
        setLoading(false);
        setError(null);
      },
      () => {
        setViajes([]);
        setError("No se pudieron cargar los viajes en vivo. Revisá permisos y conexión.");
        setLoading(false);
      },
    );
    return () => unsub();
  }, []);

  /** Si el viaje abierto ya no está «En curso» (p. ej. otra pestaña o entrega), cerrar el modal. */
  useEffect(() => {
    if (!sel) return;
    const exists = viajes.some(
      (v) => v.id === sel.id && v.ventaId === sel.ventaId && v.idClienteDueno === sel.idClienteDueno,
    );
    if (!exists) setSel(null);
  }, [viajes, sel]);

  useEffect(() => {
    if (!sel) {
      setPasoEntrega(0);
      setLineaVerificada({});
      setFotoFile(null);
      setFotoPreview(null);
      setCantidades({});
      setConforme(null);
      setDescripcion("");
      setFirmaDataUrlCapturada(null);
      setSaveErr(null);
      return;
    }
    const next: Record<number, string> = {};
    const chk: Record<number, boolean> = {};
    (sel.lineItemsEsperados ?? []).forEach((li, i) => {
      next[i] = String(li.cantidad ?? "");
      chk[i] = false;
    });
    setCantidades(next);
    setLineaVerificada(chk);
    setPasoEntrega(0);
    setFotoFile(null);
    setFotoPreview(null);
    setConforme(null);
    setDescripcion("");
    setFirmaDataUrlCapturada(null);
    setSaveErr(null);
    firmaDibujadaRef.current = false;
    const c = canvasRef.current;
    if (c) {
      const ctx = c.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, c.width, c.height);
      }
    }
  }, [sel]);

  useEffect(() => {
    if (!sel || pasoEntrega !== 2) return;
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    if (!firmaDataUrlCapturada) {
      firmaDibujadaRef.current = false;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, c.width, c.height);
    }
  }, [sel, pasoEntrega, firmaDataUrlCapturada]);

  const onFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    const max = ViajeVentaTransporteService.MAX_EVIDENCIA_BYTES;
    if (f && f.size > max) {
      e.target.value = "";
      setFotoFile(null);
      setFotoPreview(null);
      setSaveErr(
        `La foto supera 10 MB (${(f.size / (1024 * 1024)).toFixed(1)} MB). Elegí otra imagen o comprimila.`,
      );
      return;
    }
    setSaveErr(null);
    setFotoFile(f ?? null);
    if (f) {
      const url = URL.createObjectURL(f);
      setFotoPreview(url);
    } else {
      setFotoPreview(null);
    }
  };

  const canvasPos = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
  ) => {
    const c = canvasRef.current;
    if (!c) return { x: 0, y: 0 };
    const r = c.getBoundingClientRect();
    if ("touches" in e && e.touches.length > 0) {
      return { x: e.touches[0].clientX - r.left, y: e.touches[0].clientY - r.top };
    }
    if ("clientX" in e) {
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }
    return { x: 0, y: 0 };
  };

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    drawing.current = true;
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const { x, y } = canvasPos(e);
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const moveDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    e.preventDefault();
    firmaDibujadaRef.current = true;
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const { x, y } = canvasPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const endDraw = () => {
    drawing.current = false;
  };

  const limpiarFirma = () => {
    firmaDibujadaRef.current = false;
    setFirmaDataUrlCapturada(null);
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
  };

  const validarPasoYAvanzar = () => {
    if (!sel) return;
    setSaveErr(null);
    const lineas = sel.lineItemsEsperados ?? [];
    if (pasoEntrega === 0) {
      for (let i = 0; i < lineas.length; i++) {
        if (!lineaVerificada[i]) {
          setSaveErr("Tenés que marcar cada producto como verificado antes de continuar.");
          return;
        }
        const raw = String(cantidades[i] ?? "").replace(",", ".").trim();
        const q = Number(raw);
        if (!Number.isFinite(q) || q < 0) {
          setSaveErr("Indicá una cantidad entregada válida (número ≥ 0) en cada línea.");
          return;
        }
      }
      setPasoEntrega(1);
      return;
    }
    if (pasoEntrega === 1) {
      if (!fotoFile) {
        setSaveErr("Tenés que subir una foto de evidencia antes de continuar.");
        return;
      }
      setPasoEntrega(2);
      return;
    }
    if (pasoEntrega === 2) {
      const tieneFirmaCanvas = Boolean(firmaDibujadaRef.current && canvasRef.current);
      const tieneFirmaGuardada = Boolean(firmaDataUrlCapturada?.trim());
      if (!tieneFirmaCanvas && !tieneFirmaGuardada) {
        setSaveErr("Tenés que dibujar la firma de quien recibe antes de continuar.");
        return;
      }
      if (tieneFirmaCanvas && canvasRef.current) {
        setFirmaDataUrlCapturada(firmaCanvasToDataUrl(canvasRef.current));
      }
      setPasoEntrega(3);
    }
  };

  const irAnteriorPaso = () => {
    setSaveErr(null);
    if (pasoEntrega <= 0) return;
    if (pasoEntrega === 3) {
      setConforme(null);
      setDescripcion("");
    }
    if (pasoEntrega === 2) {
      setFirmaDataUrlCapturada(null);
    }
    setPasoEntrega((p) => Math.max(0, p - 1));
  };

  const handleEntregar = async () => {
    if (!sel) {
      setSaveErr("Falta información del viaje.");
      return;
    }
    if (pasoEntrega !== PASOS_ENTREGA - 1) {
      setSaveErr("Completá todos los pasos antes de cerrar la entrega.");
      return;
    }
    if (conforme === null) {
      setSaveErr("Indicá si el pedido fue conforme (sí o no).");
      return;
    }
    if (!fotoFile) {
      setSaveErr("La foto de evidencia es obligatoria. Volvé al paso anterior y subí una imagen.");
      return;
    }
    const firmaCheckRaw =
      firmaDataUrlCapturada?.trim() ||
      (firmaDibujadaRef.current && canvasRef.current ? firmaCanvasToDataUrl(canvasRef.current) : "");
    if (!firmaCheckRaw.trim()) {
      setSaveErr("La firma de quien recibe es obligatoria. Volvé al paso de firma y dibujá antes de cerrar.");
      return;
    }
    if (!conforme && !descripcion.trim()) {
      setSaveErr("Si no estás conforme, describí el motivo antes de cerrar.");
      return;
    }

    setSaving(true);
    setSaveErr(null);
    try {
      /** Firestore suele responder en segundos; evita quedar colgado si hay un bug de red. */
      const SAVE_MS = 180_000;

      const evidenciaFotoUrl = await ViajeVentaTransporteService.subirEvidenciaFoto(
        sel.idClienteDueno,
        sel.ventaId,
        sel.id,
        fotoFile,
      );

      const firmaRaw =
        firmaDataUrlCapturada?.trim() ||
        (firmaDibujadaRef.current && canvasRef.current ? firmaCanvasToDataUrl(canvasRef.current) : "");
      const firmaDataUrl = firmaRaw.trim();

      const lineItemsEntregados: ViajeLineaEntrega[] = (sel.lineItemsEsperados ?? []).map((li, idx) => ({
        catalogoProductId: li.catalogoProductId,
        titleSnapshot: li.titleSnapshot,
        cantidadEsperada: Number(li.cantidad) || 0,
        cantidadEntregada: Math.max(0, Number(String(cantidades[idx] ?? "").replace(",", ".")) || 0),
      }));

      await withTimeout(
        ViajeVentaTransporteService.registrarEntrega({
          clientId: sel.idClienteDueno,
          ventaId: sel.ventaId,
          viajeId: sel.id,
          lineItemsEntregados,
          entregaConforme: conforme,
          evidenciaFotoUrl,
          firmaDataUrl,
          descripcionIncidencia: conforme ? undefined : descripcion.trim(),
          entregadoPorUid: uid,
          entregadoPorNombre: displayName,
        }),
        SAVE_MS,
        "Guardar la entrega en la base no respondió.",
      );
      setSel(null);
    } catch (err: unknown) {
      setSaveErr(err instanceof Error ? err.message : "No se pudo registrar la entrega.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="rounded-2xl bg-amber-100 p-3 text-amber-900">
            <HiOutlineTruck size={28} />
          </span>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Viajes de entrega (ventas)</h1>
            <p className="mt-1 text-xs text-slate-500">La lista se actualiza sola cuando hay cambios.</p>
          </div>
        </div>
      </div>

      {error ? (
        <p className="mb-4 rounded-lg border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-slate-200">
        <div className="max-h-[min(50vh,24rem)] overflow-auto">
          <table className="w-full min-w-[800px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-3 py-2 text-[10px] font-bold uppercase text-slate-500">Viaje</th>
                <th className="px-3 py-2 text-[10px] font-bold uppercase text-slate-500">Venta</th>
                <th className="px-3 py-2 text-[10px] font-bold uppercase text-slate-500">Cliente</th>
                <th className="px-3 py-2 text-[10px] font-bold uppercase text-slate-500">Kg (venta)</th>
                <th className="px-3 py-2 text-[10px] font-bold uppercase text-slate-500">Estado</th>
                <th className="px-3 py-2 text-[10px] font-bold uppercase text-slate-500">Acción</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-3 py-10 text-center text-slate-500">
                    Cargando…
                  </td>
                </tr>
              ) : viajes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-10 text-center text-slate-500">
                    No hay viajes en curso.
                  </td>
                </tr>
              ) : (
                viajes.map((v) => (
                  <tr key={`${v.idClienteDueno}-${v.ventaId}-${v.id}`} className="border-b border-slate-100">
                    <td className="px-3 py-2 font-mono text-xs font-semibold text-slate-900">{v.numero}</td>
                    <td className="px-3 py-2 font-mono text-xs text-slate-700">{v.ventaNumero}</td>
                    <td className="max-w-[14rem] px-3 py-2">
                      <div className="truncate font-medium text-slate-900" title={v.ventaCompradorNombre}>
                        {v.ventaCompradorNombre}
                      </div>
                      {v.ventaCodeCuenta ? (
                        <div className="truncate text-[11px] text-slate-500">Cuenta · {v.ventaCodeCuenta}</div>
                      ) : null}
                      {v.ventaDestinoNombre ? (
                        <div className="truncate text-[11px] text-slate-500">→ {v.ventaDestinoNombre}</div>
                      ) : null}
                    </td>
                    <td
                      className="whitespace-nowrap px-3 py-2 text-right font-mono text-xs text-slate-800"
                      title="Estimado según catálogo (peso × cantidad por línea)"
                    >
                      {formatKgEs(v.kgTotalEstimado ?? 0)} kg
                    </td>
                    <td className="px-3 py-2">
                      <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-semibold text-amber-900">
                        {v.estado}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => setSel(v)}
                        className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
                      >
                        Realizar entrega
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {sel ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/45 p-3 backdrop-blur-[2px] sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="viaje-entrega-titulo"
          onClick={() => setSel(null)}
        >
          <div
            className="relative z-10 flex max-h-[min(92vh,900px)] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative shrink-0 border-b border-amber-100 bg-linear-to-br from-amber-50 via-white to-slate-50 px-5 pb-4 pt-5 sm:px-6">
              <button
                type="button"
                onClick={() => setSel(null)}
                className="absolute right-3 top-3 rounded-xl border border-slate-200/80 bg-white/90 p-2 text-slate-500 shadow-sm transition hover:bg-white hover:text-slate-800"
                aria-label="Cerrar"
              >
                <FiX className="h-5 w-5" />
              </button>
              <div className="flex items-start gap-3 pr-12">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-900 shadow-inner">
                  <HiOutlineTruck className="h-7 w-7" aria-hidden />
                </span>
                <div className="min-w-0 pt-0.5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-amber-800/90">
                    Realizar entrega
                  </p>
                  <h2
                    id="viaje-entrega-titulo"
                    className="mt-0.5 text-lg font-bold tracking-tight text-slate-900 sm:text-xl"
                  >
                    {sel.numero}{" "}
                    <span className="font-semibold text-slate-500">· venta {sel.ventaNumero}</span>
                  </h2>
                  <p className="mt-1 text-xs text-slate-600">
                    Transportista: <span className="font-medium text-slate-800">{displayName || "—"}</span>
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-100 bg-white/90 px-4 py-3 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Destinatario</p>
                <p className="mt-1 text-base font-semibold leading-snug text-slate-900">{sel.ventaCompradorNombre}</p>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600">
                  {sel.ventaCodeCuenta ? (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
                      Cuenta {sel.ventaCodeCuenta}
                    </span>
                  ) : null}
                  {sel.ventaDestinoNombre ? (
                    <span className="inline-flex items-center gap-1 text-slate-600">
                      <span className="text-slate-400">→</span> {sel.ventaDestinoNombre}
                    </span>
                  ) : null}
                </div>
              </div>

              <p className="mt-4 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Paso {pasoEntrega + 1} de {PASOS_ENTREGA}
              </p>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
              {pasoEntrega === 0 ? (
                <section className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                  <p className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                    <FiPackage className="h-4 w-4 text-slate-400" aria-hidden />
                    Verificar productos
                  </p>
                  <p className="mb-3 text-xs text-slate-600">
                    Marcá cada ítem como verificado en destino e indicá la cantidad entregada (obligatorio en todas las
                    líneas).
                  </p>
                  <ul className="space-y-3">
                    {(sel.lineItemsEsperados ?? []).map((li, idx) => (
                      <li
                        key={`${sel.id}-li-${idx}`}
                        className="rounded-xl border border-white bg-white px-3 py-3 shadow-sm"
                      >
                        <label className="flex cursor-pointer items-start gap-3">
                          <input
                            type="checkbox"
                            checked={Boolean(lineaVerificada[idx])}
                            onChange={(e) =>
                              setLineaVerificada((prev) => ({ ...prev, [idx]: e.target.checked }))
                            }
                            className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                          />
                          <span className="min-w-0 flex-1 text-sm font-medium leading-snug text-slate-900">
                            {li.titleSnapshot}
                          </span>
                        </label>
                        <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3 sm:justify-end">
                          <span className="text-xs text-slate-500">
                            Pedido: <span className="font-semibold text-slate-700">{li.cantidad}</span>
                          </span>
                          <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                            Cantidad entregada
                            <input
                              type="number"
                              min={0}
                              step={1}
                              className="w-24 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-right text-sm font-semibold tabular-nums text-slate-900 shadow-inner"
                              value={cantidades[idx] ?? ""}
                              onChange={(e) =>
                                setCantidades((prev) => ({ ...prev, [idx]: e.target.value }))
                              }
                            />
                          </label>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {pasoEntrega === 1 ? (
                <label className="flex cursor-pointer flex-col gap-2">
                  <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-800">
                    <FiCamera className="h-4 w-4 text-amber-600" aria-hidden />
                    Evidencia de la entrega (foto)
                    <span className="text-rose-600">*</span>
                  </span>
                  <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 px-4 py-6 transition hover:border-amber-300 hover:bg-amber-50/30">
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={onFotoChange}
                      className="text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-amber-100 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-amber-900 hover:file:bg-amber-200"
                    />
                    <p className="mt-2 text-center text-[11px] text-slate-500">
                      Obligatorio: fotografiá la entrega, el remito o la caja. Hasta 10 MB.
                    </p>
                  </div>
                  {fotoPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={fotoPreview}
                      alt="Vista previa de evidencia"
                      className="mt-2 max-h-48 w-full rounded-xl border border-slate-200 object-contain shadow-inner"
                    />
                  ) : null}
                </label>
              ) : null}

              {pasoEntrega === 2 ? (
                <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                  <p className="text-sm font-semibold text-slate-800">
                    Firma de quien recibe <span className="text-rose-600">*</span>
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Obligatorio: dibujá con el dedo o el mouse en el recuadro (quien recibe el pedido).
                  </p>
                  <canvas
                    ref={canvasRef}
                    width={400}
                    height={160}
                    className="mt-3 w-full max-w-[400px] cursor-crosshair rounded-xl border-2 border-slate-200 bg-white shadow-inner touch-none"
                    onMouseDown={startDraw}
                    onMouseMove={moveDraw}
                    onMouseUp={endDraw}
                    onMouseLeave={endDraw}
                    onTouchStart={startDraw}
                    onTouchMove={moveDraw}
                    onTouchEnd={endDraw}
                  />
                  <button
                    type="button"
                    onClick={limpiarFirma}
                    className="mt-2 text-xs font-semibold text-amber-800 underline decoration-amber-300 underline-offset-2 hover:text-amber-950"
                  >
                    Limpiar firma
                  </button>
                </div>
              ) : null}

              {pasoEntrega === 3 ? (
                <div className="space-y-4">
                  <p className="text-sm font-semibold text-slate-900">
                    ¿Estás conforme con el pedido entregado respecto de lo solicitado?
                    <span className="ml-1 text-rose-600">*</span>
                  </p>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => {
                        setConforme(true);
                        setDescripcion("");
                        setSaveErr(null);
                      }}
                      className={`flex-1 rounded-2xl border-2 px-4 py-3 text-sm font-bold transition ${
                        conforme === true
                          ? "border-emerald-500 bg-emerald-50 text-emerald-900"
                          : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300"
                      }`}
                    >
                      Sí, conforme
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setConforme(false);
                        setSaveErr(null);
                      }}
                      className={`flex-1 rounded-2xl border-2 px-4 py-3 text-sm font-bold transition ${
                        conforme === false
                          ? "border-rose-500 bg-rose-50 text-rose-900"
                          : "border-slate-200 bg-white text-slate-700 hover:border-rose-300"
                      }`}
                    >
                      No conforme
                    </button>
                  </div>
                  {conforme === false ? (
                    <label className="flex flex-col gap-2">
                      <span className="text-sm font-medium text-slate-700">
                        ¿Por qué no? <span className="text-rose-600">*</span>
                      </span>
                      <textarea
                        value={descripcion}
                        onChange={(e) => setDescripcion(e.target.value)}
                        rows={4}
                        required
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-inner placeholder:text-slate-400"
                        placeholder="Ej.: faltaron unidades, daño en embalaje, producto equivocado…"
                      />
                    </label>
                  ) : null}
                  <p className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-[11px] leading-relaxed text-slate-600">
                    El estado final de la venta (<strong className="text-emerald-800">Cerrado (ok)</strong> o{" "}
                    <strong className="text-rose-800">Cerrado (no ok)</strong>) combina estas respuestas con si las
                    cantidades entregadas coinciden exactamente con las pedidas.
                  </p>
                </div>
              ) : null}

              {saveErr ? (
                <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                  {saveErr}
                </p>
              ) : null}
            </div>

            <div className="flex shrink-0 flex-wrap gap-3 border-t border-slate-100 bg-slate-50/90 px-5 py-4 sm:px-6">
              <button
                type="button"
                onClick={() => setSel(null)}
                className="min-h-[44px] flex-1 rounded-2xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Cancelar
              </button>
              {pasoEntrega > 0 ? (
                <button
                  type="button"
                  disabled={saving}
                  onClick={irAnteriorPaso}
                  className="min-h-[44px] flex-1 rounded-2xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Anterior
                </button>
              ) : null}
              {pasoEntrega < PASOS_ENTREGA - 1 ? (
                <button
                  type="button"
                  disabled={saving}
                  onClick={validarPasoYAvanzar}
                  className="min-h-[44px] flex-[1.15] rounded-2xl bg-amber-600 py-3 text-sm font-bold text-white shadow-md transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Siguiente
                </button>
              ) : (
                <button
                  type="button"
                  disabled={saving || conforme === null || (conforme === false && !descripcion.trim())}
                  onClick={() => void handleEntregar()}
                  className="min-h-[44px] flex-[1.15] inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3 text-sm font-bold text-white shadow-md transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? (
                    "Guardando…"
                  ) : (
                    <>
                      <FiCheckCircle className="h-5 w-5 shrink-0" aria-hidden />
                      Cerrar entrega
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
