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
    <div className="rounded-2xl bg-white p-6 shadow-md w-full max-w-md">
      <h2 className="text-lg font-semibold mb-2">Iniciar sesión</h2>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Usuario</label>
        <input
          type="text"
          value={username}
          onChange={e => onUsernameChange(e.target.value)}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          placeholder="Usuario"
        />
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Contraseña</label>
        <input
          type="password"
          value={password}
          onChange={e => onPasswordChange(e.target.value)}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          placeholder="Contraseña"
        />
      </div>
      {errorMessage && (
        <div className="mb-2 text-red-600 text-sm">{errorMessage}</div>
      )}
      <button
        type="button"
        onClick={onSubmit}
        className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
      >
        Entrar
      </button>
      <div className="mt-4 text-xs text-slate-500">
        <div>Usuarios de prueba:</div>
        <ul className="mt-1">
          {users.map(u => (
            <li key={u.username}>
              <span className="font-bold">{u.username}</span> / <span>{u.password}</span> ({u.role})
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default LoginCard;
