// POST /api/admin/link  { url }  → { lat, lng }  (lee un link de Google Maps para poner el pin)
import { json, error, leerJSON } from "../../../lib/http.js";
import { desdeLinkDeMaps } from "../../../lib/geo.js";

export async function onRequestPost({ request }) {
  const e = await leerJSON(request);
  const url = String(e?.url || "").trim();
  if (!/^https:\/\/(maps\.app\.goo\.gl|goo\.gl|(www\.)?google\.[a-z.]+|maps\.google\.[a-z.]+)\//i.test(url)) {
    return error("Pega un link de Google Maps (empieza con https://maps.app.goo.gl/ o https://www.google.com/maps/).");
  }
  try {
    const p = await desdeLinkDeMaps(url);
    if (p) return json({ lat: p.lat, lng: p.lng });
  } catch (_) { /* abajo */ }
  return error("No se pudo leer la ubicación de ese link. Puedes poner el pin a mano tocando el mapa.", 422);
}
