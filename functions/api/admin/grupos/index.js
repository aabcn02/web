// GET  /api/admin/grupos  → todos los grupos (también los dados de baja)
// POST /api/admin/grupos  → crear grupo nuevo
import { json, error, leerJSON } from "../../../../lib/http.js";
import { datosGrupo, completarUbicacion } from "../../../../lib/grupos.js";
import { anotar } from "../../../../lib/bitacora.js";

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    `SELECT id, distrito, grupo, ciudad, estado, direccion, colonia, cp, referencia, terapia, personas, idioma,
            horario, telefono, lat, lng, maps_url, precision_ubic, activo, actualizado
       FROM grupos
      ORDER BY activo DESC, CAST(distrito AS INTEGER), distrito, grupo COLLATE NOCASE`
  ).all();
  return json(results);
}

export async function onRequestPost({ request, env, data }) {
  const r = datosGrupo(await leerJSON(request));
  if (r.error) return error(r.error);
  const g = await completarUbicacion(r.datos);

  const res = await env.DB.prepare(
    `INSERT INTO grupos (distrito, grupo, ciudad, estado, direccion, colonia, cp, referencia, terapia, personas, idioma,
                         horario, telefono, lat, lng, maps_url, precision_ubic, geo_intento, activo)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1)`
  ).bind(g.distrito, g.grupo, g.ciudad, g.estado, g.direccion, g.colonia, g.cp, g.referencia, g.terapia, g.personas,
         g.idioma, g.horario, g.telefono, g.lat, g.lng, g.maps_url, g.lat === null ? null : g.precision_ubic).run();
  const id = res.meta.last_row_id;
  await anotar(env, data.usuario, "grupo creado", `#${id} ${g.grupo}`);
  return json({ ok: true, id, lat: g.lat, lng: g.lng, aviso: g.aviso || null }, 201);
}
