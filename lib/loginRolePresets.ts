/**
 * Atajos de login por rol (email + contraseña para Firebase Auth).
 * Firestore no almacena contraseñas y las reglas actuales no permiten leer usuarios sin sesión,
 * así que los datos viven aquí o en variables de entorno.
 *
 * Opcional: `NEXT_PUBLIC_BODEGA_DEV_LOGINS` — JSON con forma
 * `{ "custodio": { "email": "...", "password": "..." }, ... }`
 *
 * Los botones se muestran en todos los entornos salvo que definas
 * `NEXT_PUBLIC_DISABLE_LOGIN_ROLE_SHORTCUTS=1` (p. ej. despliegue muy sensible).
 */

export type LoginPresetKey =
  | "custodio"
  | "operario"
  | "procesador"
  | "jefe"
  | "administrador"
  | "cuenta"
  | "configurador"
  | "operador"
  | "transporte";

type Credentials = { email: string; password: string };

/** Grupos en pantalla de login (orden y etiquetas). */
const LOGIN_SHORTCUT_GROUPS: Array<{
  title: string;
  entries: Array<{ key: LoginPresetKey; label: string }>;
}> = [
  {
    title: "Polaria Interno",
    entries: [{ key: "configurador", label: "Configurador" }],
  },
  {
    title: "Generador de Carga",
    entries: [
      { key: "cuenta", label: "Admin Cuenta" },
      { key: "operador", label: "Operador Cuenta" },
    ],
  },
  {
    title: "Bodega Interna",
    entries: [
      { key: "administrador", label: "Admin Bodega" },
      { key: "jefe", label: "Jefe Bodega" },
      { key: "custodio", label: "Custodio" },
      { key: "operario", label: "Operador" },
      { key: "procesador", label: "Procesador" },
    ],
  },
  {
    title: "Otros",
    entries: [{ key: "transporte", label: "Transportista" }],
  },
];

/** Credenciales por defecto de los atajos (Firebase Auth). */
const DEFAULTS: Record<LoginPresetKey, Credentials> = {
  custodio: { email: "custodio@custodio.com", password: "custodio123" },
  operario: { email: "operario@operario.com", password: "operario123" },
  procesador: { email: "procesador@procesador.com", password: "procesador123" },
  jefe: { email: "jefe@jefe.com", password: "jefe123" },
  administrador: { email: "admin@admin.com", password: "admin123" },
  cuenta: { email: "adminmit@mit.com", password: "adminmit123" },
  configurador: { email: "configurador@configurador.com", password: "configurador123" },
  operador: { email: "operadormit@operadormit.com", password: "123456789" },
  transporte: { email: "transporte@transporte.com", password: "transporte123" },
};

const PRESET_KEYS = new Set<LoginPresetKey>([
  "custodio",
  "operario",
  "procesador",
  "jefe",
  "administrador",
  "cuenta",
  "configurador",
  "operador",
  "transporte",
]);

function parseEnvOverrides(): Partial<Record<LoginPresetKey, Credentials>> | null {
  const raw = process.env.NEXT_PUBLIC_BODEGA_DEV_LOGINS?.trim();
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const out: Partial<Record<LoginPresetKey, Credentials>> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (!PRESET_KEYS.has(k as LoginPresetKey)) continue;
      const key = k as LoginPresetKey;
      if (!v || typeof v !== "object") continue;
      const row = v as Record<string, unknown>;
      const email = typeof row.email === "string" ? row.email : "";
      const password = typeof row.password === "string" ? row.password : "";
      out[key] = { email, password };
    }
    return out;
  } catch {
    return null;
  }
}

function envCredential(
  key: LoginPresetKey,
  field: "email" | "password",
  fallback: string,
): string {
  const suffix = key.toUpperCase().replace(/[^A-Z0-9]/g, "_");
  const v = process.env[`NEXT_PUBLIC_LOGIN_${suffix}_${field === "email" ? "EMAIL" : "PASSWORD"}`];
  return typeof v === "string" && v.length > 0 ? v : fallback;
}

export const loginRoleShortcutsEnabled =
  process.env.NEXT_PUBLIC_DISABLE_LOGIN_ROLE_SHORTCUTS !== "1";

function resolveShortcutCredentials(
  key: LoginPresetKey,
  overrides: Partial<Record<LoginPresetKey, Credentials>> | null,
): Credentials {
  const base = DEFAULTS[key];
  const o = overrides?.[key];
  return {
    email: o?.email ?? envCredential(key, "email", base.email),
    password: o?.password ?? envCredential(key, "password", base.password),
  };
}

export type LoginRoleShortcutGroup = {
  title: string;
  shortcuts: Array<{ label: string; email: string; password: string }>;
};

/** Atajos agrupados para la tarjeta de login (Polaria / Generador / Bodega / Otros). */
export function getLoginRoleShortcutGroups(): LoginRoleShortcutGroup[] {
  const overrides = parseEnvOverrides();
  return LOGIN_SHORTCUT_GROUPS.map((g) => ({
    title: g.title,
    shortcuts: g.entries.map(({ key, label }) => ({
      label,
      ...resolveShortcutCredentials(key, overrides),
    })),
  }));
}

/** Lista plana en el mismo orden que los grupos (tests y compatibilidad). */
export function getLoginRoleShortcuts(): Array<{ label: string; email: string; password: string }> {
  return getLoginRoleShortcutGroups().flatMap((g) => g.shortcuts);
}
