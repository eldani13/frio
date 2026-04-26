"use client";

import React from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebaseClient";
import { useAuth } from "@/app/context/AuthContext";
import {
  createOperadorCuenta,
  listOperadoresCuenta,
  normalizeOperadorCodeInput,
  suggestOperadorCodeFromName,
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
  const [codigo, setCodigo] = React.useState("");
  const [correo, setCorreo] = React.useState("");
  const [clave, setClave] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [nombreCuentaAsignada, setNombreCuentaAsignada] = React.useState("");

  React.useEffect(() => {
    if (!idCliente.trim()) {
      setNombreCuentaAsignada("");
      return;
    }
    let cancelled = false;
    void getDoc(doc(db, "clientes", idCliente.trim())).then((snap) => {
      if (cancelled) return;
      const n = snap.data()?.name?.toString().trim();
      setNombreCuentaAsignada(n || idCliente.trim());
    });
    return () => {
      cancelled = true;
    };
  }, [idCliente]);

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
    const codeNorm = normalizeOperadorCodeInput(codigo);
    if (codeNorm.length !== 5) {
      setError("El código debe tener 5 caracteres (base 36).");
      setSaving(false);
      return;
    }
    try {
      await createOperadorCuenta({
        name: nombre,
        email: correo,
        password: clave,
        clientId: idCliente,
        createdByUid: uid,
        createdByRole: role,
        code: codeNorm,
      });
      setNombre("");
      setCodigo("");
      setCorreo("");
      setClave("");
      setModalOpen(false);
      await reload();
    } catch (err: unknown) {
      const fromFirebase =
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        String((err as { code: string }).code).startsWith("auth/");
      setError(
        fromFirebase ? firebaseErrorMessage(err) : err instanceof Error ? err.message : firebaseErrorMessage(err),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex w-full max-w-4xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="app-title">Operadores de cuenta</h2>
          <p className="mt-1 text-sm text-slate-500">
            Usuarios con rol <span className="font-semibold text-slate-700">operador de cuentas</span>. Inician sesión
            con correo y contraseña.
          </p>
        </div>
        {puedeCrear ? (
          <button
            type="button"
            onClick={() => {
              setError(null);
              setNombre("");
              setCodigo("");
              setCorreo("");
              setClave("");
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
                  <th className="px-4 py-3 text-base font-bold uppercase tracking-wide text-slate-500">Nombre</th>
                  <th className="px-4 py-3 text-base font-bold uppercase tracking-wide text-slate-500">Correo</th>
                  <th className="px-4 py-3 text-base font-bold uppercase tracking-wide text-slate-500">Código</th>
                  <th className="px-4 py-3 text-base font-bold uppercase tracking-wide text-slate-500">Alta</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="border-b border-slate-100 px-4 py-12 text-center text-slate-500">
                      Cargando…
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="border-b border-slate-100 px-4 py-12 text-center text-slate-500">
                      {puedeCrear
                        ? "No hay operadores. Creá uno con el botón superior."
                        : "No hay operadores registrados para esta cuenta."}
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr
                      key={r.id}
                      className="border-b border-slate-100 transition-colors hover:bg-violet-50/80"
                    >
                      <td className="px-4 py-3 text-base font-medium text-slate-800">{r.name}</td>
                      <td className="px-4 py-3 text-base text-slate-700">{r.email || "—"}</td>
                      <td className="px-4 py-3 font-mono text-base font-semibold text-slate-900">
                        {r.code || "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-base text-slate-600">
                        {r.createdAt ?? "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modalOpen ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-operador-cuenta-titulo"
          onClick={() => !saving && setModalOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
                  Nuevo operador de cuenta
                </p>
                <h3 id="modal-operador-cuenta-titulo" className="app-title mt-1">
                  Crear operador de cuenta
                </h3>
                <p className="mt-1 text-sm text-slate-600">ID se genera al guardar.</p>
              </div>
              <button
                type="button"
                onClick={() => !saving && setModalOpen(false)}
                className="shrink-0 rounded-full border border-slate-200 px-3 py-1 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-700">ID único</label>
                <input
                  value="Se genera al guardar"
                  readOnly
                  tabIndex={-1}
                  className="mt-2 w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-500"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">Código</label>
                <input
                  type="text"
                  value={codigo}
                  onChange={(e) => setCodigo(normalizeOperadorCodeInput(e.target.value))}
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none"
                  placeholder="Código base 36 (5 caracteres)"
                  disabled={saving}
                  autoComplete="off"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Se genera igual que las cuentas (base 36, 5 caracteres). Al salir del nombre sin código, se sugiere
                  uno.
                </p>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">Nombre</label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  onBlur={() => {
                    if (!normalizeOperadorCodeInput(codigo) && nombre.trim()) {
                      setCodigo(suggestOperadorCodeFromName(nombre));
                    }
                  }}
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none"
                  placeholder="Nombre del usuario"
                  required
                  disabled={saving}
                  autoFocus
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">Rol</label>
                <select
                  value="operadorCuentas"
                  disabled
                  className="mt-2 w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-700"
                  aria-label="Rol fijo: operador de cuentas"
                >
                  <option value="operadorCuentas">operador de cuentas</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">Asignado</label>
                <input
                  type="text"
                  value={nombreCuentaAsignada || "—"}
                  readOnly
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-700"
                  placeholder="Cuenta"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">Correo</label>
                <input
                  type="email"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none"
                  placeholder="correo@ejemplo.com"
                  required
                  disabled={saving}
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">Clave</label>
                <input
                  type="password"
                  value={clave}
                  onChange={(e) => setClave(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none"
                  placeholder="********"
                  required
                  minLength={6}
                  disabled={saving}
                />
              </div>

              {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => !saving && setModalOpen(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={
                    saving ||
                    !nombre.trim() ||
                    !correo.trim() ||
                    !clave.trim() ||
                    normalizeOperadorCodeInput(codigo).length !== 5
                  }
                  className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-300"
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
