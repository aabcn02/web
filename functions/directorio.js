// /directorio → la página de siempre, pero con los grupos ya escritos en el HTML
// (para Google, las IA y quien no tenga JavaScript). El JavaScript del navegador los vuelve a pintar con filtros.
import { URL_SITIO, NOMBRE, esc, etiquetas, jsonLd, organizacion, grupoLD, tarjetaGrupo, reescribirCabeza } from "../lib/seo.js";
import { gruposActivos } from "../lib/consultas.js";

export async function onRequestGet({ request, env }) {
  const pagina = await env.ASSETS.fetch(request);
  if (!pagina.ok || !env.DB) return pagina;
  let grupos = [];
  try { grupos = await gruposActivos(env); } catch (_) { return pagina; }

  const id = new URL(request.url).searchParams.get("id");
  const uno = id && grupos.find((g) => String(g.id) === id);
  const titulo = uno
    ? `Grupo ${uno.grupo} · AA ${uno.ciudad}`
    : "Directorio de grupos de Alcohólicos Anónimos en Mexicali, San Luis R.C. y San Felipe";
  const descripcion = uno
    ? `Grupo ${uno.grupo} de Alcohólicos Anónimos, distrito ${uno.distrito}, ${uno.ciudad}. ${uno.horario || ""}`.trim()
    : `${grupos.length} grupos de Alcohólicos Anónimos en Mexicali, Valle de Mexicali, San Luis Río Colorado y San Felipe: direcciones, horarios y cómo llegar.`;
  const lista = uno ? [uno] : grupos;

  const ld = jsonLd({
    "@context": "https://schema.org",
    "@graph": [
      organizacion(),
      { "@type": "ItemList", name: `Grupos de ${NOMBRE}`, numberOfItems: lista.length,
        itemListElement: lista.map((g, i) => ({ "@type": "ListItem", position: i + 1, item: grupoLD(g) })) },
    ],
  });
  const conCabeza = reescribirCabeza(pagina, {
    titulo, descripcion,
    extra: etiquetas({ titulo, descripcion, ruta: uno ? `/directorio?id=${uno.id}` : "/directorio" }) + ld,
  });
  const final = new HTMLRewriter()
    .on("#lista", { element(e) { e.setInnerContent(lista.map(tarjetaGrupo).join(""), { html: true }); } })
    .on("#total", { element(e) { e.setInnerContent(`Total de grupos: <strong>${lista.length}</strong>`, { html: true }); } })
    .transform(conCabeza);
  const h = new Headers(final.headers);
  h.set("cache-control", "public, max-age=300");
  return new Response(final.body, { status: 200, headers: h });
}
