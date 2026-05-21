/** Cuentas que pueden leer inventario en la base Fridem (código de `clientes.code` / `warehouses.codeCuenta`). */
const DEFAULT_ALLOWED_CODES = ["MIT00"];

function allowedCodesFromEnv(): string[] {
  const raw = process.env.NEXT_PUBLIC_FRIDEM_INVENTORY_CODE_CUENTAS?.trim();
  if (!raw) return DEFAULT_ALLOWED_CODES;
  return raw
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
}

export function normalizeCodeCuenta(code: string | undefined | null): string {
  return String(code ?? "").trim().toUpperCase();
}

export function isFridemInventoryAllowedForCode(codeCuenta?: string | null): boolean {
  const normalized = normalizeCodeCuenta(codeCuenta);
  if (!normalized) return false;
  return allowedCodesFromEnv().includes(normalized);
}
