// POST /api/admin/perfil  { nombre }  → mi nombre o apodo (sale en "Publicado por …" de mis noticias)
import { json, error, leerJSON, campo } from "../../../lib/http.js";
import { anotar } from "../../../lib/bitacora.js";

export async function onRequestPost({ request, env, data }) {
  const e = await leerJSON(request);
  const nombre = campo(e?.nombre, 40);
  if (!nombre) return error("Escribe un nombre o apodo.");
  if (/@/.test(nombre)) return error("Pon un nombre o apodo, no un correo (el correo atraería spam).");
  await env.DB.prepare("UPDATE usuarios SET nombre = ? WHERE email = ?").bind(nombre, data.usuario.email).run();
  await anotar(env, data.usuario, "cambió su nombre", nombre);
  return json({ ok: true, nombre });
}
