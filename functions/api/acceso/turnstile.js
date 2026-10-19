// GET /api/acceso/turnstile → { sitekey } si Turnstile está configurado (la sitekey es pública)
import { json } from "../../../lib/http.js";
import { turnstileActivo } from "../../../lib/turnstile.js";

export async function onRequestGet({ env }) {
  return json({ sitekey: turnstileActivo(env) ? env.TURNSTILE_SITEKEY : null });
}
