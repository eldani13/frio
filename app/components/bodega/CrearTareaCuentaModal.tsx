"use client";

import { useEffect, useState } from "react";
import { FirebaseError } from "firebase/app";
import { FiX } from "react-icons/fi";

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

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
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
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="crear-tarea-titulo"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
        onClick={(ev) => ev.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Cuenta</p>
            <h2 id="crear-tarea-titulo" className="mt-1 text-lg font-semibold text-slate-900">
              Crear tarea para el configurador
            </h2>
            {cuentaLabel ? (
              <p className="mt-1 text-sm text-slate-500">{cuentaLabel}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Cerrar"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="tarea-titulo" className="block text-sm font-medium text-slate-700">
              Título
            </label>
            <input
              id="tarea-titulo"
              value={titulo}
              onChange={(ev) => setTitulo(ev.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none ring-emerald-500/30 focus:border-emerald-400 focus:ring-2"
              placeholder="Ej. Actualizar precios del catálogo"
              maxLength={200}
              disabled={saving}
            />
          </div>
          <div>
            <label htmlFor="tarea-detalle" className="block text-sm font-medium text-slate-700">
              Detalle <span className="font-normal text-slate-400">(opcional)</span>
            </label>
            <textarea
              id="tarea-detalle"
              value={detalle}
              onChange={(ev) => setDetalle(ev.target.value)}
              rows={4}
              className="mt-1 w-full resize-y rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none ring-emerald-500/30 focus:border-emerald-400 focus:ring-2"
              placeholder="Contexto o pasos que el configurador deba tener en cuenta"
              maxLength={2000}
              disabled={saving}
            />
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-900 disabled:opacity-50"
            >
              {saving ? "Enviando…" : "Enviar tarea"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
