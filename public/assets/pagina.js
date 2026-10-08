// Páginas institucionales: /pagina?p=slug  → lee el contenido de la base de datos.
(async function () {
  const p = new URLSearchParams(location.search).get("p") || "";
  const tituloEl = document.getElementById("titulo");
  const cuerpo = document.getElementById("cuerpo");

  // Título provisional según el menú
  let titulo = "Sección";
  MENU.forEach((m) => (m.sub || [m]).forEach((s) => { if (s.u === `/pagina?p=${p}`) titulo = s.t; }));
  ponerTitulo(titulo);

  try {
    const r = await fetch(`/api/pagina?p=${encodeURIComponent(p)}`, { headers: { accept: "application/json" } });
    if (r.status === 404) return;                  // se queda "Esta sección estará lista pronto."
    if (!r.ok) throw new Error();
    const pag = await r.json();
    ponerTitulo(pag.titulo);
    cuerpo.replaceChildren(limpiarHTML(pag.contenido));
  } catch {
    cuerpo.innerHTML = `<p class="error">No se pudo cargar esta página. Intenta de nuevo en un momento.</p>`;
  }

  function ponerTitulo(t) {
    tituloEl.textContent = t;
    document.title = `${t} · AA Área 64 Región 02`;
  }

  // Solo deja pasar etiquetas y atributos seguros (el contenido se podrá editar desde el panel)
  function limpiarHTML(html) {
    const PERMITIDAS = new Set(["H2", "H3", "H4", "P", "UL", "OL", "LI", "STRONG", "EM", "A", "BR", "BLOCKQUOTE", "IMG"]);
    const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
    const frag = document.createDocumentFragment();
    const copiar = (origen, destino) => {
      origen.childNodes.forEach((n) => {
        if (n.nodeType === Node.TEXT_NODE) { destino.appendChild(document.createTextNode(n.textContent)); return; }
        if (n.nodeType !== Node.ELEMENT_NODE) return;
        if (!PERMITIDAS.has(n.tagName)) { copiar(n, destino); return; }
        const el = document.createElement(n.tagName.toLowerCase());
        if (n.tagName === "A") {
          const href = n.getAttribute("href") || "";
          if (/^(https?:|mailto:|tel:)/i.test(href) || /^\/(?!\/)/.test(href)) el.setAttribute("href", href);
          if (/^https?:/i.test(href)) { el.target = "_blank"; el.rel = "noopener"; }
        }
        if (n.tagName === "IMG") {
          const src = n.getAttribute("src") || "";
          if (!/^(https:\/\/|\/)/.test(src)) return;
          el.src = src; el.alt = n.getAttribute("alt") || ""; el.loading = "lazy";
          el.addEventListener("error", () => el.remove());
        }
        copiar(n, el);
        destino.appendChild(el);
      });
    };
    copiar(doc.body.firstChild, frag);
    return frag;
  }
})();
