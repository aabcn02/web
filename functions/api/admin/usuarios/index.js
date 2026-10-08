// GET  /api/admin/usuarios → lista;  POST → dar de alta { email, nombre, rol }   (solo administrador)
import { json, error, leerJSON, campo } from "../../../../lib/http.js";
import { anotar } from "../../../../lib/bitacora.js";

export async function onRequestGet({ env, data }) {
  if (data.usuario.rol !== "admin") return error("Solo el administrador.", 403);
  const { results } = await env.DB.prepare(
    "SELECT email, nombre, rol, creado FROM usuarios WHERE activo = 1 ORDER BY rol, email"
  ).all();
  return json(results);
}

export async function onRequestPost({ request, env, data }) {
  if (data.usuario.rol !== "admin") return error("Solo el administrador.", 403);
  const e = await leerJSON(request);
  const email = String(e?.email || "").trim().toLowerCase();
  const rol = e?.rol === "admin" ? "admin" : "editor";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120) return error("Escribe un correo válido.");
  await env.DB.prepare(
    `INSERT INTO usuarios (email, nombre, rol, activo) VALUES (?, ?, ?, 1)
     ON CONFLICT(email) DO UPDATE SET nombre = excluded.nombre, rol = excluded.rol, activo = 1`
  ).bind(email, campo(e.nombre, 80), rol).run();
  await anotar(env, data.usuario, "usuario dado de alta", `${email} (${rol})`);
  return json({ ok: true }, 201);
}
