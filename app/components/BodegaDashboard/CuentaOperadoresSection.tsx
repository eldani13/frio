"use client";

import React from "react";
import { HiOutlineXMark } from "react-icons/hi2";
import { useAuth } from "@/app/context/AuthContext";
import {
  createOperadorCuenta,
  listOperadoresCuenta,
  type OperadorCuentaRow,
} from "@/app/services/operadorCuentaService";

function firebaseErrorMessage(err: unknown): string {
  const code =
    typeof err === "object" && err !== null && "code" in err
      ? String((err as { code: string }).code)
      : "";
  if (code === "auth/email-already-in-use") return "Ese correo ya está registrado.";
  if (code === "auth/invalid-email") return "Correo no válido.";
  if (code === "auth/weak-password") return "La contraseña es demasiado débil (mínimo 6 caracteres).";
  if (code === "auth/operation-not-allowed") return "Registro con correo/contraseña no habilitado en Firebase.";
  if (typeof err === "object" && err !== null && "message" in err) {
    return String((err as { message: string }).message);
  }
  return "No se pudo completar la operación.";
}

export function CuentaOperadoresSection() {
  const { session } = useAuth();
  const idCliente = session?.clientId ?? "";
  const uid = session?.uid ?? "";
  const role = session?.role ?? "";
  const puedeCrear = role === "cliente";

  const [rows, setRows] = React.useState<OperadorCuentaRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [nombre, setNombre] = React.useState("");
  const [correo, setCorreo] = React.useState("");
  const [clave, setClave] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const reload = React.useCallback(async () => {
    if (!idCliente.trim()) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setRows(await listOperadoresCuenta(idCliente));
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [idCliente]);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!puedeCrear || !uid) {
      setError("Solo el administrador de la cuenta puede crear operadores.");
      return;
    }
    setSaving(true);
    try {
      await createOperadorCuenta({
        name: nombre,
        email: correo,
        password: clave,
        clientId: idCliente,
        createdByUid: uid,
        createdByRole: role,
      });
      setNombre("");
      setCorreo("");
      setClave("");
      setModalOpen(false);
      await reload();
    } catch (err: unknown) {
      const fromFirebase =
        typeof err === "object" && err !== null && "code" in err && String((err as { code: string }).code).startsWith("auth/");
      setError(fromFirebase ? firebaseErrorMessage(err) : err instanceof Error ? err.message : firebaseErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex w-full max-w-4xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Operadores de cuenta</h2>
          <p className="mt-1 text-sm text-slate-500">
            Usuarios con rol <span className="font-semibold text-slate-700">operador de cuentas</span>. Inician
            sesión con correo y contraseña.
          </p>
        </div>
        {puedeCrear ? (
          <button
            type="button"
            onClick={() => {
              setError(null);
              setModalOpen(true);
            }}
            disabled={!idCliente.trim()}
            className="inline-flex items-center gap-2 rounded-[10px] bg-[#0891B2] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0e7490] disabled:pointer-events-none disabled:opacity-50"
          >
            Crear usuario
          </button>
        ) : null}
      </div>

      {!idCliente.trim() ? (
        <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
          No hay cuenta vinculada a esta sesión.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    Nombre
                  </th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    Correo
                  </th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    Código
                  </th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    Alta
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                      Cargando…
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                      {puedeCrear
                        ? "No hay operadores. Creá uno con el botón superior."
                        : "No hay operadores registrados para esta cuenta."}
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3 font-medium text-slate-900">{r.name}</td>
                      <td className="px-4 py-3 text-slate-700">{r.email || "—"}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{r.code || "—"}</td>
                      <td className="px-4 py-3 text-slate-600">{r.createdAt ?? "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modalOpen ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/25 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <button
              type="button"
              onClick={() => !saving && setModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
              aria-label="Cerrar"
            >
              <HiOutlineXMark size={22} />
            </button>
            <h3 className="text-lg font-semibold text-slate-900">Nuevo operador de cuentas</h3>
            <p className="mt-1 text-sm text-slate-500">Nombre, correo y contraseña para iniciar sesión.</p>
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Nombre
                </label>
                <input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-cyan-500 focus:outline-none"
                  placeholder="Nombre completo"
                  required
                  autoFocus
                  disabled={saving}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Correo
                </label>
                <input
                  type="email"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-cyan-500 focus:outline-none"
                  placeholder="correo@empresa.com"
                  required
                  disabled={saving}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Contraseña
                </label>
                <input
                  type="password"
                  value={clave}
                  onChange={(e) => setClave(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-cyan-500 focus:outline-none"
                  placeholder="Mínimo 6 caracteres"
                  required
                  minLength={6}
                  disabled={saving}
                />
              </div>
              {error ? <p className="text-sm text-red-600">{error}</p> : null}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={saving}
                  className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-lg bg-cyan-600 py-2.5 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-50"
                >
                  {saving ? "Creando…" : "Crear"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
