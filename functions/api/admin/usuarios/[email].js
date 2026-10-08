// PATCH  /api/admin/usuarios/:email  → nueva contraseña temporal (olvidó su contraseña)
// DELETE /api/admin/usuarios/:email  → quitar acceso
// (solo administrador; no se puede aplicar a uno mismo)
import { json, error } from "../../../../lib/http.js";
import { cifrarClave, claveTemporal } from "../../../../lib/auth.js";
import { anotar } from "../../../../lib/bitacora.js";

function revisar(params, data) {
  if (data.usuario.rol !== "admin") return { err: error("Solo el administrador.", 403) };
  const email = decodeURIComponent(String(params.email || "")).toLowerCase();
  if (email === data.usuario.email) return { err: error("Para tu propia contraseña usa “Mi contraseña”.") };
  return { email };
}

export async function onRequestPatch({ env, params, data }) {
  const { err, email } = revisar(params, data);
  if (err) return err;
  const temporal = claveTemporal();
  const res = await env.DB.prepare(
    "UPDATE usuarios SET clave = ?, cambiar_clave = 1, intentos = 0, bloqueado_hasta = NULL WHERE email = ? AND activo = 1"
  ).bind(await cifrarClave(temporal), email).run();
  if (!res.meta.changes) return error("Ese usuario no existe.", 404);
  await env.DB.prepare("DELETE FROM sesiones WHERE email = ?").bind(email).run();
  await anotar(env, data.usuario, "contraseña restablecida", email);
  return json({ ok: true, email, temporal });
}

export async function onRequestDelete({ env, params, data }) {
  const { err, email } = revisar(params, data);
  if (err) return err;
  const res = await env.DB.prepare("UPDATE usuarios SET activo = 0, clave = NULL WHERE email = ?").bind(email).run();
  if (!res.meta.changes) return error("Ese usuario no existe.", 404);
  await env.DB.prepare("DELETE FROM sesiones WHERE email = ?").bind(email).run();
  await anotar(env, data.usuario, "usuario dado de baja", email);
  return json({ ok: true });
}
