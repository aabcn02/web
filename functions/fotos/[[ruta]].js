// GET /fotos/...  → entrega fotos y PDFs guardados en R2 (binding FOTOS)
export async function onRequestGet({ env, params, request }) {
  if (!env.FOTOS) return new Response("No disponible", { status: 404 });
  const clave = (Array.isArray(params.ruta) ? params.ruta : [params.ruta]).join("/");
  if (!/^(fotos|documentos)\/[\w\-./]+$/.test(clave) || clave.includes("..")) {
    return new Response("No encontrado", { status: 404 });
  }
  const obj = await env.FOTOS.get(clave);
  if (!obj) return new Response("No encontrado", { status: 404 });

  const h = new Headers();
  obj.writeHttpMetadata(h);
  h.set("etag", obj.httpEtag);
  h.set("cache-control", "public, max-age=31536000, immutable");
  h.set("x-content-type-options", "nosniff");
  if (clave.endsWith(".pdf")) h.set("content-disposition", "inline");
  if (request.headers.get("if-none-match") === obj.httpEtag) return new Response(null, { status: 304, headers: h });
  return new Response(obj.body, { headers: h });
}
