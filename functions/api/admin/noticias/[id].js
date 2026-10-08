// PUT    /api/admin/noticias/:id → guardar cambios
// DELETE /api/admin/noticias/:id → borrar (también borra su foto de portada)
import { json, error, leerJSON } from "../../../../lib/http.js";
import { datosNoticia } from "../../../../lib/noticias.js";
import { anotar } from "../../../../lib/bitacora.js";

const idValido = (p) => (/^\d{1,9}$/.test(String(p.id)) ? Number(p.id) : null);

export async function onRequestPut({ request, env, params, data }) {
  const id = idValido(params);
  if (!id) return error("Noticia no válida.");
  const r = datosNoticia(await leerJSON(request), data.usuario.email);
  if (r.error) return error(r.error);
  const n = r.datos;
  const res = await env.DB.prepare(
    `UPDATE noticias SET categoria = ?, titulo = ?, fecha = ?, resumen = ?, contenido = ?, imagen = ?, publicado = ?,
            autor = ?, actualizado = datetime('now') WHERE id = ?`
  ).bind(n.categoria, n.titulo, n.fecha, n.resumen, n.contenido, n.imagen, n.publicado, n.autor, id).run();
  if (!res.meta.changes) return error("Esa noticia ya no existe.", 404);
  await anotar(env, data.usuario, "noticia editada", `#${id} ${n.titulo}`);
  return json({ ok: true, id });
}

export async function onRequestDelete({ env, params, data }) {
  const id = idValido(params);
  if (!id) return error("Noticia no válida.");
  const n = await env.DB.prepare("SELECT titulo, imagen FROM noticias WHERE id = ?").bind(id).first();
  if (!n) return error("Esa noticia ya no existe.", 404);
  await env.DB.prepare("DELETE FROM noticias WHERE id = ?").bind(id).run();
  if (env.FOTOS && n.imagen && n.imagen.startsWith("/fotos/")) {
    try { await env.FOTOS.delete(n.imagen.slice("/fotos/".length)); } catch (_) { /* no importa */ }
  }
  await anotar(env, data.usuario, "noticia borrada", `#${id} ${n.titulo}`);
  return json({ ok: true });
}
