// GET  /api/admin/noticias  → todas (también borradores)
// POST /api/admin/noticias  → nueva
import { json, error, leerJSON } from "../../../../lib/http.js";
import { datosNoticia } from "../../../../lib/noticias.js";
import { anotar } from "../../../../lib/bitacora.js";

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    `SELECT n.id, n.titulo, n.fecha, n.hora, n.resumen, n.contenido, n.imagen, n.publicado, n.autor, n.actualizado,
            n.de_tipo, n.de_distrito, n.de_grupo_id, n.de_nombre, u.nombre AS autor_nombre
       FROM noticias n LEFT JOIN usuarios u ON u.email = n.autor
      ORDER BY n.fecha DESC, n.hora DESC, n.id DESC LIMIT 500`
  ).all();
  return json(results);
}

export async function onRequestPost({ request, env, data }) {
  const r = await datosNoticia(env, await leerJSON(request), data.usuario.email);
  if (r.error) return error(r.error);
  const n = r.datos;
  const res = await env.DB.prepare(
    `INSERT INTO noticias (categoria, titulo, fecha, hora, resumen, contenido, imagen, publicado, autor,
                           de_tipo, de_distrito, de_grupo_id, de_nombre)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(n.categoria, n.titulo, n.fecha, n.hora, n.resumen, n.contenido, n.imagen, n.publicado, n.autor,
         n.de_tipo, n.de_distrito, n.de_grupo_id, n.de_nombre).run();
  const id = res.meta.last_row_id;
  await anotar(env, data.usuario, "noticia creada", `#${id} ${n.titulo}`);
  return json({ ok: true, id }, 201);
}
