// Turnstile (el "no soy robot" de Cloudflare, gratis) para el login del panel.
// Se activa solo cuando existen en Cloudflare Pages:
//   TURNSTILE_SITEKEY (variable, pública)  y  TURNSTILE_SECRET (secreto)
// Si no están, el login funciona igual que antes (sin la casilla).
const URL_VERIFICAR = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export const turnstileActivo = (env) => !!(env.TURNSTILE_SECRET && env.TURNSTILE_SITEKEY);

export async function verificarTurnstile(env, token, ip) {
  if (!turnstileActivo(env)) return true;
  if (!token || typeof token !== "string" || token.length > 2048) return false;
  const datos = new FormData();
  datos.append("secret", env.TURNSTILE_SECRET);
  datos.append("response", token);
  if (ip) datos.append("remoteip", ip);
  try {
    const r = await fetch(URL_VERIFICAR, { method: "POST", body: datos });
    const j = await r.json();
    return j.success === true;
  } catch (_) {
    return false;   // si no se puede verificar, no se deja entrar
  }
}
