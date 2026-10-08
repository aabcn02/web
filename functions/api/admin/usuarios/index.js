// GET  /api/admin/usuarios → lista
// POST /api/admin/usuarios { email, nombre, rol } → dar de alta; devuelve una contraseña temporal
// (solo administrador)
import { json, error, leerJSON, campo } from "../../../../lib/http.js";
import { cifrarClave, claveTemporal } from "../../../../lib/auth.js";
import { anotar } from "../../../../lib/bitacora.js";

export async function onRequestGet({ env, data }) {
  if (data.usuario.rol !== "admin") return error("Solo el administrador.", 403);
  const { results } = await env.DB.prepare(
    "SELECT email, nombre, rol, cambiar_clave, creado FROM usuarios WHERE activo = 1 ORDER BY rol, email"
  ).all();
  return json(results);
}

export async function onRequestPost({ request, env, data }) {
  if (data.usuario.rol !== "admin") return error("Solo el administrador.", 403);
  const e = await leerJSON(request);
  const email = String(e?.email || "").trim().toLowerCase();
  const rol = e?.rol === "admin" ? "admin" : "editor";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120) return error("Escribe un correo válido.");

  const temporal = claveTemporal();
  await env.DB.prepare(
    `INSERT INTO usuarios (email, nombre, rol, activo, clave, cambiar_clave, intentos) VALUES (?, ?, ?, 1, ?, 1, 0)
     ON CONFLICT(email) DO UPDATE SET nombre = excluded.nombre, rol = excluded.rol, activo = 1,
       clave = excluded.clave, cambiar_clave = 1, intentos = 0, bloqueado_hasta = NULL`
  ).bind(email, campo(e.nombre, 80), rol, await cifrarClave(temporal)).run();
  await env.DB.prepare("DELETE FROM sesiones WHERE email = ?").bind(email).run();
  await anotar(env, data.usuario, "usuario dado de alta", `${email} (${rol})`);
  return json({ ok: true, email, temporal }, 201);
}
