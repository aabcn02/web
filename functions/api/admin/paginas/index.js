// GET /api/admin/paginas → lista de páginas institucionales (solo administrador)
import { json, error } from "../../../../lib/http.js";

export async function onRequestGet({ env, data }) {
  if (data.usuario.rol !== "admin") return error("Solo el administrador puede editar páginas.", 403);
  const { results } = await env.DB.prepare(
    "SELECT slug, titulo, actualizado FROM paginas ORDER BY titulo COLLATE NOCASE"
  ).all();
  return json(results);
}
