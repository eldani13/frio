"use client";

import React, { useEffect, useState } from "react";
import { HiOutlinePlus, HiOutlineTrash, HiOutlineXMark } from "react-icons/hi2";
import type { Catalogo } from "@/app/types/catalogo";
import type { SolicitudLineItem } from "@/app/types/solicitudCompra";
import { SolicitudCompraService } from "@/app/services/solicitudCompraService";

type DraftLine = SolicitudLineItem;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  idCliente: string;
  codeCuenta: string;
  productos: Catalogo[];
  onSuccess: () => void;
}

export function SolicitudCompraFormModal({
  isOpen,
  onClose,
  idCliente,
  codeCuenta,
  productos,
  onSuccess,
}: Props) {
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [pickProductId, setPickProductId] = useState("");
  const [pickPesoKg, setPickPesoKg] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLines([]);
    setPickProductId("");
    setPickPesoKg("");
    setError(null);
  }, [isOpen]);

  if (!isOpen) return null;

  const addLine = () => {
    setError(null);
    const p = productos.find((x) => x.id === pickProductId);
    if (!p?.id) {
      setError("Seleccioná un producto del catálogo.");
      return;
    }
    const pesoRaw = String(pickPesoKg).replace(",", ".").trim();
    const pesoNum = Number(pesoRaw);
    if (!Number.isFinite(pesoNum) || pesoNum <= 0) {
      setError("Ingresá un peso en kg mayor a 0.");
      return;
    }
    const line: DraftLine = {
      catalogoProductId: p.id,
      pesoKg: pesoNum,
      titleSnapshot: p.title || "Sin título",
      ...(p.sku != null && String(p.sku).trim() !== "" ? { skuSnapshot: String(p.sku) } : {}),
      ...(p.code != null && String(p.code).trim() !== ""
        ? { codeSnapshot: String(p.code) }
        : {}),
    };
    setLines((prev) => [...prev, line]);
    setPickProductId("");
    setPickPesoKg("");
  };

  const removeLine = (index: number) => {
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (lines.length === 0) {
      setError("Agregá al menos una línea con productos del catálogo.");
      return;
    }

    setSaving(true);
    try {
      await SolicitudCompraService.create(idCliente, codeCuenta, {
        lineItems: lines,
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "No se pudo guardar la solicitud.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="solicitud-modal-title"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[12px] border border-gray-100 bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="solicitud-modal-title" className="text-lg font-semibold text-gray-900">
            Nueva solicitud
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Cerrar"
          >
            <HiOutlineXMark size={24} />
          </button>
        </div>

        <p className="mb-4 text-xs text-[#6B7280]">
          Indicá el <strong>peso en kg</strong> por cada producto del <strong>catálogo</strong>.
        </p>

        {error ? (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-lg border border-dashed border-cyan-200 bg-cyan-50/40 p-3">
            <p className="mb-2 text-[11px] font-bold uppercase text-gray-500">Productos del catálogo</p>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
              <div className="min-w-0 flex-1 sm:min-w-[200px]">
                <label className="sr-only" htmlFor="sol-catalogo">
                  Producto
                </label>
                <select
                  id="sol-catalogo"
                  value={pickProductId}
                  onChange={(e) => setPickProductId(e.target.value)}
                  className="w-full rounded-[8px] border border-gray-200 bg-white px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none"
                >
                  <option value="">Elegí producto del catálogo…</option>
                  {productos.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                      {c.sku ? ` · SKU ${c.sku}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-full sm:w-32">
                <label
                  className="mb-0.5 block text-[10px] font-bold uppercase text-gray-500 sm:sr-only"
                  htmlFor="sol-peso-kg"
                >
                  Peso (kg)
                </label>
                <input
                  id="sol-peso-kg"
                  type="text"
                  inputMode="decimal"
                  value={pickPesoKg}
                  onChange={(e) => setPickPesoKg(e.target.value)}
                  placeholder="Peso (kg)"
                  className="w-full rounded-[8px] border border-gray-200 bg-white px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={addLine}
                className="inline-flex items-center justify-center gap-1 rounded-[8px] bg-cyan-700 px-3 py-2 text-sm font-semibold text-white hover:bg-cyan-800"
              >
                <HiOutlinePlus className="h-4 w-4" />
                Agregar
              </button>
            </div>

            {lines.length === 0 ? (
              <p className="mt-3 text-center text-xs text-gray-500">
                Todavía no hay líneas en esta solicitud.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {lines.map((ln, i) => (
                  <li
                    key={`${ln.catalogoProductId}-${i}`}
                    className="flex items-center justify-between gap-2 rounded-md border border-gray-100 bg-white px-3 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-gray-900">{ln.titleSnapshot}</p>
                      <p className="text-xs text-gray-500">
                        {ln.skuSnapshot ? `SKU ${ln.skuSnapshot} · ` : null}
                        {ln.pesoKg != null ? `${ln.pesoKg} kg` : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeLine(i)}
                      className="shrink-0 p-2 text-[#fca5a5] hover:bg-red-50 rounded-lg"
                      title="Quitar"
                    >
                      <HiOutlineTrash className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-[8px] px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-[8px] bg-cyan-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-cyan-700 active:scale-[0.98] disabled:opacity-50"
            >
              {saving ? "Guardando…" : "Guardar solicitud"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
