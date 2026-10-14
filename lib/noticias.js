import { campo } from "./http.js";
import { limpiarHTML, soloTexto, imagenSegura } from "./limpiar.js";

// Comités del Área (el valor corto va en el link del filtro: /noticias?de=comite:ip)
export const COMITES = {
  agenda: "Comité de Agenda",
  archivos: "Comité de Archivos Históricos",
  ccp: "Comité de Cooperación con la Comunidad Profesional",
  finanzas: "Comité de Finanzas",
  ip: "Comité de Información Pública",
  correccionales: "Comité de Instituciones Correccionales",
  literatura: "Comité de Literatura",
  plenitud: "Comité de Plenitud",
  tratamiento: "Comité de Tratamiento y Accesibilidades",
};

// Columnas que se leen para mostrar una noticia (el nombre de quien publicó sale de "usuarios"; el correo nunca)
export const COLUMNAS = "n.id, n.titulo, n.fecha, n.hora, n.resumen, n.imagen, n.de_tipo, n.de_distrito, n.de_grupo_id, n.de_nombre, u.nombre AS autor_nombre";
export const DESDE = "noticias n LEFT JOIN usuarios u ON u.email = n.autor";

// Quién publica: "area" | "distrito:3" | "grupo:12"
export async function resolverDe(env, valor) {
  const v = String(valor || "area");
  if (v === "area") return { de_tipo: "area", de_distrito: null, de_grupo_id: null, de_nombre: null };
  let m = v.match(/^comite:([a-z]{1,20})$/);
  if (m) {
    if (!COMITES[m[1]]) return { error: "Ese comité no existe." };
    return { de_tipo: "comite", de_distrito: null, de_grupo_id: null, de_nombre: COMITES[m[1]] };
  }
  m = v.match(/^distrito:([\w-]{1,10})$/);
  if (m) {
    const ok = await env.DB.prepare("SELECT 1 FROM grupos WHERE distrito = ? LIMIT 1").bind(m[1]).first();
    if (!ok) return { error: "Ese distrito no existe." };
    return { de_tipo: "distrito", de_distrito: m[1], de_grupo_id: null, de_nombre: null };
  }
  m = v.match(/^grupo:(\d{1,9})$/);
  if (m) {
    const g = await env.DB.prepare("SELECT id, grupo, distrito FROM grupos WHERE id = ?").bind(Number(m[1])).first();
    if (!g) return { error: "Ese grupo no existe." };
    return { de_tipo: "grupo", de_distrito: String(g.distrito), de_grupo_id: g.id, de_nombre: g.grupo };
  }
  return { error: "Elige quién publica (Área, distrito o grupo)." };
}

export function textoDe(n) {
  if (n.de_tipo === "grupo") return `Grupo ${n.de_nombre || ""}${n.de_distrito ? ` · Distrito ${n.de_distrito}` : ""}`;
  if (n.de_tipo === "distrito") return `Distrito ${n.de_distrito}`;
  if (n.de_tipo === "comite") return `${n.de_nombre} · Área 64`;
  return "Área 64 Región 02";
}

export async function datosNoticia(env, e, autor) {
  if (!e || typeof e !== "object") return { error: "Datos no válidos." };
  const de = await resolverDe(env, e.de);
  if (de.error) return de;
  const contenido = limpiarHTML(e.contenido);
  const d = {
    categoria: "noticia",
    titulo: campo(e.titulo, 200),
    fecha: /^\d{4}-\d{2}-\d{2}$/.test(String(e.fecha || "")) ? e.fecha : null,
    hora: /^([01]\d|2[0-3]):[0-5]\d$/.test(String(e.hora || "")) ? e.hora : null,
    contenido,
    resumen: campo(e.resumen, 300) || soloTexto(contenido, 220) || null,
    imagen: imagenSegura(e.imagen) || null,
    publicado: e.publicado ? 1 : 0,
    autor,
    ...de,
  };
  if (!d.titulo) return { error: "Falta el título." };
  if (!d.fecha) return { error: "Falta la fecha." };
  if (!d.contenido && !d.imagen) return { error: "Escribe el contenido o pon una foto." };
  return { datos: d };
}
