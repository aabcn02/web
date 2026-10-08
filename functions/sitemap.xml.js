// /sitemap.xml → mapa del sitio para Google (se arma solo con las páginas y noticias actuales)
import { URL_SITIO } from "../lib/seo.js";

const FIJAS = ["/", "/directorio", "/mapa", "/literatura", "/reflexion", "/noticias?c=noticia", "/noticias?c=publicacion"];

export async function onRequestGet({ env }) {
  const urls = FIJAS.map((r) => ({ loc: URL_SITIO + r, prioridad: r === "/" || r === "/directorio" ? "1.0" : "0.8" }));
  if (env.DB) {
    try {
      const { results: pags } = await env.DB.prepare("SELECT slug, actualizado FROM paginas").all();
      pags.forEach((p) => urls.push({ loc: `${URL_SITIO}/pagina?p=${p.slug}`, mod: String(p.actualizado || "").slice(0, 10), prioridad: "0.6" }));
    } catch (_) { /* */ }
    try {
      const { results: nots } = await env.DB.prepare("SELECT id, actualizado FROM noticias WHERE publicado = 1 ORDER BY fecha DESC LIMIT 500").all();
      nots.forEach((n) => urls.push({ loc: `${URL_SITIO}/noticias?id=${n.id}`, mod: String(n.actualizado || "").slice(0, 10), prioridad: "0.5" }));
    } catch (_) { /* */ }
  }
  const x = (s) => s.replace(/&/g, "&amp;");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${x(u.loc)}</loc>${u.mod ? `<lastmod>${u.mod}</lastmod>` : ""}<priority>${u.prioridad}</priority></url>`).join("\n")}
</urlset>`;
  return new Response(xml, { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
