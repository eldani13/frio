/**
 * Unifica la respuesta del backend de análisis de imagen:
 * - Express + Gemini: `{ temperature: "3.5" | null }`
 * - Formato legacy: `{ numbersDetected: ["3,5", ...] }`
 */
export function temperatureStringFromAnalyzeResponse(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;

  const fromArray = d.numbersDetected;
  if (Array.isArray(fromArray) && fromArray.length > 0) {
    const first = String(fromArray[0] ?? "").trim();
    if (first) return first.replace(",", ".");
  }

  const t = d.temperature;
  if (t === null || t === undefined) return null;
  const s = String(t).trim();
  if (!s || /^n\/?a$/i.test(s)) return null;
  return s.replace(",", ".");
}
