// /noticias        → lista con filtro por quién publica (Área, distrito o grupo)
// /noticias?id=12  → una noticia completa
(async function () {
  const cont = document.getElementById("noticias");
  if (!cont) return;   // en el Inicio solo se usan las funciones de abajo
  const q = new URLSearchParams(location.search);

  try {
    if (q.get("id")) return await detalle(q.get("id"));
    const r = await fetch("/api/noticias");
    const lista = r.ok ? await r.json() : [];
    cont.innerHTML = `
      <h1>Noticias</h1>
      <section class="filtros filtros-noticias" aria-label="Filtro">
        <label><span class="oculto-vis">Quién publica</span>
          <select id="f-de">${opcionesConNoticias(lista, "De: todas")}</select>
        </label>
        <label><span class="oculto-vis">Mes</span>
          <select id="f-mes"><option value="">Mes: todos</option>${opcionesMes(lista)}</select>
        </label>
        <button id="limpiar" class="limpiar" type="button" hidden>Limpiar</button>
      </section>
      <p class="total" id="total"></p>
      <div id="lista-n"></div>`;
    const sel = document.getElementById("f-de");
    const selMes = document.getElementById("f-mes");
    const limpiar = document.getElementById("limpiar");
    if (q.get("de") && [...sel.options].some((o) => o.value === q.get("de"))) sel.value = q.get("de");
    if (q.get("mes") && [...selMes.options].some((o) => o.value === q.get("mes"))) selMes.value = q.get("mes");
    const pintar = () => {
      const v = sel.value, mes = selMes.value;
      const vis = lista.filter((n) => coincideDe(n, v) && (!mes || String(n.fecha).startsWith(mes)));
      limpiar.hidden = !v && !mes;
      document.getElementById("total").textContent = vis.length === 1 ? "1 noticia" : `${vis.length} noticias`;
      document.getElementById("lista-n").innerHTML = vis.length
        ? `<div class="noticias">${vis.map(tarjetaNoticia).join("")}</div>`
        : `<p class="vacio">${v || mes ? "No hay noticias con este filtro." : "Todavía no hay noticias."}</p>`;
      const u = new URL(location.href);
      if (v) u.searchParams.set("de", v); else u.searchParams.delete("de");
      if (mes) u.searchParams.set("mes", mes); else u.searchParams.delete("mes");
      u.searchParams.delete("c");
      history.replaceState(null, "", u);
    };
    sel.addEventListener("change", pintar);
    selMes.addEventListener("change", pintar);
    limpiar.addEventListener("click", () => { sel.value = ""; selMes.value = ""; pintar(); });
    pintar();
  } catch {
    cont.innerHTML = `<p class="error">No se pudieron cargar las noticias. Intenta de nuevo en un momento.</p>`;
  }

  async function detalle(id) {
    const r = await fetch(`/api/noticias?id=${encodeURIComponent(id)}`);
    if (!r.ok) {
      cont.innerHTML = `<article class="hoja"><h1>No encontrada</h1><p>Esta noticia ya no está disponible. <a href="/noticias">Ver noticias</a></p></article>`;
      return;
    }
    const n = await r.json();
    document.title = `${n.titulo} · AA Área 64 Región 02`;
    cont.innerHTML = `
      <a class="volver-pub" href="/noticias">← Noticias</a>
      <article class="hoja nota">
        <p class="nota-fecha">${esc(cuandoNoticia(n))}</p>
        <h1>${esc(n.titulo)}</h1>
        <p class="nota-de">Publicado por ${n.autor_nombre ? `<strong>${esc(n.autor_nombre)}</strong> · ` : ""}${esc(textoDe(n))}</p>
        ${n.imagen ? `<img class="nota-img" src="${esc(n.imagen)}" alt="">` : ""}
        <div id="cuerpo" class="contenido"></div>
        <div class="acciones-grupo" style="margin-top:20px">
          <button type="button" class="btn-mini" id="compartir">Compartir</button>
        </div>
      </article>`;
    document.getElementById("cuerpo").replaceChildren(limpiarContenido(n.contenido));
    document.getElementById("compartir").addEventListener("click", async () => {
      const url = location.href;
      if (navigator.share && matchMedia("(pointer: coarse)").matches) {
        try { await navigator.share({ title: n.titulo, url }); return; } catch (e) { if (e.name === "AbortError") return; }
      }
      aviso(await copiar(`${n.titulo}\n${url}`) ? "Enlace copiado." : "No se pudo copiar.");
    });
  }
})();

