// POST /api/admin/clave  { actual, nueva }  → cambiar mi contraseña
// Si es la primera vez (contraseña temporal), no pide la actual.
import { json, error, leerJSON } from "../../../lib/http.js";
import { claveCorrecta, cifrarClave, claveValida, huella } from "../../../lib/auth.js";
import { anotar } from "../../../lib/bitacora.js";

export async function onRequestPost({ request, env, data }) {
  const e = await leerJSON(request);
  const nueva = String(e?.nueva || "");
  const problema = claveValida(nueva);
  if (problema) return error(problema);

  const u = await env.DB.prepare("SELECT clave, cambiar_clave FROM usuarios WHERE email = ?").bind(data.usuario.email).first();
  if (!u) return error("Usuario no encontrado.", 404);
  if (!u.cambiar_clave && !(await claveCorrecta(String(e?.actual || ""), u.clave))) {
    return error("La contraseña actual no es correcta.");
  }
  if (await claveCorrecta(nueva, u.clave)) return error("La nueva contraseña debe ser distinta a la anterior.");

  await env.DB.prepare("UPDATE usuarios SET clave = ?, cambiar_clave = 0 WHERE email = ?")
    .bind(await cifrarClave(nueva), data.usuario.email).run();
  // cierra las demás sesiones de esta persona (deja la actual)
  const actual = (request.headers.get("cookie") || "").match(/__Host-aa_sesion=([a-f0-9]{64})/);
  if (actual) {
    await env.DB.prepare("DELETE FROM sesiones WHERE email = ? AND token <> ?").bind(data.usuario.email, await huella(actual[1])).run();
  }
  await anotar(env, data.usuario, "cambió su contraseña");
  return json({ ok: true });
}
