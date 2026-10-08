// /noticias?c=...  y  /noticias?id=N → con el contenido ya escrito y vista previa para WhatsApp/Facebook
import { esc, etiquetas, jsonLd, organizacion, textoPlano, reescribirCabeza, URL_SITIO, IMAGEN } from "../lib/seo.js";
import { limpiarHTML } from "../lib/limpiar.js";
import { CATEGORIAS } from "../lib/noticias.js";

export async function onRequestGet({ request, env }) {
  const pagina = await env.ASSETS.fetch(request);
  if (!pagina.ok || !env.DB) return pagina;
  const q = new URL(request.url).searchParams;
  let resp;
  try {
    resp = q.get("id") ? await detalle(pagina, env, q.get("id")) : await lista(pagina, env, q.get("c"));
  } catch (_) { return pagina; }
  if (!resp) return pagina;
  const h = new Headers(resp.headers);
  h.set("cache-control", "public, max-age=120");
  return new Response(resp.body, { status: 200, headers: h });
}

async function detalle(pagina, env, id) {
  if (!/^\d{1,9}$/.test(id)) return null;
  const n = await env.DB.prepare(
    "SELECT id, categoria, titulo, fecha, resumen, contenido, imagen, actualizado FROM noticias WHERE id = ? AND publicado = 1"
  ).bind(Number(id)).first();
  if (!n) return null;
  const imagen = n.imagen ? (n.imagen.startsWith("/") ? URL_SITIO + n.imagen : n.imagen) : IMAGEN;
  const descripcion = n.resumen || textoPlano(n.contenido, 160) || n.titulo;
  const ld = jsonLd({
    "@context": "https://schema.org",
    "@type": "NewsArticle", headline: n.titulo, description: descripcion, image: [imagen],
    datePublished: n.fecha, dateModified: String(n.actualizado || "").replace(" ", "T") || n.fecha,
    inLanguage: "es-MX", mainEntityOfPage: `${URL_SITIO}/noticias?id=${n.id}`,
    author: { "@id": `${URL_SITIO}/#organizacion` }, publisher: organizacion(),
  });
  const cuerpo = `<a class="volver-pub" href="/noticias?c=${esc(n.categoria)}">← ${esc(CATEGORIAS[n.categoria] || "Noticias")}</a>
<article class="hoja nota"><p class="nota-fecha">${esc(n.fecha)}</p><h1>${esc(n.titulo)}</h1>
${n.imagen ? `<img class="nota-img" src="${esc(n.imagen)}" alt="">` : ""}<div class="contenido">${limpiarHTML(n.contenido)}</div></article>`;
  return new HTMLRewriter()
    .on("#noticias", { element(e) { e.setInnerContent(cuerpo, { html: true }); } })
    .transform(reescribirCabeza(pagina, {
      titulo: `${n.titulo} · AA Mexicali`, descripcion,
      extra: etiquetas({ titulo: n.titulo, descripcion, ruta: `/noticias?id=${n.id}`, imagen, tipo: "article" }) + ld,
    }));
}

async function lista(pagina, env, c) {
  const cat = CATEGORIAS[c] ? c : "noticia";
  const { results } = await env.DB.prepare(
    "SELECT id, titulo, fecha, resumen FROM noticias WHERE publicado = 1 AND categoria = ? ORDER BY fecha DESC, id DESC LIMIT 50"
  ).bind(cat).all();
  const titulo = `${CATEGORIAS[cat]} · Alcohólicos Anónimos Mexicali`;
  const descripcion = `${CATEGORIAS[cat]} y eventos de Alcohólicos Anónimos en Mexicali, San Luis Río Colorado y San Felipe.`;
  const html = `<h1>${esc(CATEGORIAS[cat])}</h1>${results.length
    ? `<ul>${results.map((n) => `<li><a href="/noticias?id=${n.id}">${esc(n.titulo)}</a> (${esc(n.fecha)})${n.resumen ? ` — ${esc(n.resumen)}` : ""}</li>`).join("")}</ul>`
    : `<p class="vacio">Todavía no hay publicaciones en esta sección.</p>`}`;
  return new HTMLRewriter()
    .on("#noticias", { element(e) { e.setInnerContent(html, { html: true }); } })
    .transform(reescribirCabeza(pagina, { titulo, descripcion, extra: etiquetas({ titulo, descripcion, ruta: `/noticias?c=${cat}` }) + jsonLd({ "@context": "https://schema.org", ...organizacion() }) }));
}