function tarjetaNoticia(n) {
  return `<a class="noticia" href="/noticias?id=${esc(n.id)}">
    ${n.imagen ? `<img src="${esc(n.imagen)}" alt="" loading="lazy">` : `<span class="noticia-sin"></span>`}
    <span class="noticia-txt">
      <small>${esc(cuandoNoticia(n))}</small>
      <strong>${esc(n.titulo)}</strong>
      <em class="noticia-de">${esc(textoDe(n))}${n.autor_nombre ? `<span class="noticia-por"> · por ${esc(n.autor_nombre)}</span>` : ""}</em>
      ${n.resumen ? `<span>${esc(n.resumen)}</span>` : ""}
    </span>
  </a>`;
}

const COMITES = {
  agenda: "Comité de Agenda",
  archivos: "Comité de Archivos Históricos",
  ccp: "Comité de Cooperación con la Comunidad Profesional",
  finanzas: "Comité de Finanzas",
  ip: "Comité de Información Pública",
  correccionales: "Comité de Instituciones Correccionales",
  literatura: "Comité de Literatura",
  plenitud: "Comité de Plenitud",
  tratamiento: "Comité de Tratamiento y Accesibilidades",
};

// "Área 64 Región 02" · "Comité de … · Área 64" · "Distrito 3" · "Grupo 3 de septiembre · Distrito 1"
function textoDe(n) {
  if (n.de_tipo === "comite") return `${n.de_nombre} · Área 64`;
  if (n.de_tipo === "grupo") return `Grupo ${n.de_nombre || ""}${n.de_distrito ? ` · Distrito ${n.de_distrito}` : ""}`;
  if (n.de_tipo === "distrito") return `Distrito ${n.de_distrito}`;
  return "Área 64 Región 02";
}

// Filtro: "area", "distrito:3" (incluye las de sus grupos) o "grupo:12"
function coincideDe(n, v) {
  if (!v) return true;
  if (v === "area") return !n.de_tipo || n.de_tipo === "area" || n.de_tipo === "comite";
  const [tipo, val] = v.split(":");
  if (tipo === "comite") return n.de_tipo === "comite" && n.de_nombre === COMITES[val];
  if (tipo === "distrito") return String(n.de_distrito) === val;
  if (tipo === "grupo") return String(n.de_grupo_id) === val;
  return true;
}

// Opciones del filtro: solo el Área, comités, distritos y grupos que SÍ tienen noticias
function opcionesConNoticias(lista, primera) {
  const op = (v, t) => `<option value="${esc(v)}">${esc(t)}</option>`;
  const hayArea = lista.some((n) => !n.de_tipo || n.de_tipo === "area" || n.de_tipo === "comite");
  const comites = Object.entries(COMITES).filter(([, t]) => lista.some((n) => n.de_tipo === "comite" && n.de_nombre === t));
  const distritos = [...new Set(lista.map((n) => n.de_distrito).filter(Boolean).map(String))]
    .sort((a, b) => (parseInt(a) || 0) - (parseInt(b) || 0) || a.localeCompare(b));
  const grupos = new Map();
  for (const n of lista) if (n.de_tipo === "grupo" && n.de_grupo_id) grupos.set(String(n.de_grupo_id), n);
  let html = op("", primera);
  if (hayArea) html += `<optgroup label="Área 64 Región 02">${op("area", "Área 64 Región 02 (todo)")}${comites.map(([k, t]) => op(`comite:${k}`, t)).join("")}</optgroup>`;
  if (distritos.length) html += `<optgroup label="Distritos">${distritos.map((d) => op(`distrito:${d}`, `Distrito ${d}`)).join("")}</optgroup>`;
  if (grupos.size) html += `<optgroup label="Grupos">${[...grupos.values()]
    .sort((a, b) => String(a.de_nombre).localeCompare(String(b.de_nombre), "es"))
    .map((n) => op(`grupo:${n.de_grupo_id}`, `${n.de_nombre} (Distrito ${n.de_distrito})`)).join("")}</optgroup>`;
  return html;
}

