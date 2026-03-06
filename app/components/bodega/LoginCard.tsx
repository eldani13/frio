import React, { useState } from "react";
import { MdOutlineSevereCold } from "react-icons/md";


export interface LoginCardProps {
  users: Array<{ username: string; password: string; role: string; displayName: string }>;
  username: string;
  password: string;
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: () => void;
  errorMessage?: string;
}

const LoginCard: React.FC<LoginCardProps> = ({
  users,
  username,
  password,
  onUsernameChange,
  onPasswordChange,
  onSubmit,
  errorMessage,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  // Handler para autocompletar usuario y contraseña
  const handleFillCredentials = (user: { username: string; password: string }) => {
    onUsernameChange(user.username);
    onPasswordChange(user.password);
  };
  return (
    <div
      className="w-full max-w-md rounded-3xl border border-white/60 bg-white/95 p-8 shadow-2xl backdrop-blur-lg"
      style={{ fontFamily: '"Space Grotesk", "Work Sans", sans-serif' }}
    >
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
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Iniciar sesión</h2>
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
        <div className="relative">
          <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
            Contraseña
          </label>
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-700 shadow-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200 pr-12"
            placeholder="Contraseña"
            autoComplete="current-password"
            aria-label="Contraseña"
          />
          <button
            type="button"
            tabIndex={-1}
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            className="absolute top-8 right-3 text-slate-400 hover:text-slate-700 focus:outline-none"
            onClick={() => setShowPassword((v) => !v)}
          >
            {showPassword ? (
              <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="2" d="M3 12s3.6-7 9-7 9 7 9 7-3.6 7-9 7-9-7-9-7Z"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/><path stroke="currentColor" strokeWidth="2" d="M2 2l20 20"/></svg>
            ) : (
              <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="2" d="M3 12s3.6-7 9-7 9 7 9 7-3.6 7-9 7-9-7-9-7Z"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/></svg>
            )}
          </button>
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

      <div className="mt-8 border-t border-slate-200 pt-4 text-xs text-slate-500 bg-white/60 rounded-xl shadow-inner">
        <div className="font-semibold uppercase tracking-wide text-slate-400 mb-2 text-center">
          Usuarios de prueba
        </div>
        <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
          {users.map((user) => (
            <button
              key={user.username}
              type="button"
              className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-slate-700 hover:bg-sky-50 focus:outline-none focus:ring-2 focus:ring-sky-300 transition font-semibold uppercase tracking-wide text-xs"
              title={`Autocompletar como ${user.displayName || user.role}`}
              onClick={() => handleFillCredentials(user)}
            >
              {user.displayName || user.role}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LoginCard;
