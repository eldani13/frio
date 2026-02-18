import React from "react";

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
  return (
    <div
      className="w-full max-w-md rounded-3xl border border-white/60 bg-white/90 p-8 shadow-xl backdrop-blur"
      style={{ fontFamily: '"Space Grotesk", "Work Sans", sans-serif' }}
    >
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">
          Bodega de frio
        </p>
        <h2 className="mt-3 text-2xl font-semibold text-slate-900">
          Iniciar sesion
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Accede para gestionar la operacion diaria.
        </p>
      </div>

      <div className="mt-6 grid gap-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Usuario
          </label>
          <input
            type="text"
            value={username}
            onChange={(event) => onUsernameChange(event.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-slate-400"
            placeholder="Usuario"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Contrasena
          </label>
          <input
            type="password"
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-slate-400"
            placeholder="Contrasena"
          />
        </div>
      </div>

      {errorMessage ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-600">
          {errorMessage}
        </div>
      ) : null}

      <button
        type="button"
        onClick={onSubmit}
        className="mt-6 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
      >
        Entrar
      </button>

      <div className="mt-6 border-t border-slate-200 pt-4 text-xs text-slate-500">
        <div className="font-semibold uppercase tracking-wide text-slate-400">
          Usuarios de prueba
        </div>
        <ul className="mt-2 grid gap-2">
          {users.map((user) => (
            <li
              key={user.username}
              className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
            >
              <span className="font-semibold text-slate-700">
                {user.username}
              </span>
              <span className="text-slate-400"> / </span>
              <span>{user.password}</span>
              <span className="text-slate-400"> · </span>
              <span className="uppercase text-[10px] tracking-wide text-slate-500">
                {user.role}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default LoginCard;
