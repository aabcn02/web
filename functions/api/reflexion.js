// GET /api/reflexion            → la reflexión de hoy { video, titulo, descripcion, fecha, motivo }
// GET /api/reflexion?verificar=1 → revisión del calendario: qué fechas faltan o están repetidas
//
// Necesita en Cloudflare Pages el secreto YOUTUBE_KEY (clave de la API de YouTube Data v3).
// Opcional: YOUTUBE_LISTA para usar otra lista de reproducción.
// El resultado del día se guarda 1 hora en la caché de Cloudflare: YouTube se consulta pocas veces.
import { json, error } from "../../lib/http.js";
import { LISTA_PREDETERMINADA, ZONA, NOMBRES_MES, hoy, clave, indexar, elegir, limpiarDescripcion, videosDeLista } from "../../lib/reflexion.js";

export async function onRequestGet({ env, request, waitUntil }) {
  if (!env.YOUTUBE_KEY) return error("Falta configurar la clave de YouTube (YOUTUBE_KEY).", 503);
  const lista = env.YOUTUBE_LISTA || LISTA_PREDETERMINADA;
  const verificar = new URL(request.url).searchParams.get("verificar") === "1";
  const f = hoy(ZONA);

  const cache = caches.default;
  const llaveCache = new Request(`https://cache.aabcn02.org/reflexion/${lista}/${clave(f.m, f.d)}`);
  if (!verificar) {
    const guardada = await cache.match(llaveCache);
    if (guardada) return guardada;
  }

  let videos;
  try {
    videos = await videosDeLista(lista, env.YOUTUBE_KEY);
  } catch (e) {
    return error(`No se pudo leer la lista de YouTube. ${e.message}`, 502);
  }
  const { indice, repetidos, sinFecha } = indexar(videos);

  if (verificar) {
    const faltan = [];
    const DIAS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    DIAS.forEach((n, i) => { for (let d = 1; d <= n; d++) if (!indice.has(clave(i + 1, d))) faltan.push(`${d} de ${NOMBRES_MES[i]}`); });
    return json({
      videos: videos.length,
      fechas_cubiertas: indice.size,
      faltan,
      repetidas: [...repetidos.entries()].map(([k, t]) => ({ fecha: k, descartados: t })),
      sin_fecha_en_titulo: sinFecha,
    });
  }

  const sel = elegir(indice, f);
  if (!sel) return error("No hay videos con fecha en la lista.", 404);
  const v = sel.video;
  const resp = json({
    video: v.id,
    titulo: v.titulo,
    descripcion: limpiarDescripcion(v.descripcion, v.titulo),
    fecha: `${f.d} de ${NOMBRES_MES[f.m - 1]}`,
    motivo: sel.motivo,
  }, 200, { "cache-control": "public, max-age=3600" });
  waitUntil(cache.put(llaveCache, resp.clone()));
  return resp;
}
