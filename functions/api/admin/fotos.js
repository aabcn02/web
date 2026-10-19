// POST /api/admin/fotos  (cuerpo = el archivo)  → { url: "/fotos/..." }
// Las fotos ya llegan achicadas desde el navegador; aquí solo se revisa que de verdad sean
// imagen (JPG, PNG, WebP) o PDF, y que no pesen de más. Se guardan en R2 (binding FOTOS).
import { json, error } from "../../../lib/http.js";
import { anotar } from "../../../lib/bitacora.js";

const TIPOS = {
  jpg:  { mime: "image/jpeg",      max: 3 * 1024 * 1024,  firma: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  png:  { mime: "image/png",       max: 3 * 1024 * 1024,  firma: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  webp: { mime: "image/webp",      max: 3 * 1024 * 1024,  firma: (b) => ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 12) === "WEBP" },
  pdf:  { mime: "application/pdf", max: 15 * 1024 * 1024, firma: (b) => ascii(b, 0, 5) === "%PDF-" },
};

// Topes para que ni un error ni una cuenta robada puedan llenar el almacenamiento (y generar cobro)
const MAX_ARCHIVOS_DIA = 3;                        // por usuario, en 24 horas
const MAX_MB_DIA = 15;                             // por usuario, en 24 horas (suma de sus archivos)
const MAX_MB_DIA_SITIO = 25;                       // entre TODOS, en 24 horas (25 MB × 365 ≈ 9 GB al año como máximo)
const MAX_GB_TOTAL = 9;                            // R2 gratis llega a 10 GB: se para antes

export async function onRequestPost({ request, env, data }) {
  if (!env.FOTOS) return error("Falta conectar el almacenamiento de fotos (R2, binding FOTOS).", 500);
  // Se rechaza ANTES de recibir el archivo si dice que pesa de más
  const largo = Number(request.headers.get("content-length") || 0);
  if (largo > 15 * 1024 * 1024) return error("El archivo pesa demasiado (máximo 15 MB).", 413);
  try {
    const hoy = await env.DB.prepare(
      "SELECT COUNT(*) AS n, COALESCE(SUM(bytes), 0) AS b FROM subidas WHERE email = ? AND fecha > datetime('now', '-1 day')"
    ).bind(data.usuario.email).first();
    if (hoy.n >= MAX_ARCHIVOS_DIA) return error(`Llegaste al límite de ${MAX_ARCHIVOS_DIA} archivos por día. Intenta mañana.`, 429);
    if (hoy.b >= MAX_MB_DIA * 1024 * 1024) return error(`Llegaste al límite de ${MAX_MB_DIA} MB por día. Intenta mañana.`, 429);
    if (hoy.b + largo > MAX_MB_DIA * 1024 * 1024) return error(`Ese archivo pasa tu límite de ${MAX_MB_DIA} MB por día. Intenta mañana.`, 429);
    const sitio = await env.DB.prepare("SELECT COALESCE(SUM(bytes), 0) AS b FROM subidas WHERE fecha > datetime('now', '-1 day')").first();
    if (sitio.b + largo > MAX_MB_DIA_SITIO * 1024 * 1024) return error("Se llegó al límite de subidas del sitio por hoy. Intenta mañana.", 429);
    const total = await env.DB.prepare("SELECT COALESCE(SUM(bytes), 0) AS b FROM subidas").first();
    if (total.b >= MAX_GB_TOTAL * 1024 * 1024 * 1024) return error("El almacenamiento de fotos está casi lleno. Avisa al administrador del sitio.", 507);
  } catch (_) { /* tabla "subidas" todavía no creada: se sigue con los topes por archivo */ }

  const buf = new Uint8Array(await request.arrayBuffer());
  if (!buf.length) return error("El archivo está vacío.");
  const ext = Object.keys(TIPOS).find((k) => TIPOS[k].firma(buf));
  if (!ext) return error("Solo se aceptan fotos (JPG, PNG, WebP) o PDF.");
  const t = TIPOS[ext];
  if (buf.length > t.max) return error(`El archivo pesa demasiado (máximo ${Math.round(t.max / 1024 / 1024)} MB).`);

  const hoy = new Date();
  const carpeta = ext === "pdf" ? "documentos" : "fotos";
  const nombre = limpiarNombre(new URL(request.url).searchParams.get("nombre"), ext);
  const clave = `${carpeta}/${hoy.getUTCFullYear()}/${String(hoy.getUTCMonth() + 1).padStart(2, "0")}/${crypto.randomUUID().slice(0, 8)}-${nombre}`;
  await env.FOTOS.put(clave, buf, { httpMetadata: { contentType: t.mime } });
  try {
    await env.DB.prepare("INSERT INTO subidas (email, clave, bytes) VALUES (?, ?, ?)").bind(data.usuario.email, clave, buf.length).run();
  } catch (_) { /* tabla no creada todavía */ }
  await anotar(env, data.usuario, "archivo subido", clave);
  return json({ ok: true, url: `/fotos/${clave}`, tipo: ext }, 201);
}

function limpiarNombre(n, ext) {
  const base = String(n || "archivo").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/\.[a-z0-9]{2,5}$/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "archivo";
  return `${base}.${ext}`;
}

function ascii(b, ini, fin) {
  return String.fromCharCode(...b.slice(ini, fin));
}
