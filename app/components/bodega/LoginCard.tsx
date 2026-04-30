import React, { useState } from "react";
import { MdOutlineSevereCold } from "react-icons/md";


export interface LoginCardProps {
  username: string;
  password: string;
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: () => void;
  errorMessage?: string;
  /** Botones bajo «Entrar» que rellenan usuario y contraseña (p. ej. atajos de desarrollo). */
  quickFillActions?: Array<{ label: string; onFill: () => void }>;
}

const LoginCard: React.FC<LoginCardProps> = ({
  username,
  password,
  onUsernameChange,
  onPasswordChange,
  onSubmit,
  errorMessage,
  quickFillActions,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  return (
    <div className="w-full max-w-md rounded-3xl border border-white/60 bg-white/95 p-8 shadow-2xl backdrop-blur-lg">
      {/* Logo/Icon */}
      <div className="flex flex-col items-center mb-4">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-slate-900/90 shadow-lg mb-2">
          <MdOutlineSevereCold size={40} className="text-sky-400" />
        </div>
        <p className="text-xs font-bold uppercase tracking-[0.4em] text-slate-400">
          POLARIA
        </p>
      </div>

      <div className="text-center">
        <h2 className="app-title">Iniciar sesión</h2>
        <p className="mt-2 text-base text-slate-600">Accede para gestionar la operación diaria.</p>
      </div>

      <form
        className="mt-8 grid gap-5"
        onSubmit={e => { e.preventDefault(); onSubmit(); }}
        autoComplete="off"
      >
        <div>
          <label htmlFor="username" className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
            Usuario
          </label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(event) => onUsernameChange(event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-700 shadow-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
            placeholder="Usuario"
            autoFocus
            autoComplete="username"
            aria-label="Usuario"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
            Contraseña
          </label>
          <div className="relative mt-1">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-12 text-base text-slate-700 shadow-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
              placeholder="Contraseña"
              autoComplete="current-password"
              aria-label="Contraseña"
            />
            <button
              type="button"
              tabIndex={-1}
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              className="absolute inset-y-0 right-0 flex items-center justify-center px-3 text-slate-400 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 rounded-r-xl"
              onClick={() => setShowPassword((v) => !v)}
            >
              {showPassword ? (
                <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="2" d="M3 12s3.6-7 9-7 9 7 9 7-3.6 7-9 7-9-7-9-7Z"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/><path stroke="currentColor" strokeWidth="2" d="M2 2l20 20"/></svg>
              ) : (
                <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="2" d="M3 12s3.6-7 9-7 9 7 9 7-3.6 7-9 7-9-7-9-7Z"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/></svg>
              )}
            </button>
          </div>
        </div>

        {errorMessage ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-600 animate-shake">
            {errorMessage}
          </div>
        ) : null}

        <button
          type="submit"
          className="w-full rounded-xl bg-linear-to-r from-sky-500 to-slate-900 px-4 py-3 text-base font-bold text-white shadow-lg transition hover:from-sky-600 hover:to-slate-800 active:scale-95 focus:outline-none focus:ring-2 focus:ring-sky-300"
        >
          Entrar
        </button>
      </form>

      {quickFillActions && quickFillActions.length > 0 ? (
        <div className="mt-6 border-t border-slate-200 pt-5">
          <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">
            Acceso rápido por rol
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {quickFillActions.map(({ label, onFill }) => (
              <button
                key={label}
                type="button"
                onClick={onFill}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-sky-300 hover:bg-sky-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-200"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

    </div>
  );
};

export default LoginCard;
