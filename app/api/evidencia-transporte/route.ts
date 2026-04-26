import cloudinary from "cloudinary";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_BYTES = 10 * 1024 * 1024;

/** El SDK a veces devuelve un objeto error plano, no `instanceof Error`. */
function toUploadError(e: unknown): Error {
  if (e instanceof Error) return e;
  if (typeof e === "string" && e.trim()) return new Error(e);
  if (e && typeof e === "object" && "message" in e) {
    const m = (e as { message?: unknown }).message;
    if (m != null && String(m).trim()) return new Error(String(m));
  }
  try {
    return new Error(e ? JSON.stringify(e) : "Error al subir a Cloudinary.");
  } catch {
    return new Error("Error al subir a Cloudinary.");
  }
}

/** Quita espacios, comillas típicas y BOM (Windows) al pegar en .env. */
function trimEnv(v: string | undefined): string {
  if (v == null) return "";
  let s = String(v).replace(/^\uFEFF/, "").trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

/**
 * Credenciales alineadas entre sí. Prioridad: `CLOUDINARY_URL` (como en el dashboard)
 * para evitar mezclar cloud name / key / secret de distintos entornos.
 */
function readCloudinaryCredentials():
  | { ok: true; cloud_name: string; api_key: string; api_secret: string }
  | { ok: false; message: string } {
  const rawUrl = trimEnv(process.env.CLOUDINARY_URL);
  if (rawUrl) {
    try {
      const u = new URL(rawUrl);
      if (u.protocol !== "cloudinary:") {
        return { ok: false, message: "CLOUDINARY_URL debe empezar con cloudinary://" };
      }
      const cloud_name = u.hostname.trim();
      const api_key = decodeURIComponent(u.username).trim();
      let api_secret = u.password;
      if (api_secret) {
        api_secret = decodeURIComponent(api_secret);
      }
      api_secret = api_secret.trim();
      if (!cloud_name || !api_key || !api_secret) {
        return { ok: false, message: "CLOUDINARY_URL incompleto (cloud, key o secret vacío)." };
      }
      return { ok: true, cloud_name, api_key, api_secret };
    } catch {
      return { ok: false, message: "CLOUDINARY_URL no es una URL válida." };
    }
  }

  const cloud_name = trimEnv(process.env.CLOUDINARY_CLOUD_NAME);
  const api_key = trimEnv(process.env.CLOUDINARY_API_KEY);
  const api_secret = trimEnv(process.env.CLOUDINARY_API_SECRET);
  if (!cloud_name || !api_key || !api_secret) {
    return {
      ok: false,
      message:
        "Configurá Cloudinary: variable CLOUDINARY_URL o las tres CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.",
    };
  }
  return { ok: true, cloud_name, api_key, api_secret };
}

/** Sube firmada: requiere key + secret. Preset no firmado: solo cloud name. */
type CloudinaryMode = { kind: "signed" } | { kind: "unsigned"; preset: string };

function ensureCloudinary(): { ok: true; mode: CloudinaryMode } | { ok: false; message: string } {
  /** Si existe `CLOUDINARY_URL`, tiene prioridad (misma línea que el panel de Cloudinary). */
  const rawUrl = trimEnv(process.env.CLOUDINARY_URL);
  if (rawUrl) {
    const c = readCloudinaryCredentials();
    if (!c.ok) return c;
    cloudinary.v2.config({
      cloud_name: c.cloud_name,
      api_key: c.api_key,
      api_secret: c.api_secret,
      secure: true,
    });
    return { ok: true, mode: { kind: "signed" } };
  }

  const unsignedPreset = trimEnv(process.env.CLOUDINARY_UNSIGNED_UPLOAD_PRESET);
  if (unsignedPreset) {
    const cloud_name = trimEnv(process.env.CLOUDINARY_CLOUD_NAME);
    if (!cloud_name) {
      return {
        ok: false,
        message: "Con CLOUDINARY_UNSIGNED_UPLOAD_PRESET también hace falta CLOUDINARY_CLOUD_NAME.",
      };
    }
    cloudinary.v2.config({ cloud_name, secure: true });
    return { ok: true, mode: { kind: "unsigned", preset: unsignedPreset } };
  }

  const c = readCloudinaryCredentials();
  if (!c.ok) return c;
  cloudinary.v2.config({
    cloud_name: c.cloud_name,
    api_key: c.api_key,
    api_secret: c.api_secret,
    secure: true,
  });
  return { ok: true, mode: { kind: "signed" } };
}

/**
 * Sube una imagen de evidencia de entrega (rol transporte) a Cloudinary y devuelve la URL segura.
 * La URL luego se guarda en Firestore vía `ViajeVentaTransporteService.registrarEntrega`.
 */
export async function POST(req: Request) {
  const cfg = ensureCloudinary();
  if (!cfg.ok) {
    return NextResponse.json({ error: cfg.message }, { status: 503 });
  }
  const { mode } = cfg;

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Cuerpo de solicitud inválido." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Falta el archivo (campo «file»)." }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "La imagen supera 10 MB." }, { status: 400 });
  }

  const type = (file.type ?? "").toLowerCase();
  if (!type.startsWith("image/")) {
    return NextResponse.json({ error: "Solo se permiten imágenes (JPEG, PNG, WebP, etc.)." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const folder = (process.env.CLOUDINARY_EVIDENCIA_FOLDER ?? "bodega-venta-evidencias").trim() || "bodega-venta-evidencias";
  const dataUri = `data:${type};base64,${buffer.toString("base64")}`;

  try {
    const secure_url = await new Promise<string>((resolve, reject) => {
      const onDone = (err: unknown, result?: { secure_url?: string }) => {
        if (err != null) {
          reject(toUploadError(err));
          return;
        }
        const url = String(result?.secure_url ?? "").trim();
        if (!url) {
          reject(new Error("Cloudinary no devolvió URL."));
          return;
        }
        resolve(url);
      };

      if (mode.kind === "unsigned") {
        /**
         * No usa API Secret (evita "Invalid signature" si el secret en .env no coincide con el panel).
         * En Cloudinary: Settings → Upload → Upload presets → Add → Signing mode: **Unsigned**,
         * y el nombre del preset en CLOUDINARY_UNSIGNED_UPLOAD_PRESET.
         */
        cloudinary.v2.uploader.unsigned_upload(
          dataUri,
          mode.preset,
          { folder, resource_type: "image" },
          onDone,
        );
        return;
      }

      /** v2: `upload(file, options, callback)` — opciones mínimas para la firma. */
      cloudinary.v2.uploader.upload(
        dataUri,
        { folder, resource_type: "image" },
        onDone,
      );
    });

    return NextResponse.json({ url: secure_url });
  } catch (e: unknown) {
    const err = toUploadError(e);
    let message = err.message;
    if (/invalid signature/i.test(message)) {
      message =
        "Cloudinary: firma inválida. Suele ser API Secret incorrecta o mezclada con otro entorno. " +
        "En .env usá una sola línea CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME (copiála del panel) o verificá las tres variables. " +
        "Reiniciá el servidor tras cambiar .env.";
    }
    console.error("evidencia-transporte Cloudinary:", err.message, e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
