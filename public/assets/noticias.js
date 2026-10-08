// /noticias?c=noticia|publicacion|reflexion  → lista
// /noticias?id=12                            → una noticia completa
(async function () {
  const cont = document.getElementById("noticias");
  if (!cont) return;   // en el Inicio solo se usan las funciones de abajo
  const q = new URLSearchParams(location.search);
  const CATS = { noticia: "Noticias", publicacion: "Publicaciones", reflexion: "Reflexión" };

  try {
    if (q.get("id")) return await detalle(q.get("id"));
    const c = CATS[q.get("c")] ? q.get("c") : "noticia";
    document.title = `${CATS[c]} · AA Área 64 Región 02`;
    const r = await fetch(`/api/noticias?c=${c}`);
    const lista = r.ok ? await r.json() : [];
    cont.innerHTML = `
      <h1>${CATS[c]}</h1>
      <nav class="cat-nav" aria-label="Secciones">${Object.entries(CATS).map(([k, v]) =>
        `<a href="/noticias?c=${k}"${k === c ? ' aria-current="page"' : ""}>${v}</a>`).join("")}</nav>
      ${lista.length
        ? `<div class="noticias">${lista.map(tarjetaNoticia).join("")}</div>`
        : `<p class="vacio">Todavía no hay publicaciones en esta sección.</p>`}`;
  } catch {
    cont.innerHTML = `<p class="error">No se pudieron cargar las noticias. Intenta de nuevo en un momento.</p>`;
  }

  async function detalle(id) {
    const r = await fetch(`/api/noticias?id=${encodeURIComponent(id)}`);
    if (!r.ok) {
      cont.innerHTML = `<article class="hoja"><h1>No encontrada</h1><p>Esta publicación ya no está disponible. <a href="/noticias">Ver noticias</a></p></article>`;
      return;
    }
    const n = await r.json();
    document.title = `${n.titulo} · AA Área 64 Región 02`;
    cont.innerHTML = `
      <a class="volver-pub" href="/noticias?c=${esc(n.categoria)}">← ${esc(CATS[n.categoria] || "Noticias")}</a>
      <article class="hoja nota">
        <p class="nota-fecha">${esc(fechaLarga(n.fecha))}</p>
        <h1>${esc(n.titulo)}</h1>
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
      <small>${esc(fechaLarga(n.fecha))}</small>
      <strong>${esc(n.titulo)}</strong>
      ${n.resumen ? `<span>${esc(n.resumen)}</span>` : ""}
    </span>
  </a>`;
}

function fechaLarga(f) {
  const [a, m, d] = String(f || "").split("-").map(Number);
  if (!a) return "";
  return new Date(a, m - 1, d).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
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
