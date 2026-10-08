export async function gruposActivos(env) {
  const { results } = await env.DB.prepare(
    `SELECT id, distrito, grupo, ciudad, direccion, colonia, referencia, terapia, personas, idioma,
            horario, telefono, lat, lng, maps_url
       FROM grupos WHERE activo = 1
      ORDER BY CAST(distrito AS INTEGER), distrito, grupo COLLATE NOCASE`
  ).all();
  return results;
}
