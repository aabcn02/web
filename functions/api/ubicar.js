// GET /api/ubicar  →  busca las coordenadas de los grupos que todavía no tienen pin.
// Herramienta de una sola vez para la carga inicial (en la Parte 2 se mueve al panel de admin).
// Cada grupo se intenta UNA sola vez, así que llamarla de más no hace daño.
// Usa Nominatim (OpenStreetMap): máximo 1 consulta por segundo, por eso va en tandas.

const POR_TANDA = 6;        // grupos por visita (cabe en el límite de Cloudflare)
const PAUSA_MS = 1100;         // respeta el límite de Nominatim
const AGENTE = "aabcn02.org directorio AA (contacto@aabcn02.org)";
// Cuadro que cubre Mexicali, San Luis R.C. y San Felipe; descarta resultados lejanos
const CAJA = { oeste: -116.2, este: -114.3, norte: 33.0, sur: 30.6 };

export async function onRequestGet({ env }) {
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

/* ---------- Búsqueda ---------- */

async function geocodificar(g, nominatim) {
  const estado = g.estado || (g.ciudad === "San Luis Río Colorado" ? "Sonora" : "Baja California");
  const calle = limpiarCalle(g.direccion);
  const intentos = [];
  if (calle) intentos.push({ precision: "exacta", q: `${calle}, ${g.colonia || ""}, ${g.ciudad}, ${estado}, México` });
  if (calle) intentos.push({ precision: "calle", q: `${calle}, ${g.ciudad}, ${estado}, México` });
  if (g.colonia) intentos.push({ precision: "colonia", q: `${g.colonia}, ${g.ciudad}, ${estado}, México` });
  if (g.cp) intentos.push({ precision: "cp", postalcode: g.cp });

  for (const it of intentos) {
    const params = it.postalcode
      ? { postalcode: it.postalcode, countrycodes: "mx" }
      : { q: it.q.replace(/,\s*,/g, ",") };
    const r = await nominatim(params);
    if (r) return { ...r, precision: it.precision };
  }
  return null;
}

async function buscar(params) {
  const u = new URL("https://nominatim.openstreetmap.org/search");
  Object.entries({
    format: "jsonv2", limit: "1", "accept-language": "es",
    viewbox: `${CAJA.oeste},${CAJA.norte},${CAJA.este},${CAJA.sur}`, bounded: "1",
    ...params,
  }).forEach(([k, v]) => u.searchParams.set(k, v));
  const r = await fetch(u, { headers: { "user-agent": AGENTE, accept: "application/json" } });
  if (!r.ok) return null;
  const datos = await r.json();
  const p = Array.isArray(datos) && datos[0];
  if (!p) return null;
  const lat = Number(p.lat), lng = Number(p.lon);
  return dentroDeCaja(lat, lng) ? { lat, lng } : null;
}

// Links de Google Maps (incluye los cortos maps.app.goo.gl): saca las coordenadas del link final
async function desdeLinkDeMaps(url) {
  let actual = url;
  for (let i = 0; i < 4; i++) {
    const p = coordsEnTexto(actual);
    if (p) return p;
    const r = await fetch(actual, {
      redirect: "manual",
      headers: { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)", "accept-language": "es-MX,es;q=0.9" },
    });
    const sig = r.headers.get("location");
    if (!sig) {
      const cuerpo = r.ok ? await r.text() : "";
      return coordsEnTexto(cuerpo);
    }
    actual = new URL(sig, actual).href;
  }
  return null;
}

function coordsEnTexto(t) {
  let s = String(t || "");
  try { s = decodeURIComponent(s); } catch (_) { /* texto con % sueltos */ }
  s = s.replace(/&amp;/g, "&").replace(/\\u003d/g, "=").replace(/\\u0026/g, "&");
  // [lat, lng] en este orden
  const pats = [
    /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,                                       // .../data=!3d32.6!4d-115.4
    /@(-?\d+\.\d+),(-?\d+\.\d+)/,                                           // .../@32.6,-115.4,17z
    /[?&;](?:q|query|ll|center|destination|daddr)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/, // ?q=32.6,-115.4  / staticmap?center=
    /\[null,null,(-?\d+\.\d+),(-?\d+\.\d+)\]/,                              // datos dentro del HTML de Google Maps
  ];
  for (const re of pats) {
    const m = s.match(re);
    if (m) {
      const lat = Number(m[1]), lng = Number(m[2]);
      if (dentroDeCaja(lat, lng)) return { lat, lng, precision: "link" };
    }
  }
  return null;
}

/* ---------- Utilidades ---------- */

// Quita lo que confunde al buscador: "#", locales, "altos", paréntesis, "entre ..."
function limpiarCalle(d) {
  return String(d || "")
    .replace(/\(.*?\)/g, " ")
    .replace(/\b(entre|enfrente|frente)\b.*$/i, " ")
    .replace(/\b(local|loc\.)\s*[\w-]+/gi, " ")
    .replace(/\bL-\d+\w*/g, " ")
    .replace(/\baltos\b|\bsegundo piso\b/gi, " ")
    .replace(/#\s*/g, "")
    .replace(/\besq(\.|uina)?\s*(con)?\b/gi, " y ")
    .replace(/\s{2,}/g, " ")
    .replace(/[\s,.]+$/, "")
    .trim();
}

function dentroDeCaja(lat, lng) {
  return Number.isFinite(lat) && Number.isFinite(lng) &&
    lat <= CAJA.norte && lat >= CAJA.sur && lng >= CAJA.oeste && lng <= CAJA.este;
}

function etiqueta(p) {
  return { link: "del link de Google Maps", exacta: "dirección exacta", calle: "por la calle, sin colonia (revisar)",
           colonia: "aproximado (centro de la colonia)",
           sin_link: "no se pudo leer su link de Google Maps; se ubicó por la dirección (revisar)", cp: "aproximado (código postal)", manual: "puesto a mano" }[p] || p;
}

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

function texto(t, status = 200) {
  return new Response(t, { status, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
}
