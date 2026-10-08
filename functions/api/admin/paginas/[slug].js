// GET /api/admin/paginas/:slug → una página;  PUT → guardar (solo administrador)
import { json, error, leerJSON, campo } from "../../../../lib/http.js";
import { limpiarHTML } from "../../../../lib/limpiar.js";
import { anotar } from "../../../../lib/bitacora.js";

const slugValido = (s) => (/^[a-z0-9-]{1,60}$/.test(String(s)) ? String(s) : null);

export async function onRequestGet({ env, params, data }) {
  if (data.usuario.rol !== "admin") return error("Solo el administrador puede editar páginas.", 403);
  const slug = slugValido(params.slug);
  if (!slug) return error("Página no válida.");
  const p = await env.DB.prepare("SELECT slug, titulo, contenido, actualizado FROM paginas WHERE slug = ?").bind(slug).first();
  return p ? json(p) : error("No existe.", 404);
}

export async function onRequestPut({ request, env, params, data }) {
  if (data.usuario.rol !== "admin") return error("Solo el administrador puede editar páginas.", 403);
  const slug = slugValido(params.slug);
  const e = await leerJSON(request);
  if (!slug || !e) return error("Datos no válidos.");
  const titulo = campo(e.titulo, 150);
  if (!titulo) return error("Falta el título.");
  const contenido = limpiarHTML(e.contenido);
  await env.DB.prepare(
    `INSERT INTO paginas (slug, titulo, contenido, actualizado) VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(slug) DO UPDATE SET titulo = excluded.titulo, contenido = excluded.contenido, actualizado = excluded.actualizado`
  ).bind(slug, titulo, contenido).run();
  await anotar(env, data.usuario, "página editada", slug);
  return json({ ok: true });
}
