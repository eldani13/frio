"use client";

import React, { useEffect, useState } from "react";
import { HiOutlinePlus, HiOutlineTrash } from "react-icons/hi2";
import {
  FORMULARIO_CREACION_BODY,
  FORMULARIO_CREACION_INPUT,
  FORMULARIO_CREACION_LABEL,
  FORMULARIO_CREACION_SELECT,
  FormularioPlantilla,
  FormularioPlantillaAcciones,
} from "@/app/components/ui/FormularioPlantilla";
import type { Catalogo } from "@/app/types/catalogo";
import type { SolicitudLineItem } from "@/app/types/solicitudCompra";
import { SolicitudCompraService } from "@/app/services/solicitudCompraService";
import { formatKgEs, parseDecimalEs } from "@/app/lib/decimalEs";

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
    <FormularioPlantilla
      isOpen={isOpen}
      onClose={onClose}
      titulo="Nueva solicitud"
      subtitulo="Solicitud · peso/kg"
      titleId="solicitud-modal-title"
      maxWidthClass="max-w-lg"
      footer={
        <FormularioPlantillaAcciones
          formId="solicitud-compra-form"
          onCancel={onClose}
          submitLabel="Guardar solicitud"
          loading={saving}
        />
      }
    >
      <form id="solicitud-compra-form" onSubmit={handleSubmit} className={`${FORMULARIO_CREACION_BODY} space-y-4`}>
        <p className="text-base text-gray-500">Peso kg por ítem.</p>

        {error ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-base text-red-700">{error}</p>
        ) : null}

          <div className="rounded-lg border border-dashed border-[#A8D5BA]/60 bg-[#f8faf8] p-3">
            <p className={`${FORMULARIO_CREACION_LABEL} mb-2`}>Líneas cat.</p>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
              <div className="min-w-0 flex-1 sm:min-w-[200px]">
                <label className="sr-only" htmlFor="sol-catalogo">
                  Producto
                </label>
                <select
                  id="sol-catalogo"
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
                <label className={`${FORMULARIO_CREACION_LABEL} mb-0.5 sm:sr-only`} htmlFor="sol-peso-kg">
                  Peso (kg)
                </label>
                <input
                  id="sol-peso-kg"
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
                        {ln.pesoKg != null ? `${formatKgEs(ln.pesoKg)} kg` : ""}
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
