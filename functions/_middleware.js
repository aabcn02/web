// 1) Encabezados de seguridad para todo lo que entregan las funciones (directorio, mapa, páginas, noticias,
//    API, fotos). El archivo public/_headers aplica a los archivos fijos; esto cubre lo demás.
// 2) Caché en Cloudflare para lo público: si 1,000 personas abren el directorio en el mismo minuto,
//    la base de datos se consulta una sola vez. Así no se gastan lecturas de D1 ni de R2 de más.
//    (Los archivos fijos como CSS/JS ni siquiera pasan por aquí: ver public/_routes.json)
const SEGURIDAD = {
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
  "strict-transport-security": "max-age=31536000; includeSubDomains",
  "content-security-policy":
    "default-src 'self'; script-src 'self' https://cdnjs.cloudflare.com https://challenges.cloudflare.com; " +
    "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "img-src 'self' data: blob: https://tile.openstreetmap.org https://cdnjs.cloudflare.com https://images.squarespace-cdn.com https://aamexico.org; " +
    "connect-src 'self'; frame-src https://www.youtube-nocookie.com https://challenges.cloudflare.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
};

// Qué se guarda en caché y cuántos segundos (lo del panel y el login NUNCA)
function segundosDeCache(ruta) {
  if (ruta.startsWith("/fotos/")) return 86400;          // fotos y PDFs: no cambian
  if (ruta.startsWith("/api/admin") || ruta.startsWith("/api/acceso") || ruta.startsWith("/admin")) return 0;
  if (ruta === "/api/reflexion") return 0;               // ya tiene su propia caché
  return 60;                                             // directorio, mapa, noticias, páginas, API pública
}

export async function onRequest(ctx) {
  const { request } = ctx;
  const ruta = new URL(request.url).pathname;
  const ttl = request.method === "GET" ? segundosDeCache(ruta) : 0;
  const cache = caches.default;
  const llave = new Request(new URL(request.url).toString(), { method: "GET" });

  let resp = null;
  if (ttl) {
    try { resp = await cache.match(llave); } catch (_) { resp = null; }
  }
  if (!resp) {
    resp = await ctx.next();
    if (ttl && resp.status === 200 && !resp.headers.has("set-cookie")) {
      const copia = new Response(resp.clone().body, resp);
      copia.headers.set("cache-control", `public, max-age=${ttl}`);
      ctx.waitUntil(cache.put(llave, copia).catch(() => {}));
    }
  }

  // 304 y similares no traen cuerpo: se dejan igual
  if (resp.status === 101 || resp.status === 304) return resp;
  const h = new Headers(resp.headers);
  for (const [k, v] of Object.entries(SEGURIDAD)) h.set(k, v);
  if (ruta.startsWith("/admin")) {
    h.set("cache-control", "no-store");
    h.set("x-robots-tag", "noindex, nofollow");
  }
  return new Response(resp.body, { status: resp.status, statusText: resp.statusText, headers: h });
}
