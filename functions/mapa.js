// /mapa → agrega descripción, etiquetas para compartir y los datos de los grupos para buscadores e IA
import { NOMBRE, etiquetas, jsonLd, organizacion, grupoLD, reescribirCabeza } from "../lib/seo.js";
import { gruposActivos } from "../lib/consultas.js";

export async function onRequestGet({ request, env }) {
  const pagina = await env.ASSETS.fetch(request);
  if (!pagina.ok || !env.DB) return pagina;
  let grupos = [];
  try { grupos = await gruposActivos(env); } catch (_) { return pagina; }
  const titulo = "Mapa de grupos de Alcohólicos Anónimos en Mexicali y su zona";
  const descripcion = `Encuentra en el mapa el grupo de AA más cercano: ${grupos.length} grupos en Mexicali, Valle de Mexicali, San Luis Río Colorado y San Felipe.`;
  const conGeo = grupos.filter((g) => typeof g.lat === "number");
  const ld = jsonLd({
    "@context": "https://schema.org",
    "@graph": [organizacion(), { "@type": "ItemList", name: `Mapa de grupos de ${NOMBRE}`, numberOfItems: conGeo.length,
      itemListElement: conGeo.map((g, i) => ({ "@type": "ListItem", position: i + 1, item: grupoLD(g) })) }],
  });
  const resp = reescribirCabeza(pagina, { titulo, descripcion, extra: etiquetas({ titulo, descripcion, ruta: "/mapa" }) + ld });
  const h = new Headers(resp.headers);
  h.set("cache-control", "public, max-age=300");
  return new Response(resp.body, { status: 200, headers: h });
}
