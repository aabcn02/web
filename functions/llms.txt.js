// /llms.txt → resumen del sitio en texto simple para asistentes de IA (ChatGPT, Claude, Perplexity, Gemini…)
// Incluye el directorio completo de grupos, así una IA puede responder "¿dónde hay un grupo de AA en Mexicali?".
import { URL_SITIO, TELEFONO, CORREO, domicilio } from "../lib/seo.js";
import { gruposActivos } from "../lib/consultas.js";

export async function onRequestGet({ env }) {
  let grupos = [];
  try { if (env.DB) grupos = await gruposActivos(env); } catch (_) { /* */ }
  const porCiudad = {};
  grupos.forEach((g) => { (porCiudad[g.ciudad] = porCiudad[g.ciudad] || []).push(g); });

  const lineas = [
    "# Alcohólicos Anónimos Área 64 Región 02 (Mexicali, Baja California)",
    "",
    "> Sitio oficial del Área 64 BCN2 de Alcohólicos Anónimos: grupos en Mexicali, Valle de Mexicali, San Luis Río Colorado (Sonora) y San Felipe. Asistir es gratis; el único requisito es el deseo de dejar de beber.",
    "",
    `- Teléfono de la oficina de área: ${TELEFONO}`,
    `- Correo: ${CORREO}`,
    `- Directorio con filtros: ${URL_SITIO}/directorio`,
    `- Mapa de grupos: ${URL_SITIO}/mapa`,
    "",
    "## Cómo llegar a una reunión",
    "",
    "Busca el grupo más cercano en el directorio, revisa días y horario, y preséntate diciendo que deseas información para dejar de beber. Si es para un familiar o amigo, pide información sobre AA para un ser querido. No se pagan cuotas ni hay que registrarse.",
    "",
    "## Páginas",
    "",
    `- [¿Qué es AA?](${URL_SITIO}/pagina?p=que-es-aa)`,
    `- [Preguntas frecuentes](${URL_SITIO}/pagina?p=faq)`,
    `- [Para profesionales](${URL_SITIO}/pagina?p=profesionales)`,
    `- [AA en México](${URL_SITIO}/pagina?p=aa-en-mexico)`,
    `- [Literatura de AA](${URL_SITIO}/literatura)`,
    `- [Reflexión del día](${URL_SITIO}/reflexion)`,
    `- [Noticias](${URL_SITIO}/noticias?c=noticia)`,
    `- [Contacto](${URL_SITIO}/pagina?p=contacto)`,
    "",
    `## Directorio de grupos (${grupos.length} grupos)`,
    "",
  ];
  for (const [ciudad, lista] of Object.entries(porCiudad)) {
    lineas.push(`### ${ciudad}`, "");
    for (const g of lista) {
      const datos = [
        `Distrito ${g.distrito}`,
        domicilio(g) && `Dirección: ${domicilio(g)}`,
        g.referencia && `Referencia: ${g.referencia}`,
        g.horario && `Horario: ${g.horario}`,
        g.telefono && `Teléfono: ${g.telefono}`,
        g.idioma && g.idioma !== "Español" && `Idioma: ${g.idioma}`,
        typeof g.lat === "number" && `Mapa: https://www.google.com/maps?q=${g.lat},${g.lng}`,
        `Ficha: ${URL_SITIO}/directorio?id=${g.id}`,
      ].filter(Boolean).join(" · ");
      lineas.push(`- **Grupo ${g.grupo}** — ${datos}`);
    }
    lineas.push("");
  }
  return new Response(lineas.join("\n"), { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
