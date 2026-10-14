// /noticias  y  /noticias?id=N → con el contenido ya escrito y vista previa para WhatsApp/Facebook
import { esc, etiquetas, jsonLd, organizacion, textoPlano, reescribirCabeza, URL_SITIO, IMAGEN } from "../lib/seo.js";
import { limpiarHTML } from "../lib/limpiar.js";
import { COLUMNAS, DESDE, textoDe } from "../lib/noticias.js";

export async function onRequestGet({ request, env }) {
  const pagina = await env.ASSETS.fetch(request);
  if (!pagina.ok || !env.DB) return pagina;
  const q = new URL(request.url).searchParams;
  let resp;
  try {
    resp = q.get("id") ? await detalle(pagina, env, q.get("id")) : await lista(pagina, env);
  } catch (_) { return pagina; }
  if (!resp) return pagina;
  const h = new Headers(resp.headers);
  h.set("cache-control", "public, max-age=120");
  return new Response(resp.body, { status: 200, headers: h });
}

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
function cuando(n) {
  const [a, m, d] = String(n.fecha || "").split("-").map(Number);
  if (!a) return "";
  let t = `${d} de ${MESES[m - 1]} de ${a}`;
  if (n.hora) {
    const [h, min] = n.hora.split(":").map(Number);
    t += ` · ${((h + 11) % 12) + 1}:${String(min).padStart(2, "0")} ${h < 12 ? "a. m." : "p. m."}`;
  }
  return t;
}

async function detalle(pagina, env, id) {
  if (!/^\d{1,9}$/.test(id)) return null;
  const n = await env.DB.prepare(
    `SELECT ${COLUMNAS}, n.contenido, n.actualizado FROM ${DESDE} WHERE n.id = ? AND n.publicado = 1`
  ).bind(Number(id)).first();
  if (!n) return null;
  const imagen = n.imagen ? (n.imagen.startsWith("/") ? URL_SITIO + n.imagen : n.imagen) : IMAGEN;
  const descripcion = n.resumen || textoPlano(n.contenido, 160) || n.titulo;
  const ld = jsonLd({
    "@context": "https://schema.org",
    "@type": "NewsArticle", headline: n.titulo, description: descripcion, image: [imagen],
    datePublished: n.hora ? `${n.fecha}T${n.hora}:00-07:00` : n.fecha,
    dateModified: String(n.actualizado || "").replace(" ", "T") || n.fecha,
    inLanguage: "es-MX", mainEntityOfPage: `${URL_SITIO}/noticias?id=${n.id}`,
    author: { "@type": "Organization", name: `${textoDe(n)} · Alcohólicos Anónimos` }, publisher: organizacion(),
  });
  const cuerpo = `<a class="volver-pub" href="/noticias">← Noticias</a>
<article class="hoja nota"><p class="nota-fecha">${esc(cuando(n))}</p><h1>${esc(n.titulo)}</h1>
<p class="nota-de">Publicado por ${n.autor_nombre ? `<strong>${esc(n.autor_nombre)}</strong> · ` : ""}${esc(textoDe(n))}</p>
${n.imagen ? `<img class="nota-img" src="${esc(n.imagen)}" alt="">` : ""}<div class="contenido">${limpiarHTML(n.contenido)}</div></article>`;
  return new HTMLRewriter()
    .on("#noticias", { element(e) { e.setInnerContent(cuerpo, { html: true }); } })
    .transform(reescribirCabeza(pagina, {
      titulo: `${n.titulo} · AA Mexicali`, descripcion,
      extra: etiquetas({ titulo: n.titulo, descripcion, ruta: `/noticias?id=${n.id}`, imagen, tipo: "article" }) + ld,
    }));
}

async function lista(pagina, env) {
  const { results } = await env.DB.prepare(
    `SELECT ${COLUMNAS} FROM ${DESDE} WHERE n.publicado = 1 ORDER BY n.fecha DESC, n.hora DESC, n.id DESC LIMIT 50`
  ).all();
  const titulo = "Noticias · Alcohólicos Anónimos Mexicali";
  const descripcion = "Noticias y eventos del Área, los distritos y los grupos de Alcohólicos Anónimos en Mexicali, San Luis Río Colorado y San Felipe.";
  const html = `<h1>Noticias</h1>${results.length
    ? `<ul>${results.map((n) => `<li><a href="/noticias?id=${n.id}">${esc(n.titulo)}</a> (${esc(textoDe(n))}, ${esc(cuando(n))})${n.resumen ? ` — ${esc(n.resumen)}` : ""}</li>`).join("")}</ul>`
    : `<p class="vacio">Todavía no hay noticias.</p>`}`;
  return new HTMLRewriter()
    .on("#noticias", { element(e) { e.setInnerContent(html, { html: true }); } })
    .transform(reescribirCabeza(pagina, { titulo, descripcion, extra: etiquetas({ titulo, descripcion, ruta: "/noticias" }) + jsonLd({ "@context": "https://schema.org", ...organizacion() }) }));
}
