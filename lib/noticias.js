import { campo } from "./http.js";
import { limpiarHTML, soloTexto, imagenSegura } from "./limpiar.js";

export const CATEGORIAS = { noticia: "Noticias", publicacion: "Publicaciones" };

export function datosNoticia(e, autor) {
  if (!e || typeof e !== "object") return { error: "Datos no válidos." };
  const contenido = limpiarHTML(e.contenido);
  const d = {
    categoria: CATEGORIAS[e.categoria] ? e.categoria : "noticia",
    titulo: campo(e.titulo, 200),
    fecha: /^\d{4}-\d{2}-\d{2}$/.test(String(e.fecha || "")) ? e.fecha : null,
    contenido,
    resumen: campo(e.resumen, 300) || soloTexto(contenido, 220) || null,
    imagen: imagenSegura(e.imagen) || null,
    publicado: e.publicado ? 1 : 0,
    autor,
  };
  if (!d.titulo) return { error: "Falta el título." };
  if (!d.fecha) return { error: "Falta la fecha." };
  if (!d.contenido && !d.imagen) return { error: "Escribe el contenido o pon una foto." };
  return { datos: d };
}