// Opciones del menú: Área, cada distrito y los grupos agrupados por distrito
function opcionesDe(grupos, primera) {
  const porDistrito = {};
  for (const g of grupos) (porDistrito[g.distrito] ||= []).push(g);
  const ds = Object.keys(porDistrito).sort((a, b) => (parseInt(a) || 0) - (parseInt(b) || 0) || a.localeCompare(b));
  const op = (v, t) => `<option value="${esc(v)}">${esc(t)}</option>`;
  return (primera !== null ? op("", primera) : "") +
    `<optgroup label="Área 64 Región 02">${op("area", "Área 64 Región 02 (todo)")}${
      Object.entries(COMITES).map(([k, t]) => op(`comite:${k}`, t)).join("")}</optgroup>` +
    `<optgroup label="Distritos">${ds.map((d) => op(`distrito:${d}`, `Distrito ${d}`)).join("")}</optgroup>` +
    ds.map((d) => `<optgroup label="Grupos del distrito ${esc(d)}">${porDistrito[d]
      .sort((a, b) => a.grupo.localeCompare(b.grupo, "es"))
      .map((g) => op(`grupo:${g.id}`, g.grupo)).join("")}</optgroup>`).join("");
}

// "2026-10" → "Octubre 2026", solo los meses que tienen noticias
function opcionesMes(lista) {
  const meses = [...new Set(lista.map((n) => String(n.fecha || "").slice(0, 7)).filter((m) => /^\d{4}-\d{2}$/.test(m)))].sort().reverse();
  return meses.map((m) => {
    const t = new Date(Number(m.slice(0, 4)), Number(m.slice(5)) - 1, 1).toLocaleDateString("es-MX", { month: "long", year: "numeric" }).replace(" de ", " ");
    return `<option value="${m}">${esc(t.charAt(0).toUpperCase() + t.slice(1))}</option>`;
  }).join("");
}

function cuandoNoticia(n) {
  const [a, m, d] = String(n.fecha || "").split("-").map(Number);
  if (!a) return "";
  let t = new Date(a, m - 1, d).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
  if (n.hora) {
    const [h, min] = n.hora.split(":").map(Number);
    t += ` · ${((h + 11) % 12) + 1}:${String(min).padStart(2, "0")} ${h < 12 ? "a. m." : "p. m."}`;
  }
  return t;
}

// Igual que en las páginas: solo deja etiquetas y atributos seguros
function limpiarContenido(html) {
  const PERMITIDAS = new Set(["H2", "H3", "H4", "P", "UL", "OL", "LI", "STRONG", "EM", "A", "BR", "BLOCKQUOTE", "IMG"]);
  const doc = new DOMParser().parseFromString(`<div>${html || ""}</div>`, "text/html");
  const frag = document.createDocumentFragment();
  const copiarNodos = (origen, destino) => {
    origen.childNodes.forEach((n) => {
      if (n.nodeType === Node.TEXT_NODE) { destino.appendChild(document.createTextNode(n.textContent)); return; }
      if (n.nodeType !== Node.ELEMENT_NODE) return;
      if (!PERMITIDAS.has(n.tagName)) { copiarNodos(n, destino); return; }
      const el = document.createElement(n.tagName.toLowerCase());
      if (n.tagName === "A") {
        const href = n.getAttribute("href") || "";
        if (/^(https?:|mailto:|tel:)/i.test(href) || /^\/(?!\/)/.test(href)) el.setAttribute("href", href);
        if (/^https?:/i.test(href) || /\.pdf$/i.test(href)) { el.target = "_blank"; el.rel = "noopener"; }
      }
      if (n.tagName === "IMG") {
        const src = n.getAttribute("src") || "";
        if (!/^(https:\/\/|\/)/.test(src)) return;
        el.src = src; el.alt = n.getAttribute("alt") || ""; el.loading = "lazy";
      }
      copiarNodos(n, el);
      destino.appendChild(el);
    });
  };
  copiarNodos(doc.body.firstChild, frag);
  return frag;
}
