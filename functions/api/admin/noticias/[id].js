// PUT    /api/admin/noticias/:id → guardar cambios
// DELETE /api/admin/noticias/:id → borrar (también borra su foto de portada)
import { json, error, leerJSON } from "../../../../lib/http.js";
import { datosNoticia, ahoraMexicali } from "../../../../lib/noticias.js";
import { anotar } from "../../../../lib/bitacora.js";

const idValido = (p) => (/^\d{1,9}$/.test(String(p.id)) ? Number(p.id) : null);

export async function onRequestPut({ request, env, params, data }) {
  const id = idValido(params);
  if (!id) return error("Noticia no válida.");
  const r = await datosNoticia(env, await leerJSON(request), data.usuario.email);
  if (r.error) return error(r.error);
  const antes = await env.DB.prepare("SELECT publicado, fecha, hora FROM noticias WHERE id = ?").bind(id).first();
  if (!antes) return error("Esa noticia ya no existe.", 404);
  // La fecha y hora no se editan: se quedan las de cuando se publicó.
  // Si era borrador y ahora se publica, toma la fecha y hora de este momento.
  const cuando = !antes.publicado && r.datos.publicado ? ahoraMexicali() : { fecha: antes.fecha, hora: antes.hora };
  const n = { ...r.datos, ...cuando };
  const res = await env.DB.prepare(
    `UPDATE noticias SET categoria = ?, titulo = ?, fecha = ?, hora = ?, resumen = ?, contenido = ?, imagen = ?, publicado = ?,
            autor = COALESCE(autor, ?), de_tipo = ?, de_distrito = ?, de_grupo_id = ?, de_nombre = ?, actualizado = datetime('now') WHERE id = ?`
  ).bind(n.categoria, n.titulo, n.fecha, n.hora, n.resumen, n.contenido, n.imagen, n.publicado, n.autor,
         n.de_tipo, n.de_distrito, n.de_grupo_id, n.de_nombre, id).run();
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
