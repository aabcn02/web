export function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...extra },
  });
}

export const error = (msg, status = 400) => json({ error: msg }, status);

export async function leerJSON(request) {
  try { return await request.json(); } catch { return null; }
}

// Texto limpio de un campo: sin espacios de más y con largo máximo
export function campo(v, max = 300) {
  if (v === null || v === undefined) return null;
  const s = String(v).replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  return s ? s.slice(0, max) : null;
}

export function numero(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
