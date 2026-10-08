// POST /api/acceso/salir → cierra la sesión
import { json } from "../../../lib/http.js";
import { cerrarSesion } from "../../../lib/auth.js";

export async function onRequestPost({ request, env }) {
  const cookie = env.DB ? await cerrarSesion(request, env) : "";
  return json({ ok: true }, 200, cookie ? { "set-cookie": cookie } : {});
}
