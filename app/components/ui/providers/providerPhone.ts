/** Normaliza teléfonos viejos al formato que entiende PhoneInput (E.164 con +). */
export function normalizeStoredTelefono(raw: string | undefined): string {
  if (!raw?.trim()) return "";
  let t = raw.trim().replace(/\s/g, "");
  if (t.startsWith("+")) return t;
  const digits = t.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("57") && digits.length >= 12) return `+${digits}`;
  if (digits.length === 10) return `+57${digits}`;
  return `+${digits}`;
}
