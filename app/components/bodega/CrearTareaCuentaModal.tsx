"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { FirebaseError } from "firebase/app";
import { FiEdit3 } from "react-icons/fi";
import { ModalPlantilla } from "@/app/components/ui/ModalPlantilla";

function mensajeErrorEnvioTarea(err: unknown): string {
  if (err instanceof FirebaseError) {
    if (err.code === "permission-denied") {
      return "Firestore bloqueó el guardado. Necesitás permiso en clientes/{tuCuenta}/tareasParaConfigurador (por ejemplo una regla recursiva bajo clientes/{clientId}/… o publicar las reglas de este repo).";
    }
    if (err.code === "unauthenticated") {
      return "Tu sesión no es válida. Cerrá sesión y volvé a entrar.";
    }
    if (err.code === "unavailable") {
      return "No hay conexión con Firebase. Revisá tu red e intentá de nuevo.";
    }
  }
  if (err instanceof Error) {
    if (err.message === "sin_sesion" || err.message === "sin sesión") {
      return "No hay sesión activa. Volvé a iniciar sesión.";
    }
    if (err.message === "sin_cuenta" || err.message === "sin cuenta") {
      return "Tu usuario no está vinculado a una cuenta. Contactá al configurador.";
    }
  }
  return "No se pudo enviar la tarea. Probá de nuevo.";
}

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: { titulo: string; detalle: string }) => Promise<void>;
  cuentaLabel?: string;
};

export default function CrearTareaCuentaModal({ open, onClose, onSubmit, cuentaLabel }: Props) {
  const [titulo, setTitulo] = useState("");
  const [detalle, setDetalle] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitulo("");
    setDetalle("");
    setError(null);
    setSaving(false);
  }, [open]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const t = titulo.trim();
    if (!t) {
      setError("Escribí un título para la tarea.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSubmit({ titulo: t, detalle: detalle.trim() });
      onClose();
    } catch (err) {
      console.error(err);
      setError(mensajeErrorEnvioTarea(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalPlantilla
      open={open}
      onClose={onClose}
      titulo="Crear tarea para el configurador"
      tituloId="crear-tarea-titulo"
      headerIcon={<FiEdit3 className="h-7 w-7 text-blue-600" strokeWidth={2} aria-hidden />}
      zIndexClass="z-[60]"
      encabezadoSup="Cuenta"
      subtitulo={cuentaLabel?.trim() ? cuentaLabel : undefined}
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            form="crear-tarea-form"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-base font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="crear-tarea-form"
            disabled={saving}
            className="rounded-xl bg-slate-800 px-4 py-2.5 text-base font-semibold text-white shadow-sm transition hover:bg-slate-900 disabled:opacity-50"
          >
            {saving ? "Enviando…" : "Enviar tarea"}
          </button>
        </div>
      }
    >
      <form id="crear-tarea-form" className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="tarea-titulo" className="block text-base font-medium text-slate-700">
            Título
          </label>
          <input
            id="tarea-titulo"
            value={titulo}
            onChange={(ev) => setTitulo(ev.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-base text-slate-900 outline-none ring-emerald-500/30 focus:border-emerald-400 focus:ring-2"
            placeholder="Ej. Actualizar precios del catálogo"
            maxLength={200}
            disabled={saving}
          />
        </div>
        <div>
          <label htmlFor="tarea-detalle" className="block text-base font-medium text-slate-700">
            Detalle <span className="font-normal text-slate-400">(opcional)</span>
          </label>
          <textarea
            id="tarea-detalle"
            value={detalle}
            onChange={(ev) => setDetalle(ev.target.value)}
            rows={4}
            className="mt-1 w-full resize-y rounded-xl border border-slate-200 px-3 py-2 text-base text-slate-900 outline-none ring-emerald-500/30 focus:border-emerald-400 focus:ring-2"
            placeholder="Contexto o pasos que el configurador deba tener en cuenta"
            maxLength={2000}
            disabled={saving}
          />
        </div>
        {error ? <p className="text-base text-red-600">{error}</p> : null}
      </form>
    </ModalPlantilla>
  );
}
