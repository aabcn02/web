// GET /api/admin/yo → quién soy y qué puedo hacer
import { json } from "../../../lib/http.js";

export async function onRequestGet({ data, env }) {
  const u = data.usuario;
  return json({
    email: u.email,
    nombre: u.nombre,
    rol: u.rol,
    puede: {
      grupos: true,
      noticias: true,
      paginas: u.rol === "admin",
      usuarios: u.rol === "admin",
    },
    fotos: !!env.FOTOS,
  });
}
