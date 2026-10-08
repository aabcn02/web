// Reflexión del día: videos de una lista de reproducción de YouTube cuyo TÍTULO trae la fecha
// ("16 Julio", "1° de Junio", "Agosto 7", "July 06"...). Se escoge el de hoy (hora de Tijuana/Mexicali);
// si falta, el de la fecha más cercana. Misma lógica que usa aabcn01.org.

export const LISTA_PREDETERMINADA = "PLp0laP-xqSmT8s0MPIfkEhzdqj8e96EZh";
export const ZONA = "America/Tijuana";

const MESES = {
  enero: 1, ene: 1, january: 1, jan: 1,
  febrero: 2, feb: 2, february: 2,
  marzo: 3, mar: 3, march: 3,
  abril: 4, abr: 4, april: 4, apr: 4,
  mayo: 5, may: 5,
  junio: 6, jun: 6, june: 6,
  julio: 7, jul: 7, july: 7,
  agosto: 8, ago: 8, agoto: 8, august: 8, aug: 8,
  septiembre: 9, setiembre: 9, sept: 9, sep: 9, set: 9, september: 9,
  octubre: 10, oct: 10, october: 10,
  noviembre: 11, nov: 11, november: 11,
  diciembre: 12, dic: 12, december: 12,
};
const ALT = Object.keys(MESES).sort((a, b) => b.length - a.length).join("|");
const RE_DIA_MES = new RegExp(`(?:^|[^0-9])([0-3]?\\d)\\s*(?:de\\s+)?(${ALT})(?![a-z])`);
const RE_MES_DIA = new RegExp(`(?<![a-z])(${ALT})\\.?\\s*-?\\s*0?([0-3]?\\d)(?![0-9])`);
const DIAS_MES = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
export const NOMBRES_MES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

const normal = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const valida = (m, d) => m >= 1 && m <= 12 && d >= 1 && d <= DIAS_MES[m - 1];
export const clave = (m, d) => `${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

export function fechaDelTitulo(titulo) {
  const t = normal(titulo).replace(/[°º]/g, "");
  let x = RE_DIA_MES.exec(t);
  if (x) { const d = +x[1], m = MESES[x[2]]; if (valida(m, d)) return { m, d }; }
  x = RE_MES_DIA.exec(t);
  if (x) { const m = MESES[x[1]], d = +x[2]; if (valida(m, d)) return { m, d }; }
  return null;
}

export function hoy(zona = ZONA) {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: zona, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const v = (t) => Number(p.find((x) => x.type === t).value);
  return { m: v("month"), d: v("day") };
}

// videos: [{ id, titulo, descripcion, publicado }]
export function indexar(videos) {
  const indice = new Map();
  const repetidos = new Map();
  const sinFecha = [];
  for (const v of videos) {
    const f = fechaDelTitulo(v.titulo);
    if (!f) { sinFecha.push(v.titulo); continue; }
    const k = clave(f.m, f.d);
    const e = { ...v, fecha: f };
    const prev = indice.get(k);
    if (!prev) indice.set(k, e);
    else {
      const [queda, sale] = (e.publicado || "") > (prev.publicado || "") ? [e, prev] : [prev, e];
      indice.set(k, queda);
      repetidos.set(k, [...(repetidos.get(k) || []), sale.titulo]);
    }
  }
  return { indice, repetidos, sinFecha };
}

const diaDelAnio = (m, d) => DIAS_MES.slice(0, m - 1).reduce((a, b) => a + b, 0) + d;

export function elegir(indice, { m, d }) {
  const exacto = indice.get(clave(m, d));
  if (exacto) return { video: exacto, motivo: "fecha exacta" };
  const n = diaDelAnio(m, d);
  let mejor = null, dist = Infinity;
  for (const e of indice.values()) {
    const x = Math.abs(n - diaDelAnio(e.fecha.m, e.fecha.d));
    const c = Math.min(x, 366 - x);
    if (c < dist) { dist = c; mejor = e; }
  }
  return mejor ? { video: mejor, motivo: "fecha más cercana" } : null;
}

// Quita del inicio de la descripción las líneas que repiten el título
export function limpiarDescripcion(desc, titulo) {
  const lineas = String(desc || "").split(/\r?\n/);
  const t = normal(titulo).replace(/\s+/g, " ").trim();
  let i = 0, quitadas = 0;
  while (i < lineas.length && !lineas[i].trim()) i++;
  while (i < lineas.length && quitadas < 3) {
    const l = normal(lineas[i]).replace(/\s+/g, " ").trim();
    if (!l || l === t || l.startsWith(t) || t.startsWith(l)) { i++; quitadas++; continue; }
    break;
  }
  return lineas.slice(i).join("\n").trim().replace(/\n{3,}/g, "\n\n");
}

// Trae todos los videos de la lista (50 por página)
export async function videosDeLista(lista, llave) {
  const todos = [];
  let pagina = "";
  for (let vuelta = 0; vuelta < 20; vuelta++) {
    const u = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
    u.search = new URLSearchParams({
      part: "snippet,contentDetails", maxResults: "50", playlistId: lista, key: llave,
      fields: "nextPageToken,items(snippet(title,description,resourceId/videoId,publishedAt),contentDetails(videoId,videoPublishedAt))",
      ...(pagina ? { pageToken: pagina } : {}),
    }).toString();
    const r = await fetch(u);
    if (!r.ok) {
      let detalle = "";
      try { detalle = (await r.json())?.error?.message || ""; } catch (_) { /* */ }
      throw new Error(`YouTube respondió ${r.status}. ${detalle}`.trim());
    }
    const datos = await r.json();
    for (const it of datos.items || []) {
      const id = it.contentDetails?.videoId || it.snippet?.resourceId?.videoId;
      if (!id) continue;
      todos.push({
        id,
        titulo: it.snippet?.title || "",
        descripcion: it.snippet?.description || "",
        publicado: it.contentDetails?.videoPublishedAt || it.snippet?.publishedAt || "",
      });
    }
    if (!datos.nextPageToken) break;
    pagina = datos.nextPageToken;
  }
  return todos;
}
