import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { db, getSecondaryAuth } from "@/lib/firebaseClient";

export const OPERADOR_CUENTAS_ROLE = "operadorCuentas" as const;

export type OperadorCuentaRow = {
  id: string;
  name: string;
  email: string;
  code: string;
  createdAt?: string;
  createdAtMs?: number;
};

function generateUserCode(name: string): string {
  const normalized = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]/g, "")
    .toUpperCase();
  const seed = normalized.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const rand = Math.floor(Math.random() * 36 ** 2);
  const codeNumber = (seed + rand) % 36 ** 5;
  return codeNumber.toString(36).toUpperCase().padStart(5, "0");
}

/** Misma lógica que el código de usuario/cuenta en configurador (base 36, 5 caracteres). */
export function normalizeOperadorCodeInput(value: string): string {
  const normalized = value.toUpperCase().replace(/[^0-9A-Z]/g, "");
  if (!normalized) return "";
  return normalized.padEnd(5, "0").slice(0, 5);
}

/** Sugerencia al escribir el nombre (como cuentas / usuarios del configurador). */
export function suggestOperadorCodeFromName(name: string): string {
  return generateUserCode(name.trim() || "USER");
}

export async function listOperadoresCuenta(clientId: string): Promise<OperadorCuentaRow[]> {
  if (!clientId.trim()) return [];
  const q = query(collection(db, "usuarios"), where("clientId", "==", clientId.trim()));
  const snapshot = await getDocs(q);
  const rows: OperadorCuentaRow[] = [];
  for (const docSnap of snapshot.docs) {
    const data = docSnap.data() as {
      name?: string;
      displayName?: string;
      role?: string;
      email?: string;
      code?: string;
      createdAt?: { toMillis?: () => number };
    };
    if (data.role !== OPERADOR_CUENTAS_ROLE) continue;
    const createdAtMs =
      data.createdAt && typeof data.createdAt.toMillis === "function"
        ? data.createdAt.toMillis()
        : undefined;
    rows.push({
      id: docSnap.id,
      name: (data.name ?? data.displayName ?? "").toString().trim() || "Sin nombre",
      email: (data.email ?? "").toString(),
      code: (data.code ?? "").toString(),
      createdAtMs,
      createdAt: createdAtMs ? new Date(createdAtMs).toLocaleString("es-CO") : undefined,
    });
  }
  rows.sort(
    (a, b) =>
      (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0) || a.name.localeCompare(b.name, "es"),
  );
  return rows;
}

export async function createOperadorCuenta(params: {
  name: string;
  email: string;
  password: string;
  clientId: string;
  createdByUid: string;
  createdByRole: string;
  /** Opcional; si viene vacío se genera desde el nombre. Debe ser 5 caracteres base 36. */
  code?: string;
}): Promise<void> {
  const name = params.name.trim();
  const email = params.email.trim();
  const password = params.password;
  if (!name) throw new Error("El nombre es obligatorio.");
  if (!email) throw new Error("El correo es obligatorio.");
  if (!password) throw new Error("La contraseña es obligatoria.");
  if (!params.clientId.trim()) throw new Error("Falta la cuenta (cliente).");

  const codeInput = normalizeOperadorCodeInput((params.code ?? "").trim());
  const code = codeInput.length === 5 ? codeInput : generateUserCode(name);
  if (code.length !== 5) throw new Error("El código debe tener 5 caracteres (base 36).");

  const secondaryAuth = getSecondaryAuth();
  try {
    const credentials = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    await setDoc(doc(db, "usuarios", credentials.user.uid), {
      name,
      code,
      role: OPERADOR_CUENTAS_ROLE,
      clientId: params.clientId.trim(),
      email,
      displayName: name,
      createdAt: serverTimestamp(),
      createdBy: params.createdByUid,
      createdByRole: params.createdByRole,
      disabled: false,
    });
  } finally {
    await signOut(secondaryAuth);
  }
}
