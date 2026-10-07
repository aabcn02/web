// GET /api/grupos  →  lista pública de grupos activos (JSON).
// Necesita el enlace (binding) de D1 llamado "DB" en Cloudflare Pages.

export async function onRequestGet({ env }) {
  if (!env.DB) {
    return json({ error: "Falta conectar la base de datos (binding DB)." }, 500);
  }
  try {
    const { results } = await env.DB.prepare(
      `SELECT id, distrito, grupo, ciudad, direccion, terapia, personas, horario, lat, lng, maps_url
         FROM grupos
        WHERE activo = 1
        ORDER BY CAST(distrito AS INTEGER), distrito, grupo COLLATE NOCASE`
    ).all();
    return json(results, 200, { "cache-control": "public, max-age=60" });
  } catch (err) {
    return json({ error: "No se pudo leer la base de datos." }, 500);
  }
}

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...extra },
  });
}
