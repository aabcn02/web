// Limpia el HTML que viene del editor del panel antes de guardarlo.
// Solo deja títulos, párrafos, listas, negritas, links, imágenes y citas.
// (El sitio público lo vuelve a limpiar al mostrarlo: doble seguro.)

const PERMITIDAS = new Set(["h2", "h3", "h4", "p", "ul", "ol", "li", "strong", "em", "a", "br", "blockquote", "img"]);
const CAMBIOS = { b: "strong", i: "em", h1: "h2", h5: "h4", h6: "h4", div: "p" };
const VACIAS = new Set(["br", "img"]);
const CON_CONTENIDO_PROHIBIDO = new Set(["script", "style", "iframe", "object", "embed", "noscript", "template", "svg", "math", "title", "head"]);

export function limpiarHTML(entrada, max = 200000) {
  let s = String(entrada || "").slice(0, max);
  s = s.replace(/<!--[\s\S]*?-->/g, "");
  for (const t of CON_CONTENIDO_PROHIBIDO) {
    s = s.replace(new RegExp(`<${t}\\b[\\s\\S]*?<\\/${t}\\s*>`, "gi"), "");
    s = s.replace(new RegExp(`<${t}\\b[^>]*>`, "gi"), "");
  }

  const salida = [];
  const abiertas = [];
  const partes = s.split(/(<[^>]*>)/);
  for (const parte of partes) {
    if (!parte) continue;
    if (parte[0] !== "<") {
      salida.push(parte.replace(/[<>]/g, (c) => (c === "<" ? "&lt;" : "&gt;")));
      continue;
    }
    const m = parte.match(/^<\s*(\/?)\s*([a-zA-Z0-9]+)([^>]*)>$/);
    if (!m) continue;
    const cierre = !!m[1];
    let tag = m[2].toLowerCase();
    tag = CAMBIOS[tag] || tag;
    if (!PERMITIDAS.has(tag)) continue;

    if (cierre) {
      if (VACIAS.has(tag)) continue;
      const i = abiertas.lastIndexOf(tag);
      if (i === -1) continue;
      while (abiertas.length > i) salida.push(`</${abiertas.pop()}>`);
      continue;
    }

    const attrs = leerAtributos(m[3]);
    if (tag === "a") {
      const href = enlaceSeguro(attrs.href);
      if (!href) { abiertas.push("a-vacio"); continue; }
      const externo = /^https?:/i.test(href);
      salida.push(`<a href="${attr(href)}"${externo ? ' target="_blank" rel="noopener"' : ""}>`);
      abiertas.push("a");
      continue;
    }
    if (tag === "img") {
      const src = imagenSegura(attrs.src);
      if (src) salida.push(`<img src="${attr(src)}" alt="${attr((attrs.alt || "").slice(0, 300))}" loading="lazy">`);
      continue;
    }
    if (tag === "br") { salida.push("<br>"); continue; }
    salida.push(`<${tag}>`);
    abiertas.push(tag);
  }
  while (abiertas.length) {
    const t = abiertas.pop();
    if (t !== "a-vacio") salida.push(`</${t}>`);
  }
  return salida.join("")
    .replace(/<\/a-vacio>/g, "")
    .replace(/<(p|h2|h3|h4|strong|em|li|ul|ol|blockquote)>\s*(<br>\s*)*<\/\1>/g, "")
    .trim();
}

// Texto sin etiquetas (para el resumen de una noticia)
export function soloTexto(html, max = 220) {
  const t = String(html || "").replace(/<br>|<\/(p|h\d|li)>/g, " ").replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, " ").trim();
  return t.length > max ? t.slice(0, max - 1).replace(/\s+\S*$/, "") + "…" : t;
}

function leerAtributos(s) {
  const r = {};
  const re = /([a-zA-Z_:][\w:.-]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
  let m;
  while ((m = re.exec(s))) r[m[1].toLowerCase()] = decodificar(m[3] ?? m[4] ?? m[5] ?? "");
  return r;
}

function decodificar(v) {
  return v.replace(/&#x([0-9a-f]+);?/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);?/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
}

export function enlaceSeguro(href) {
  const h = String(href || "").trim().replace(/[\u0000- ]/g, "");
  if (/^(https?:\/\/|mailto:|tel:)/i.test(h)) return h;
  if (/^\/(?!\/)/.test(h)) return h;
  return "";
}

export function imagenSegura(src) {
  const s = String(src || "").trim();
  if (/^https:\/\/[^\s"'<>]+$/i.test(s)) return s;
  if (/^\/fotos\/[\w\-./]+$/.test(s) && !s.includes("..")) return s;
  return "";
}

const attr = (v) => String(v).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
