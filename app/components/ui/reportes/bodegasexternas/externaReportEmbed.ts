/** URL embed de Looker Studio (Google Data Studio) por código de cuenta. */
const DEFAULT_EMBEDS: Record<string, string> = {
  "000GX":
    "https://datastudio.google.com/embed/reporting/8319190c-7a5c-48b2-9b1d-84701d583dd9/page/RMmyF",
};

function normalizeCode(code: string | undefined | null): string {
  return String(code ?? "").trim().toUpperCase();
}

function embedsFromEnv(): Record<string, string> {
  const raw = process.env.NEXT_PUBLIC_EXTERN_REPORT_EMBEDS?.trim();
  if (!raw) return {};
  const out: Record<string, string> = {};
  for (const part of raw.split(",")) {
    const [code, ...urlParts] = part.split(":");
    const url = urlParts.join(":").trim();
    const c = normalizeCode(code);
    if (c && url.startsWith("http")) out[c] = url;
  }
  return out;
}

export function getExternaReportEmbedUrl(codeCuenta?: string | null): string | null {
  const code = normalizeCode(codeCuenta);
  if (!code) return null;
  const fromEnv = embedsFromEnv()[code];
  if (fromEnv) return fromEnv;
  return DEFAULT_EMBEDS[code] ?? null;
}

export function cuentaExternaTieneReporteEmbed(codeCuenta?: string | null): boolean {
  return Boolean(getExternaReportEmbedUrl(codeCuenta));
}
