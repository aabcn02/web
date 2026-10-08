// Quién está entrando al panel.
// Cloudflare Access pide el correo y un código; luego manda un token firmado (JWT)
// en el encabezado "Cf-Access-Jwt-Assertion". Aquí se verifica la firma y se busca
// el correo en la tabla "usuarios" para saber su rol (admin o editor).
//
// Variables de entorno necesarias en Cloudflare Pages:
//   ACCESS_EQUIPO  → nombre del equipo de Zero Trust (lo de antes de .cloudflareaccess.com)
//   ACCESS_AUD     → "Etiqueta de audiencia (AUD)" de la aplicación de Access

let llavesCache = { equipo: null, llaves: null, hasta: 0 };

export async function usuarioActual(request, env) {
  const email = await correoVerificado(request, env);
  if (!email) return null;
  const u = await env.DB.prepare("SELECT email, nombre, rol FROM usuarios WHERE email = ? AND activo = 1")
    .bind(email).first();
  return u || { email, rol: null };
}

async function correoVerificado(request, env) {
  // Solo para pruebas en la compu (wrangler pages dev): nunca aplica en internet
  const host = new URL(request.url).hostname;
  if (env.MODO_PRUEBA === "1" && (host === "localhost" || host === "127.0.0.1")) {
    return (request.headers.get("x-prueba-email") || "").toLowerCase() || null;
  }

  const token = request.headers.get("cf-access-jwt-assertion");
  if (!token || !env.ACCESS_EQUIPO || !env.ACCESS_AUD) return null;
  try {
    const [h64, p64, f64] = token.split(".");
    const cab = JSON.parse(texto(b64url(h64)));
    const datos = JSON.parse(texto(b64url(p64)));
    const emisor = `https://${env.ACCESS_EQUIPO}.cloudflareaccess.com`;

    const llave = (await llavesAccess(env.ACCESS_EQUIPO)).find((k) => k.kid === cab.kid);
    if (!llave || cab.alg !== "RS256") return null;
    const clave = await crypto.subtle.importKey(
      "jwk", llave, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]
    );
    const ok = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5", clave, b64url(f64), new TextEncoder().encode(`${h64}.${p64}`)
    );
    if (!ok) return null;

    const ahora = Math.floor(Date.now() / 1000);
    const auds = Array.isArray(datos.aud) ? datos.aud : [datos.aud];
    if (datos.iss !== emisor || !auds.includes(env.ACCESS_AUD) || !(datos.exp > ahora)) return null;
    return String(datos.email || "").toLowerCase() || null;
  } catch (_) {
    return null;
  }
}

async function llavesAccess(equipo) {
  if (llavesCache.equipo === equipo && llavesCache.hasta > Date.now()) return llavesCache.llaves;
  const r = await fetch(`https://${equipo}.cloudflareaccess.com/cdn-cgi/access/certs`);
  const { keys = [] } = await r.json();
  llavesCache = { equipo, llaves: keys, hasta: Date.now() + 60 * 60 * 1000 };
  return keys;
}

function b64url(s) {
  const b = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
}
const texto = (bytes) => new TextDecoder().decode(bytes);
