// GET /api/pagina?p=slug  →  { slug, titulo, contenido }  (páginas institucionales)
export async function onRequestGet({ env, request }) {
  const slug = new URL(request.url).searchParams.get("p") || "";
  if (!/^[a-z0-9-]{1,60}$/.test(slug)) return json({ error: "Página no válida." }, 400);
  if (!env.DB) return json({ error: "Falta conectar la base de datos (binding DB)." }, 500);
  try {
    const fila = await env.DB.prepare(
      "SELECT slug, titulo, contenido, actualizado FROM paginas WHERE slug = ?"
    ).bind(slug).first();
    if (!fila) return json({ error: "No existe." }, 404);
    return json(fila, 200, { "cache-control": "public, max-age=60" });
  } catch (err) {
    // La tabla todavía no existe: se trata como página sin contenido
    return json({ error: "No existe." }, 404);
  }
}

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...extra },
  });
}
