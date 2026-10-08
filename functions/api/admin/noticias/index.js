// GET  /api/admin/noticias  → todas (también borradores)
// POST /api/admin/noticias  → nueva
import { json, error, leerJSON } from "../../../../lib/http.js";
import { datosNoticia } from "../../../../lib/noticias.js";
import { anotar } from "../../../../lib/bitacora.js";

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    `SELECT id, categoria, titulo, fecha, resumen, contenido, imagen, publicado, autor, actualizado
       FROM noticias ORDER BY fecha DESC, id DESC LIMIT 500`
  ).all();
  return json(results);
}

export async function onRequestPost({ request, env, data }) {
  const r = datosNoticia(await leerJSON(request), data.usuario.email);
  if (r.error) return error(r.error);
  const n = r.datos;
  const res = await env.DB.prepare(
    `INSERT INTO noticias (categoria, titulo, fecha, resumen, contenido, imagen, publicado, autor)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(n.categoria, n.titulo, n.fecha, n.resumen, n.contenido, n.imagen, n.publicado, n.autor).run();
  const id = res.meta.last_row_id;
  await anotar(env, data.usuario, "noticia creada", `#${id} ${n.titulo}`);
  return json({ ok: true, id }, 201);
}
