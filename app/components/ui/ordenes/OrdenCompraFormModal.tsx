"use client";

import React, { useEffect, useState } from "react";
import { HiOutlinePlus, HiOutlineTrash } from "react-icons/hi2";
import {
  FORMULARIO_CREACION_BODY,
  FORMULARIO_CREACION_GRID,
  FORMULARIO_CREACION_INPUT,
  FORMULARIO_CREACION_LABEL,
  FORMULARIO_CREACION_SELECT,
  FormularioPlantilla,
  FormularioPlantillaAcciones,
} from "@/app/components/ui/FormularioPlantilla";
import type { Catalogo } from "@/app/types/catalogo";
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
  onSuccess: () => void;
}

export function OrdenCompraFormModal({
  isOpen,
  onClose,
  idCliente,
  codeCuenta,
  productos,
  onSuccess,
}: Props) {
  const [fecha, setFecha] = useState("");
  const [estado, setEstado] = useState<string>("Iniciado");
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [pickProductId, setPickProductId] = useState("");
  const [pickPesoKg, setPickPesoKg] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setFecha(new Date().toISOString().slice(0, 10));
    setEstado("Iniciado");
    setLines([]);
    setPickProductId("");
    setPickPesoKg("");
    setError(null);
  }, [isOpen]);

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
    if (lines.length === 0) {
      setError("Agregá al menos una línea con productos del catálogo.");
      return;
    }

    setSaving(true);
    try {
      await OrdenCompraService.create(idCliente, codeCuenta, {
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
    <FormularioPlantilla
      isOpen={isOpen}
      onClose={onClose}
      titulo="Nueva orden de compra"
      subtitulo="OC · catálogo + kg"
      titleId="orden-compra-modal-title"
      maxWidthClass="max-w-lg"
      footer={
        <FormularioPlantillaAcciones
          formId="oc-compra-form"
          onCancel={onClose}
          submitLabel="Guardar orden"
          loading={saving}
        />
      }
    >
        <form id="oc-compra-form" onSubmit={handleSubmit} className={`${FORMULARIO_CREACION_BODY} space-y-4`}>
        <p className="text-base text-gray-500">Catálogo + kg línea.</p>

        {error ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-base text-red-700">{error}</p>
        ) : null}

          <div className={`${FORMULARIO_CREACION_GRID} md:grid-cols-2`}>
            <div>
              <label htmlFor="oc-fecha" className={FORMULARIO_CREACION_LABEL}>
                Fecha
              </label>
              <input
                id="oc-fecha"
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                required
                className={FORMULARIO_CREACION_INPUT}
              />
            </div>
            <div>
              <label htmlFor="oc-estado" className={FORMULARIO_CREACION_LABEL}>
                Estado
              </label>
              <select
                id="oc-estado"
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                className={FORMULARIO_CREACION_SELECT}
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
            <p className={`${FORMULARIO_CREACION_LABEL} mb-2`}>Líneas catálogo</p>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
              <div className="min-w-0 flex-1 sm:min-w-[200px]">
                <label className="sr-only" htmlFor="oc-catalogo">
                  Producto
                </label>
                <select
                  id="oc-catalogo"
                  value={pickProductId}
                  onChange={(e) => setPickProductId(e.target.value)}
                  className={FORMULARIO_CREACION_SELECT}
                >
                  <option value="">Elegí producto…</option>
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
                  className="mb-0.5 block text-base font-bold uppercase text-gray-500 sm:sr-only"
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
                  className={FORMULARIO_CREACION_INPUT}
                />
              </div>
              <button
                type="button"
                onClick={addLine}
                className="inline-flex items-center justify-center gap-1 rounded-[12px] bg-[#0f172a] px-4 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-slate-800"
              >
                <HiOutlinePlus className="h-4 w-4" />
                Agregar
              </button>
            </div>

            {lines.length === 0 ? (
              <p className="mt-3 text-center text-xs text-gray-500">Sin líneas.</p>
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

        </form>
    </FormularioPlantilla>
  );
}
