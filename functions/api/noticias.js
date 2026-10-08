// GET /api/noticias?c=noticia|publicacion|reflexion  → lista pública (solo publicadas)
// GET /api/noticias?id=12                           → una noticia completa
// GET /api/noticias?ultimas=3                       → las más recientes de todas las categorías
import { json, error } from "../../lib/http.js";
import { CATEGORIAS } from "../../lib/noticias.js";

export async function onRequestGet({ env, request }) {
  if (!env.DB) return error("Falta conectar la base de datos (binding DB).", 500);
  const q = new URL(request.url).searchParams;
  const cache = { "cache-control": "public, max-age=60" };
  try {
    if (q.has("id")) {
      if (!/^\d{1,9}$/.test(q.get("id"))) return error("No válida.");
      const n = await env.DB.prepare(
        "SELECT id, categoria, titulo, fecha, resumen, contenido, imagen FROM noticias WHERE id = ? AND publicado = 1"
      ).bind(Number(q.get("id"))).first();
      return n ? json(n, 200, cache) : error("No existe.", 404);
    }
    const ultimas = Math.min(Math.max(parseInt(q.get("ultimas")) || 0, 0), 12);
    const c = q.get("c");
    if (!ultimas && !CATEGORIAS[c]) return error("Categoría no válida.");
    const { results } = ultimas
      ? await env.DB.prepare(
          "SELECT id, categoria, titulo, fecha, resumen, imagen FROM noticias WHERE publicado = 1 ORDER BY fecha DESC, id DESC LIMIT ?"
        ).bind(ultimas).all()
      : await env.DB.prepare(
          "SELECT id, categoria, titulo, fecha, resumen, imagen FROM noticias WHERE publicado = 1 AND categoria = ? ORDER BY fecha DESC, id DESC LIMIT 200"
        ).bind(c).all();
    return json(results, 200, cache);
  } catch (_) {
    return json([], 200);   // la tabla todavía no existe
  }
}
