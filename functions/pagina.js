// /pagina?p=slug → la página institucional con su texto ya escrito (Google, IA, WhatsApp la leen completa)
import { esc, etiquetas, jsonLd, organizacion, textoPlano, reescribirCabeza, URL_SITIO } from "../lib/seo.js";
import { limpiarHTML } from "../lib/limpiar.js";

export async function onRequestGet({ request, env }) {
  const pagina = await env.ASSETS.fetch(request);
  const slug = new URL(request.url).searchParams.get("p") || "";
  if (!pagina.ok || !env.DB || !/^[a-z0-9-]{1,60}$/.test(slug)) return pagina;
  let p = null;
  try {
    p = await env.DB.prepare("SELECT slug, titulo, contenido, actualizado FROM paginas WHERE slug = ?").bind(slug).first();
  } catch (_) { /* tabla no existe */ }
  if (!p) return pagina;

  const titulo = `${p.titulo} · Alcohólicos Anónimos Mexicali`;
  const descripcion = textoPlano(p.contenido, 160) || p.titulo;
  const ld = jsonLd({
    "@context": "https://schema.org",
    "@graph": [organizacion(), {
      "@type": "WebPage", name: p.titulo, url: `${URL_SITIO}/pagina?p=${p.slug}`, inLanguage: "es-MX",
      dateModified: String(p.actualizado || "").replace(" ", "T") || undefined, isPartOf: { "@id": `${URL_SITIO}/#sitio` },
    }],
  });
  const conCabeza = reescribirCabeza(pagina, { titulo, descripcion, extra: etiquetas({ titulo, descripcion, ruta: `/pagina?p=${p.slug}` }) + ld });
  const final = new HTMLRewriter()
    .on("#titulo", { element(e) { e.setInnerContent(esc(p.titulo), { html: true }); } })
    .on("#cuerpo", { element(e) { e.setInnerContent(limpiarHTML(p.contenido), { html: true }); } })
    .transform(conCabeza);
  const h = new Headers(final.headers);
  h.set("cache-control", "public, max-age=120");
  return new Response(final.body, { status: 200, headers: h });
}
