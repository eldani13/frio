import React, { useState } from "react";
import Image from "next/image";


export interface LoginCardProps {
  username: string;
  password: string;
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: () => void;
  errorMessage?: string;
  /** Atajos por sección bajo «Entrar» (p. ej. desarrollo). */
  quickFillGroups?: Array<{ title: string; actions: Array<{ label: string; onFill: () => void }> }>;
}

const LoginCard: React.FC<LoginCardProps> = ({
  username,
  password,
  onUsernameChange,
  onPasswordChange,
  onSubmit,
  errorMessage,
  quickFillGroups,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  return (
    <div className="w-full max-w-lg rounded-2xl border border-white/[0.08] bg-white/[0.03] p-10 shadow-none backdrop-blur-md">
      <div className="mx-auto mb-8 h-px w-14 bg-teal-400/80" aria-hidden />
      <div className="flex flex-col items-center mb-8">
        <Image
          src="/logo.png"
          alt="Logotipo"
          width={320}
          height={112}
          className="h-16 w-auto max-w-[280px] object-contain"
          priority
        />
      </div>

      <div className="text-center">
        <h2 className="app-title !text-white text-xl font-semibold tracking-tight">Iniciar sesión</h2>
        <p className="mt-3 text-sm italic text-white/45 font-serif leading-relaxed">
          Accede para gestionar la operación diaria.
        </p>
      </div>

      <form
        className="mt-10 grid gap-5"
        onSubmit={e => { e.preventDefault(); onSubmit(); }}
        autoComplete="off"
      >
        <div>
          <label htmlFor="username" className="block text-xs font-semibold uppercase tracking-[0.2em] text-teal-400/90 mb-1.5">
            Usuario
          </label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(event) => onUsernameChange(event.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/35 px-4 py-3 text-base text-white outline-none transition placeholder:text-white/25 focus:border-teal-400/55 focus:ring-1 focus:ring-teal-400/25"
            placeholder="Usuario"
            autoFocus
            autoComplete="username"
            aria-label="Usuario"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-[0.2em] text-teal-400/90 mb-1.5">
            Contraseña
          </label>
          <div className="relative mt-1">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
              className="w-full rounded-lg border border-white/10 bg-black/35 px-4 py-3 pr-12 text-base text-white outline-none transition placeholder:text-white/25 focus:border-teal-400/55 focus:ring-1 focus:ring-teal-400/25"
              placeholder="Contraseña"
              autoComplete="current-password"
              aria-label="Contraseña"
            />
            <button
              type="button"
              tabIndex={-1}
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              className="absolute inset-y-0 right-0 flex items-center justify-center px-3 text-teal-400/50 hover:text-teal-300 focus:outline-none focus-visible:ring-1 focus-visible:ring-teal-400/40 rounded-r-lg"
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
          <div className="rounded-lg border border-red-500/35 bg-red-950/40 px-3 py-2 text-sm font-semibold text-red-300 animate-shake">
            {errorMessage}
          </div>
        ) : null}

        <button
          type="submit"
          className="w-full rounded-lg bg-teal-400 px-4 py-3.5 text-base font-bold tracking-wide text-slate-950 shadow-none transition hover:bg-teal-300 active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-200/70"
        >
          Entrar
        </button>
      </form>

      {quickFillGroups && quickFillGroups.length > 0 ? (
        <div className="mt-8 space-y-6 border-t border-white/[0.08] pt-6">
          {/* <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-teal-500/70">
            Acceso rápido por rol
          </p> */}
          {quickFillGroups.map((group) => (
            <div key={group.title}>
              <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
                {group.title}
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {group.actions.map(({ label, onFill }) => (
                  <button
                    key={`${group.title}-${label}`}
                    type="button"
                    onClick={onFill}
                    className="rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm font-medium text-white/75 transition hover:border-teal-400/40 hover:bg-white/[0.05] hover:text-white focus:outline-none focus-visible:ring-1 focus-visible:ring-teal-400/35"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}

    </div>
  );
};

export default LoginCard;
