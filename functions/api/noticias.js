// GET /api/noticias            → todas las publicadas (el filtro por Área / distrito / grupo se hace en el navegador)
// GET /api/noticias?id=12      → una noticia completa
// GET /api/noticias?ultimas=3  → las más recientes
import { json, error } from "../../lib/http.js";
import { COLUMNAS, DESDE } from "../../lib/noticias.js";

export async function onRequestGet({ env, request }) {
  if (!env.DB) return error("Falta conectar la base de datos (binding DB).", 500);
  const q = new URL(request.url).searchParams;
  const cache = { "cache-control": "public, max-age=60" };
  try {
    if (q.has("id")) {
      if (!/^\d{1,9}$/.test(q.get("id"))) return error("No válida.");
      const n = await env.DB.prepare(
        `SELECT ${COLUMNAS}, n.contenido FROM ${DESDE} WHERE n.id = ? AND n.publicado = 1`
      ).bind(Number(q.get("id"))).first();
      return n ? json(n, 200, cache) : error("No existe.", 404);
    }
    const ultimas = Math.min(Math.max(parseInt(q.get("ultimas")) || 0, 0), 12);
    const { results } = await env.DB.prepare(
      `SELECT ${COLUMNAS} FROM ${DESDE} WHERE n.publicado = 1 ORDER BY n.fecha DESC, n.hora DESC, n.id DESC LIMIT ?`
    ).bind(ultimas || 300).all();
    return json(results, 200, cache);
  } catch (_) {
    return json([], 200);   // la tabla todavía no existe
  }
}
