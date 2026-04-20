/**
 * Parsea entrada numérica con coma o punto (p. ej. "15,6" o "15.6").
 */
export function parseDecimalEs(raw: string): number | null {
  const t = String(raw)
    .trim()
    .replace(/\s/g, "")
    .replace(",", ".");
  if (t === "" || t === "." || t === "-" || t === "-.") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function formatKgEs(n: number): string {
  return n.toLocaleString("es-CO", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  });
}
