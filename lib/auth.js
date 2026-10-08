// Login propio del panel: correo + contraseña.
// - Las contraseñas se guardan con PBKDF2-SHA256 (100,000 vueltas) y sal aleatoria: no se pueden leer.
// - Al entrar se crea una sesión: un código aleatorio que vive en una cookie segura (HttpOnly, Secure,
//   SameSite=Strict). En la base de datos solo se guarda su huella (SHA-256), nunca el código.
// - 5 intentos fallidos bloquean esa cuenta 15 minutos.

export const COOKIE = "__Host-aa_sesion";
export const DURACION_DIAS = 7;
const VUELTAS = 100000;

export async function usuarioActual(request, env) {
  // Solo para pruebas en la compu (wrangler pages dev): nunca aplica en internet
  const host = new URL(request.url).hostname;
  if (env.MODO_PRUEBA === "1" && (host === "localhost" || host === "127.0.0.1")) {
    const email = (request.headers.get("x-prueba-email") || "").toLowerCase();
    if (email) {
      const u = await env.DB.prepare(
        "SELECT email, nombre, rol, cambiar_clave FROM usuarios WHERE email = ? AND activo = 1"
      ).bind(email).first();
      return u || { email, rol: null };
    }
  }

  const token = leerCookie(request, COOKIE);
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  return await env.DB.prepare(
    `SELECT u.email, u.nombre, u.rol, u.cambiar_clave
       FROM sesiones s JOIN usuarios u ON u.email = s.email
      WHERE s.token = ? AND s.expira > datetime('now') AND u.activo = 1`
  ).bind(await huella(token)).first();
}

export async function crearSesion(env, email) {
  const token = hex(crypto.getRandomValues(new Uint8Array(32)));
  await env.DB.prepare(
    `INSERT INTO sesiones (token, email, expira) VALUES (?, ?, datetime('now', '+${DURACION_DIAS} days'))`
  ).bind(await huella(token), email).run();
  // limpieza de sesiones vencidas
  await env.DB.prepare("DELETE FROM sesiones WHERE expira < datetime('now')").run();
  return `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${DURACION_DIAS * 86400}`;
}

export async function cerrarSesion(request, env) {
  const token = leerCookie(request, COOKIE);
  if (token && /^[a-f0-9]{64}$/.test(token)) {
    await env.DB.prepare("DELETE FROM sesiones WHERE token = ?").bind(await huella(token)).run();
  }
  return `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

export async function cifrarClave(clave) {
  const sal = crypto.getRandomValues(new Uint8Array(16));
  const bits = await pbkdf2(clave, sal, VUELTAS);
  return `pbkdf2$${VUELTAS}$${b64(sal)}$${b64(bits)}`;
}

export async function claveCorrecta(clave, guardada) {
  const [tipo, vueltas, sal64, hash64] = String(guardada || "").split("$");
  if (tipo !== "pbkdf2" || !hash64) {
    await pbkdf2(clave, new Uint8Array(16), VUELTAS);   // mismo tiempo aunque no haya contraseña
    return false;
  }
  const bits = await pbkdf2(clave, desdeB64(sal64), Number(vueltas));
  return igualesSeguro(bits, desdeB64(hash64));
}

// Contraseña temporal fácil de dictar o mandar por WhatsApp (sin 0/O ni 1/l)
export function claveTemporal() {
  const letras = "abcdefghjkmnpqrstuvwxyz23456789";
  const r = crypto.getRandomValues(new Uint8Array(10));
  const s = Array.from(r, (n) => letras[n % letras.length]).join("");
  return `${s.slice(0, 5)}-${s.slice(5)}`;
}

export function claveValida(c) {
  const s = String(c || "");
  if (s.length < 8) return "La contraseña debe tener al menos 8 caracteres.";
  if (s.length > 200) return "La contraseña es demasiado larga.";
  return null;
}

/* ---------- utilidades ---------- */

async function pbkdf2(clave, sal, vueltas) {
  const llave = await crypto.subtle.importKey("raw", new TextEncoder().encode(String(clave)), "PBKDF2", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: sal, iterations: vueltas }, llave, 256));
}

export async function huella(texto) {
  return hex(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto))));
}

function igualesSeguro(a, b) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a[i] ^ b[i];
  return d === 0;
}

function leerCookie(request, nombre) {
  const c = request.headers.get("cookie") || "";
  for (const parte of c.split(/;\s*/)) {
    const i = parte.indexOf("=");
    if (i > 0 && parte.slice(0, i) === nombre) return parte.slice(i + 1);
  }
  return null;
}

const hex = (bytes) => Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
const b64 = (bytes) => btoa(String.fromCharCode(...bytes));
const desdeB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
