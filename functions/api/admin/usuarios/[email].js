// DELETE /api/admin/usuarios/:email → quitar acceso (solo administrador; no se puede quitar a uno mismo)
import { json, error } from "../../../../lib/http.js";
import { anotar } from "../../../../lib/bitacora.js";

export async function onRequestDelete({ env, params, data }) {
  if (data.usuario.rol !== "admin") return error("Solo el administrador.", 403);
  const email = decodeURIComponent(String(params.email || "")).toLowerCase();
  if (email === data.usuario.email) return error("No puedes quitarte el acceso a ti mismo.");
  const res = await env.DB.prepare("UPDATE usuarios SET activo = 0 WHERE email = ?").bind(email).run();
  if (!res.meta.changes) return error("Ese usuario no existe.", 404);
  await anotar(env, data.usuario, "usuario dado de baja", email);
  return json({ ok: true });
}
