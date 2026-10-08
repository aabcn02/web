// POST /api/acceso/entrar  { email, clave }  → crea la sesión (cookie)
import { json, error, leerJSON } from "../../../lib/http.js";
import { claveCorrecta, crearSesion } from "../../../lib/auth.js";

const MAX_INTENTOS = 5;
const BLOQUEO_MIN = 15;

export async function onRequestPost({ request, env }) {
  if (!env.DB) return error("Falta conectar la base de datos (binding DB).", 500);
  if (request.headers.get("x-aa-panel") !== "1") return error("Solicitud no permitida.", 403);
  const e = await leerJSON(request);
  const email = String(e?.email || "").trim().toLowerCase().slice(0, 120);
  const clave = String(e?.clave || "").slice(0, 200);
  if (!email || !clave) return error("Escribe tu correo y tu contraseña.");

  const u = await env.DB.prepare(
    `SELECT email, clave, intentos, bloqueado_hasta, bloqueado_hasta > datetime('now') AS bloqueado
       FROM usuarios WHERE email = ? AND activo = 1`
  ).bind(email).first();

  if (u?.bloqueado) {
    return error(`Demasiados intentos. Espera ${BLOQUEO_MIN} minutos e intenta de nuevo.`, 429);
  }
  const ok = await claveCorrecta(clave, u?.clave);   // siempre tarda lo mismo, exista o no el correo
  if (!u || !ok) {
    if (u) {
      const n = (u.intentos || 0) + 1;
      if (n >= MAX_INTENTOS) {
        await env.DB.prepare(
          `UPDATE usuarios SET intentos = 0, bloqueado_hasta = datetime('now', '+${BLOQUEO_MIN} minutes') WHERE email = ?`
        ).bind(email).run();
      } else {
        await env.DB.prepare("UPDATE usuarios SET intentos = ?, bloqueado_hasta = NULL WHERE email = ?").bind(n, email).run();
      }
    }
    return error("Correo o contraseña incorrectos.", 401);
  }

  await env.DB.prepare("UPDATE usuarios SET intentos = 0, bloqueado_hasta = NULL WHERE email = ?").bind(email).run();
  const cookie = await crearSesion(env, email);
  return json({ ok: true }, 200, { "set-cookie": cookie });
}
