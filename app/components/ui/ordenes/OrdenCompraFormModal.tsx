"use client";

import React, { useEffect, useState } from "react";
import { HiOutlinePlus, HiOutlineTrash, HiOutlineXMark } from "react-icons/hi2";
import type { Catalogo } from "@/app/types/catalogo";
import type { Provider } from "@/app/types/provider";
import { ORDEN_COMPRA_ESTADOS, type OrdenCompraLineItem } from "@/app/types/ordenCompra";
import { OrdenCompraService } from "@/app/services/ordenCompraService";
import { formatKgEs, parseDecimalEs } from "@/app/lib/decimalEs";

type DraftLine = OrdenCompraLineItem;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  idCliente: string;
  codeCuenta: string;
  productos: Catalogo[];
  proveedores: Provider[];
  onSuccess: () => void;
}

export function OrdenCompraFormModal({
  isOpen,
  onClose,
  idCliente,
  codeCuenta,
  productos,
  proveedores,
  onSuccess,
}: Props) {
  const [proveedorId, setProveedorId] = useState("");
  const [fecha, setFecha] = useState("");
  const [estado, setEstado] = useState<string>("Iniciado");
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [pickProductId, setPickProductId] = useState("");
  const [pickPesoKg, setPickPesoKg] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setProveedorId("");
    setFecha(new Date().toISOString().slice(0, 10));
    setEstado("Iniciado");
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
    const pesoNum = parseDecimalEs(pickPesoKg);
    if (pesoNum == null || pesoNum <= 0) {
      setError("Ingresá un peso en kg mayor a 0 (podés usar coma: 15,6).");
      return;
    }
    const line: DraftLine = {
      catalogoProductId: p.id,
      cantidad: 0,
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
    if (!proveedorId) {
      setError("Seleccioná un proveedor.");
      return;
    }
    if (lines.length === 0) {
      setError("Agregá al menos una línea con productos del catálogo.");
      return;
    }
    const prov = proveedores.find((x) => x.id === proveedorId);
    if (!prov?.id) {
      setError("Proveedor inválido.");
      return;
    }

    setSaving(true);
    try {
      await OrdenCompraService.create(idCliente, codeCuenta, {
        proveedorId: prov.id,
        proveedorCode: prov.code ?? "",
        proveedorNombre: prov.name,
        fecha,
        estado,
        lineItems: lines,
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "No se pudo guardar la orden.";
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
      aria-labelledby="orden-compra-modal-title"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[12px] border border-gray-100 bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="orden-compra-modal-title" className="text-lg font-semibold text-gray-900">
            Nueva orden de compra
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
          Cada línea debe ser un producto de tu <strong>catálogo</strong> (mismo SKU y datos que en
          Catálogo). Indicá el <strong>peso en kg</strong> por línea (coma o punto:{" "}
          <span className="whitespace-nowrap">15,6</span>).
        </p>

        {error ? (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="oc-proveedor-id"
              className="mb-1 block text-[11px] font-bold uppercase text-gray-500"
            >
              Proveedor
            </label>
            <select
              id="oc-proveedor-id"
              value={proveedorId}
              onChange={(e) => setProveedorId(e.target.value)}
              required
              className="w-full rounded-[8px] border border-gray-200 px-4 py-2 text-sm focus:border-[#A8D5BA] focus:outline-none"
            >
              <option value="">Seleccionar proveedor…</option>
              {proveedores.map((pr) => (
                <option key={pr.id} value={pr.id}>
                  {pr.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="oc-fecha"
                className="mb-1 block text-[11px] font-bold uppercase text-gray-500"
              >
                Fecha
              </label>
              <input
                id="oc-fecha"
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                required
                className="w-full rounded-[8px] border border-gray-200 px-4 py-2 text-sm focus:border-[#A8D5BA] focus:outline-none"
              />
            </div>
            <div>
              <label
                htmlFor="oc-estado"
                className="mb-1 block text-[11px] font-bold uppercase text-gray-500"
              >
                Estado
              </label>
              <select
                id="oc-estado"
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                className="w-full rounded-[8px] border border-gray-200 px-4 py-2 text-sm focus:border-[#A8D5BA] focus:outline-none"
              >
                {ORDEN_COMPRA_ESTADOS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="rounded-lg border border-dashed border-[#A8D5BA]/60 bg-[#f8faf8] p-3">
            <p className="mb-2 text-[11px] font-bold uppercase text-gray-500">Productos del catálogo</p>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
              <div className="min-w-0 flex-1 sm:min-w-[200px]">
                <label className="sr-only" htmlFor="oc-catalogo">
                  Producto
                </label>
                <select
                  id="oc-catalogo"
                  value={pickProductId}
                  onChange={(e) => setPickProductId(e.target.value)}
                  className="w-full rounded-[8px] border border-gray-200 bg-white px-3 py-2 text-sm focus:border-[#A8D5BA] focus:outline-none"
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
                  htmlFor="oc-peso-kg-line"
                >
                  Peso (kg)
                </label>
                <input
                  id="oc-peso-kg-line"
                  type="text"
                  inputMode="decimal"
                  value={pickPesoKg}
                  onChange={(e) => setPickPesoKg(e.target.value)}
                  placeholder="Ej. 15,6"
                  className="w-full rounded-[8px] border border-gray-200 bg-white px-3 py-2 text-sm focus:border-[#A8D5BA] focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={addLine}
                className="inline-flex items-center justify-center gap-1 rounded-[8px] bg-[#0f172a] px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                <HiOutlinePlus className="h-4 w-4" />
                Agregar
              </button>
            </div>

            {lines.length === 0 ? (
              <p className="mt-3 text-center text-xs text-gray-500">Todavía no hay líneas en esta orden.</p>
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
                        {ln.pesoKg != null && ln.pesoKg > 0
                          ? `${formatKgEs(ln.pesoKg)} kg`
                          : ln.cantidad > 0
                            ? `${ln.cantidad} u.`
                            : "—"}
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
              className="rounded-[8px] bg-[#A8D5BA] px-5 py-2 text-sm font-semibold text-[#2D5A3F] transition hover:bg-[#97c4a9] active:scale-[0.98] disabled:opacity-50"
            >
              {saving ? "Guardando…" : "Guardar orden"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
