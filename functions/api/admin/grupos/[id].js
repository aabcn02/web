// PUT    /api/admin/grupos/:id  → guardar cambios
// PATCH  /api/admin/grupos/:id  → dar de baja o reactivar  { activo: 0 | 1 }
// DELETE /api/admin/grupos/:id  → borrar para siempre (solo administrador y solo si ya estaba de baja)
import { json, error, leerJSON } from "../../../../lib/http.js";
import { datosGrupo, completarUbicacion } from "../../../../lib/grupos.js";
import { anotar } from "../../../../lib/bitacora.js";

const idValido = (p) => (/^\d{1,9}$/.test(String(p.id)) ? Number(p.id) : null);

export async function onRequestPut({ request, env, params, data }) {
  const id = idValido(params);
  if (!id) return error("Grupo no válido.");
  const r = datosGrupo(await leerJSON(request));
  if (r.error) return error(r.error);
  const g = await completarUbicacion(r.datos);

  const res = await env.DB.prepare(
    `UPDATE grupos SET distrito = ?, grupo = ?, ciudad = ?, estado = ?, direccion = ?, colonia = ?, cp = ?, referencia = ?,
            terapia = ?, personas = ?, idioma = ?, horario = ?, telefono = ?, lat = ?, lng = ?, maps_url = ?,
            precision_ubic = ?, geo_intento = 1, actualizado = datetime('now')
      WHERE id = ?`
  ).bind(g.distrito, g.grupo, g.ciudad, g.estado, g.direccion, g.colonia, g.cp, g.referencia, g.terapia, g.personas,
         g.idioma, g.horario, g.telefono, g.lat, g.lng, g.maps_url, g.lat === null ? null : g.precision_ubic, id).run();
  if (!res.meta.changes) return error("Ese grupo ya no existe.", 404);
  await anotar(env, data.usuario, "grupo editado", `#${id} ${g.grupo}`);
  return json({ ok: true, id, lat: g.lat, lng: g.lng, aviso: g.aviso || null });
}

export async function onRequestPatch({ request, env, params, data }) {
  const id = idValido(params);
  const e = await leerJSON(request);
  if (!id || !e || ![0, 1].includes(e.activo)) return error("Datos no válidos.");
  const res = await env.DB.prepare("UPDATE grupos SET activo = ?, actualizado = datetime('now') WHERE id = ?").bind(e.activo, id).run();
  if (!res.meta.changes) return error("Ese grupo ya no existe.", 404);
  await anotar(env, data.usuario, e.activo ? "grupo reactivado" : "grupo dado de baja", `#${id}`);
  return json({ ok: true });
}

export async function onRequestDelete({ env, params, data }) {
  if (data.usuario.rol !== "admin") return error("Solo el administrador puede borrar grupos.", 403);
  const id = idValido(params);
  if (!id) return error("Grupo no válido.");
  const g = await env.DB.prepare("SELECT grupo, activo FROM grupos WHERE id = ?").bind(id).first();
  if (!g) return error("Ese grupo ya no existe.", 404);
  if (g.activo) return error("Primero da de baja el grupo; luego se puede borrar.");
  await env.DB.prepare("DELETE FROM grupos WHERE id = ?").bind(id).run();
  await anotar(env, data.usuario, "grupo borrado", `#${id} ${g.grupo}`);
  return json({ ok: true });
}
