// Ubicaciones: links de Google Maps (incluye los cortos maps.app.goo.gl) y búsqueda por dirección
// con Nominatim (OpenStreetMap). Lo usan /api/admin/ubicar y el panel al guardar un grupo.

export const AGENTE = "aabcn02.org directorio AA (contacto@aabcn02.org)";
// Cuadro que cubre Mexicali, San Luis R.C. y San Felipe; descarta resultados lejanos
export const CAJA = { oeste: -116.2, este: -114.3, norte: 33.0, sur: 30.6 };

/* ---------- Búsqueda ---------- */

export async function geocodificar(g, nominatim) {
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

export async function buscar(params) {
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
export async function desdeLinkDeMaps(url) {
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

export function coordsEnTexto(t) {
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
export function limpiarCalle(d) {
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

export function dentroDeCaja(lat, lng) {
  return Number.isFinite(lat) && Number.isFinite(lng) &&
    lat <= CAJA.norte && lat >= CAJA.sur && lng >= CAJA.oeste && lng <= CAJA.este;
}

export function etiqueta(p) {
  return { link: "del link de Google Maps", exacta: "dirección exacta", calle: "por la calle, sin colonia (revisar)",
           colonia: "aproximado (centro de la colonia)",
           sin_link: "no se pudo leer su link de Google Maps; se ubicó por la dirección (revisar)", cp: "aproximado (código postal)", manual: "puesto a mano" }[p] || p;
}

