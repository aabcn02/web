// Ayudantes de SEO: etiquetas para Google / WhatsApp / Facebook, datos estructurados (schema.org)
// y el HTML de los grupos que se inserta desde el servidor (para buscadores e IA que no corren JavaScript).

export const URL_SITIO = "https://aabcn02.org";
export const NOMBRE = "Alcohólicos Anónimos Área 64 Región 02";
export const DESCRIPCION_SITIO =
  "Alcohólicos Anónimos en Mexicali, San Luis Río Colorado, San Felipe y Valle de Mexicali. Directorio y mapa de grupos, horarios y cómo llegar.";
export const TELEFONO = "+52 686 582 3360";
export const CORREO = "contacto@aabcn02.org";
export const IMAGEN = `${URL_SITIO}/assets/compartir.png`;

export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// <meta> para buscadores y para la vista previa al compartir
export function etiquetas({ titulo, descripcion, ruta, imagen = IMAGEN, tipo = "website" }) {
  const url = URL_SITIO + ruta;
  return `
<link rel="canonical" href="${esc(url)}">
<meta property="og:site_name" content="${esc(NOMBRE)}">
<meta property="og:locale" content="es_MX">
<meta property="og:type" content="${esc(tipo)}">
<meta property="og:title" content="${esc(titulo)}">
<meta property="og:description" content="${esc(descripcion)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${esc(imagen)}">
<meta name="twitter:card" content="summary_large_image">`;
}

// <script type="application/ld+json"> (no se ejecuta; solo lo leen buscadores e IA)
export function jsonLd(obj) {
  return `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, "\\u003c")}</script>`;
}

export const organizacion = () => ({
  "@type": "NGO",
  "@id": `${URL_SITIO}/#organizacion`,
  name: NOMBRE,
  alternateName: ["AA Mexicali", "Alcohólicos Anónimos Mexicali", "Área 64 BCN2"],
  url: URL_SITIO,
  email: CORREO,
  telephone: TELEFONO,
  description: DESCRIPCION_SITIO,
  areaServed: ["Mexicali", "Valle de Mexicali", "San Luis Río Colorado", "San Felipe"].map((n) => ({ "@type": "City", name: n })),
  parentOrganization: { "@type": "Organization", name: "Central Mexicana de Servicios Generales de Alcohólicos Anónimos, A.C.", url: "https://aamexico.org" },
});

export function domicilio(g) {
  return [g.direccion, g.colonia ? `Col. ${g.colonia}` : ""].filter(Boolean).join(", ");
}

// Un grupo como "lugar" de schema.org
export function grupoLD(g) {
  const lugar = {
    "@type": "Place",
    "@id": `${URL_SITIO}/directorio?id=${g.id}`,
    name: `Grupo ${g.grupo} de Alcohólicos Anónimos`,
    description: [g.horario && `Horario: ${g.horario}`, g.personas && `Personas: ${g.personas}`, g.idioma && `Idioma: ${g.idioma}`, g.referencia && `Referencia: ${g.referencia}`].filter(Boolean).map((t) => t.replace(/[.\s]+$/, "")).join(". "),
    url: `${URL_SITIO}/directorio?id=${g.id}`,
    address: {
      "@type": "PostalAddress",
      streetAddress: domicilio(g) || undefined,
      addressLocality: g.ciudad,
      addressRegion: g.ciudad === "San Luis Río Colorado" ? "Sonora" : "Baja California",
      addressCountry: "MX",
    },
  };
  if (typeof g.lat === "number" && typeof g.lng === "number") lugar.geo = { "@type": "GeoCoordinates", latitude: g.lat, longitude: g.lng };
  if (g.telefono) lugar.telephone = String(g.telefono).split("/")[0].trim();
  return lugar;
}

// Tarjeta de grupo en HTML (misma apariencia que la del navegador; el JavaScript la reemplaza al cargar)
export function tarjetaGrupo(g) {
  const fila = (dt, dd) => (dd ? `<div><dt>${dt}</dt><dd>${dd}</dd></div>` : "");
  const llegar = typeof g.lat === "number"
    ? `https://www.google.com/maps/dir/?api=1&destination=${g.lat},${g.lng}`
    : g.maps_url || "";
  return `<article class="tarjeta">
  <div class="t-cab"><span>Distrito ${esc(g.distrito)}</span></div>
  <h2 class="t-nombre">${esc(g.grupo)}</h2>
  <dl>
    ${fila("Ciudad", esc(g.ciudad))}
    ${fila("Dirección", esc(domicilio(g)))}
    ${fila("Referencia", esc(g.referencia))}
    ${fila("Horario", esc(g.horario))}
    ${fila("Teléfono", esc(g.telefono))}
    ${fila("Ubicación", llegar ? `<a href="${esc(llegar)}" target="_blank" rel="noopener">Cómo llegar</a>` : "")}
  </dl>
</article>`;
}

// Texto sin etiquetas, para descripciones
export function textoPlano(html, max = 160) {
  const t = String(html || "").replace(/<br>|<\/(p|h\d|li)>/g, " ").replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();
  return t.length > max ? t.slice(0, max - 1).replace(/\s+\S*$/, "") + "…" : t;
}

// Reemplaza el <title> y agrega etiquetas al <head> de una página estática
export function reescribirCabeza(resp, { titulo, descripcion, extra = "" }) {
  return new HTMLRewriter()
    .on("title", { element(e) { if (titulo) e.setInnerContent(titulo); } })
    .on('meta[name="description"]', { element(e) { if (descripcion) e.remove(); } })
    .on("head", {
      element(e) {
        e.append(`${descripcion ? `<meta name="description" content="${esc(descripcion)}">` : ""}${extra}`, { html: true });
      },
    })
    .transform(resp);
}
