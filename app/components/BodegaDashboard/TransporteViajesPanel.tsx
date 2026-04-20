"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
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

export function TransporteViajesPanel({ uid, displayName }: Props) {
  const [viajes, setViajes] = useState<ViajeVentaTransporteConContext[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sel, setSel] = useState<ViajeVentaTransporteConContext | null>(null);
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [cantidades, setCantidades] = useState<Record<number, string>>({});
  const [conforme, setConforme] = useState(true);
  const [descripcion, setDescripcion] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const firmaDibujadaRef = useRef(false);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    void ViajeVentaTransporteService.listEnCursoGlobal()
      .then(setViajes)
      .catch(() => {
        setViajes([]);
        setError("No se pudieron cargar los viajes. Revisá permisos y conexión.");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    if (!sel) {
      setFotoFile(null);
      setFotoPreview(null);
      setCantidades({});
      setConforme(true);
      setDescripcion("");
      setSaveErr(null);
      return;
    }
    const next: Record<number, string> = {};
    (sel.lineItemsEsperados ?? []).forEach((li, i) => {
      next[i] = String(li.cantidad ?? "");
    });
    setCantidades(next);
    setFotoFile(null);
    setFotoPreview(null);
    setConforme(true);
    setDescripcion("");
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
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
  };

  const handleEntregar = async () => {
    if (!sel) {
      setSaveErr("Falta información del viaje.");
      return;
    }
    setSaving(true);
    setSaveErr(null);
    try {
      /** Firestore suele responder en segundos; evita quedar colgado si hay un bug de red. */
      const SAVE_MS = 180_000;

      let evidenciaFotoUrl: string | undefined;
      if (fotoFile) {
        /** Subida con `uploadBytes` (hasta 10 MB); el timeout aplica al batch de Firestore abajo. */
        evidenciaFotoUrl = await ViajeVentaTransporteService.subirEvidenciaFoto(
          sel.idClienteDueno,
          sel.ventaId,
          sel.id,
          fotoFile,
        );
      }

      const firmaDataUrl =
        firmaDibujadaRef.current && canvasRef.current
          ? firmaCanvasToDataUrl(canvasRef.current)
          : undefined;

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
          descripcionIncidencia: conforme ? undefined : descripcion.trim() || undefined,
          entregadoPorUid: uid,
          entregadoPorNombre: displayName,
        }),
        SAVE_MS,
        "Guardar la entrega en la base no respondió.",
      );
      setSel(null);
      reload();
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
            <p className="mt-1 text-sm text-slate-600">
              Listado de viajes <strong>en curso</strong>. Al entregar: compará cantidades, adjuntá evidencia,
              firmá; si la entrega <strong>no está conforme</strong>, podés describir la incidencia.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => reload()}
          disabled={loading}
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Actualizar
        </button>
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
                        Registrar entrega
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
                    Registrar entrega
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
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
              <section className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                  <FiPackage className="h-4 w-4 text-slate-400" aria-hidden />
                  Unidades · esperado vs entregado
                </p>
                <ul className="space-y-2">
                  {(sel.lineItemsEsperados ?? []).map((li, idx) => (
                    <li
                      key={`${sel.id}-li-${idx}`}
                      className="flex flex-col gap-2 rounded-xl border border-white bg-white px-3 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                    >
                      <span className="min-w-0 flex-1 text-sm font-medium leading-snug text-slate-900">
                        {li.titleSnapshot}
                      </span>
                      <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                        <span className="text-xs text-slate-500">
                          Pedido: <span className="font-semibold text-slate-700">{li.cantidad}</span>
                        </span>
                        <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                          Entregado
                          <input
                            type="number"
                            min={0}
                            step={1}
                            className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-right text-sm font-semibold tabular-nums text-slate-900 shadow-inner"
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

              <label className="mt-5 flex cursor-pointer flex-col gap-2">
                <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <FiCamera className="h-4 w-4 text-amber-600" aria-hidden />
                  Foto de evidencia
                  <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-600">
                    Opcional
                  </span>
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
                    Podés fotografiar la entrega, el remito o la caja. Hasta 10 MB.
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

              <div className="mt-5 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <p className="text-sm font-semibold text-slate-800">
                  Firma de quien recibe{" "}
                  <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-600">
                    Opcional
                  </span>
                </p>
                <p className="mt-0.5 text-xs text-slate-500">Si aplica, dibujá con el dedo o el mouse en el recuadro</p>
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

              <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50/50 px-4 py-3 text-sm text-slate-800">
                <input
                  type="checkbox"
                  checked={conforme}
                  onChange={(e) => setConforme(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span>
                  <span className="font-semibold text-emerald-900">Entrega conforme</span>
                  <span className="mt-0.5 block text-xs font-normal text-slate-600">
                    Marcá si lo entregado coincide con lo pedido en cada línea. Foto y firma son opcionales.
                  </span>
                </span>
              </label>
              <p className="mt-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-[11px] leading-relaxed text-slate-600">
                El cierre <strong className="text-emerald-800">Cerrado (ok)</strong> o{" "}
                <strong className="text-rose-800">Cerrado (no ok)</strong> depende solo de si las{" "}
                <strong>cantidades entregadas</strong> coinciden con las pedidas y si marcás{" "}
                <strong>entrega conforme</strong> (no exige foto ni firma).
              </p>

              {!conforme ? (
                <label className="mt-4 flex flex-col gap-2">
                  <span className="text-sm font-medium text-slate-700">Incidencia (opcional)</span>
                  <textarea
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    rows={3}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-inner placeholder:text-slate-400"
                    placeholder="Ej.: faltaron unidades, daño en embalaje…"
                  />
                </label>
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
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleEntregar()}
                className="min-h-[44px] flex-[1.15] inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3 text-sm font-bold text-white shadow-md transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? (
                  "Guardando…"
                ) : (
                  <>
                    <FiCheckCircle className="h-5 w-5 shrink-0" aria-hidden />
                    Confirmar entrega
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
