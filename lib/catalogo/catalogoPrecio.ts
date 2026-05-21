import type { Catalogo } from "@/app/types/catalogo";

function coerceNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const t = value.trim().replace(",", ".");
    if (!t) return undefined;
    const n = Number(t);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

/**
 * Precio mostrado en catálogo: `price`, si no `costPerItem`, si no `precio` (import legacy).
 */
export function precioCatalogoNumerico(p: Catalogo): number | undefined {
  const fromPrice = coerceNumber(p.price);
  if (fromPrice !== undefined) return fromPrice;
  const fromCost = coerceNumber(p.costPerItem);
  if (fromCost !== undefined) return fromCost;
  const raw = (p as Catalogo & { precio?: unknown }).precio;
  return coerceNumber(raw);
}

export function formatoPrecioCatalogo(p: Catalogo): string {
  const n = precioCatalogoNumerico(p);
  return n !== undefined ? `$${n}` : "—";
}

export function coerceNumberImport(value: unknown): number | undefined {
  return coerceNumber(value);
}
