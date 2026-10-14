// Encabezados de seguridad para TODO lo que entregan las funciones (directorio, mapa, páginas, noticias,
// API, fotos). El archivo public/_headers solo aplica a los archivos fijos; esto cubre lo demás.
const SEGURIDAD = {
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
  "strict-transport-security": "max-age=31536000; includeSubDomains",
  "content-security-policy":
    "default-src 'self'; script-src 'self' https://cdnjs.cloudflare.com; " +
    "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "img-src 'self' data: blob: https://tile.openstreetmap.org https://cdnjs.cloudflare.com https://images.squarespace-cdn.com https://aamexico.org; " +
    "connect-src 'self'; frame-src https://www.youtube-nocookie.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
};

export async function onRequest(ctx) {
  const resp = await ctx.next();
  // 304 y similares no traen cuerpo: se dejan igual
  if (resp.status === 101 || resp.status === 304) return resp;
  const h = new Headers(resp.headers);
  for (const [k, v] of Object.entries(SEGURIDAD)) h.set(k, v);
  if (new URL(ctx.request.url).pathname.startsWith("/admin")) {
    h.set("cache-control", "no-store");
    h.set("x-robots-tag", "noindex, nofollow");
  }
  return new Response(resp.body, { status: resp.status, statusText: resp.statusText, headers: h });
}
