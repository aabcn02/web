// GET /api/admin/ubicar  →  busca las coordenadas de los grupos que todavía no tienen pin
// (solo administrador). Se usó para la carga inicial; queda por si se cargan grupos en lote.
// Cada grupo se intenta UNA sola vez, así que llamarla de más no hace daño.
// Usa Nominatim (OpenStreetMap): máximo 1 consulta por segundo, por eso va en tandas.

const POR_TANDA = 6;        // grupos por visita (cabe en el límite de Cloudflare)
const PAUSA_MS = 1100;         // respeta el límite de Nominatim

import { desdeLinkDeMaps, geocodificar, buscar, etiqueta } from "../../../lib/geo.js";

export async function onRequestGet({ env, data }) {
  if (data.usuario.rol !== "admin") return texto("Solo el administrador.", 403);
  if (!env.DB) return texto("Falta conectar la base de datos (binding DB).", 500);

  const { results: pendientes } = await env.DB.prepare(
    `SELECT id, grupo, ciudad, estado, direccion, colonia, cp, maps_url
       FROM grupos WHERE lat IS NULL AND geo_intento = 0 AND activo = 1
      ORDER BY id LIMIT ?`
  ).bind(POR_TANDA).all();

  const lineas = [];
  let consultas = 0;
  const nominatim = async (params) => {
    if (consultas++ > 0) await esperar(PAUSA_MS);
    return buscar(params);
  };

  for (const g of pendientes) {
    let punto = null;
    try {
      if (g.maps_url) punto = await desdeLinkDeMaps(g.maps_url);
      if (!punto) punto = await geocodificar(g, nominatim);
    } catch (_) { /* si falla, se queda sin pin y se ubica a mano */ }

    if (punto) {
      await env.DB.prepare(
        `UPDATE grupos SET lat = ?, lng = ?, precision_ubic = ?, geo_intento = 1, actualizado = datetime('now') WHERE id = ?`
      ).bind(punto.lat, punto.lng, punto.precision, g.id).run();
      lineas.push(`✔ ${g.grupo} (${g.ciudad}) — ${etiqueta(punto.precision)}`);
    } else {
      await env.DB.prepare(`UPDATE grupos SET geo_intento = 1 WHERE id = ?`).bind(g.id).run();
      lineas.push(`✘ ${g.grupo} (${g.ciudad}) — no se encontró, hay que ponerlo a mano`);
    }
  }

  const faltan = (await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM grupos WHERE lat IS NULL AND geo_intento = 0 AND activo = 1`
  ).first()).n;

  let salida = lineas.join("\n");
  if (faltan > 0) {
    salida += `\n\nFaltan ${faltan} grupos. Recarga esta página para seguir.`;
  } else {
    const { results } = await env.DB.prepare(
      `SELECT grupo, ciudad, CASE WHEN lat IS NOT NULL AND maps_url IS NOT NULL AND precision_ubic <> 'link'
                                  THEN 'sin_link' ELSE precision_ubic END AS precision_ubic
         FROM grupos
        WHERE activo = 1 AND (lat IS NULL OR precision_ubic IN ('calle', 'colonia', 'cp')
              OR (maps_url IS NOT NULL AND precision_ubic <> 'link'))
        ORDER BY CAST(distrito AS INTEGER), grupo`
    ).all();
    const sin = results.filter((r) => !r.precision_ubic);
    const aprox = results.filter((r) => r.precision_ubic);
    salida += `\n\n=== TERMINADO ===`;
    salida += `\nSin pin (${sin.length}):\n` + (sin.map((r) => `  - ${r.grupo} (${r.ciudad})`).join("\n") || "  ninguno");
    salida += `\nPin aproximado, revisar (${aprox.length}):\n` +
      (aprox.map((r) => `  - ${r.grupo} (${r.ciudad}) — ${etiqueta(r.precision_ubic)}`).join("\n") || "  ninguno");
  }
  return texto(salida);
}

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

function texto(t, status = 200) {
  return new Response(t, { status, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
}
