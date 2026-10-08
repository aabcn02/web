/* =========================================================
   Datos generales del sitio y menú.
   (Más adelante esto se editará desde el panel de admin.)
   ========================================================= */
const SITIO = {
  titulo: "Alcohólicos Anónimos®",
  subtitulo: "Área 64 Región 02 · Mexicali",
  correo: "contacto@aabcn02.org",
  telefono: "[TELÉFONO DE OFICINA]",
};

const MENU = [
  { t: "Inicio", u: "/" },
  { t: "Quiénes somos", sub: [
    { t: "¿Qué es AA?",         u: "/pagina?p=que-es-aa" },
    { t: "AA en México",        u: "/pagina?p=aa-en-mexico" },
    { t: "¿Qué es la OSG?",     u: "/pagina?p=osg" },
    { t: "Comités de servicio", u: "/pagina?p=comites" },
    { t: "Profesionales",       u: "/pagina?p=profesionales" },
    { t: "Prensa y medios",     u: "/pagina?p=prensa" },
    { t: "FAQ",                 u: "/pagina?p=faq" },
  ]},
  { t: "Miembros AA", sub: [
    { t: "Literatura",    u: "/pagina?p=literatura" },
    { t: "Publicaciones", u: "/pagina?p=publicaciones" },
    { t: "Reflexión",     u: "/pagina?p=reflexion" },
  ]},
  { t: "Grupos",     u: "/mapa" },
  { t: "Directorio", u: "/directorio" },
  { t: "Noticias",   u: "/pagina?p=noticias" },
  { t: "Contacto",   u: "/pagina?p=contacto" },
];

/* ===== Utilidades ===== */
function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// Quita acentos y mayúsculas para buscar ("Región" = "region")
function normal(s) {
  return String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

// Solo deja pasar links http/https (evita links peligrosos)
function urlSegura(u) {
  try {
    const x = new URL(u);
    return x.protocol === "https:" || x.protocol === "http:" ? x.href : "";
  } catch { return ""; }
}

function tieneCoords(g) {
  return typeof g.lat === "number" && typeof g.lng === "number" && !(g.lat === 0 && g.lng === 0);
}

function urlComoLlegar(g) {
  const propia = urlSegura(g.maps_url);
  if (propia) return propia;
  if (tieneCoords(g)) return `https://www.google.com/maps/dir/?api=1&destination=${g.lat},${g.lng}`;
  if (g.direccion) return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(`${g.direccion}, ${g.ciudad}`);
  return "";
}

function domicilio(g) {
  return [g.direccion, g.colonia ? `Col. ${g.colonia}` : ""].filter(Boolean).join(", ");
}

// "686 311 45 88 / 653 136 20 66" -> links para llamar desde el celular
function telefonosHTML(g) {
  return String(g.telefono || "").split("/").map((t) => t.trim()).filter(Boolean).map((t) => {
    const num = t.replace(/[^\d+]/g, "");
    return num.length >= 7 ? `<a href="tel:${esc(num)}">${esc(t)}</a>` : esc(t);
  }).join("<br>");
}

// Link directo a un grupo: en el mapa si tiene pin, si no en el directorio
function enlaceGrupo(g) {
  return `${location.origin}/${tieneCoords(g) ? "mapa" : "directorio"}?id=${g.id}`;
}

function textoFicha(g) {
  const lineas = [
    `${g.grupo} — Distrito ${g.distrito}, ${g.ciudad}`,
    domicilio(g) && `Dirección: ${domicilio(g)}`,
    g.referencia && `Referencia: ${g.referencia}`,
    g.horario && `Horario: ${g.horario}`,
    g.telefono && `Teléfono: ${g.telefono}`,
    urlComoLlegar(g) && `Cómo llegar: ${urlComoLlegar(g)}`,
    `Ficha: ${enlaceGrupo(g)}`,
  ];
  return lineas.filter(Boolean).join("\n");
}

function aviso(msg) {
  let t = document.getElementById("aviso");
  if (!t) {
    t = document.createElement("div");
    t.id = "aviso"; t.className = "aviso"; t.setAttribute("role", "status"); t.setAttribute("aria-live", "polite");
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add("ver");
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove("ver"), 1800);
}

async function copiar(txt) {
  try { await navigator.clipboard.writeText(txt); return true; }
  catch {
    const ta = document.createElement("textarea");
    ta.value = txt; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand("copy"); ta.remove(); return ok;
  }
}

// En el celular abre el menú de compartir (WhatsApp, etc.); en compu copia la ficha
async function compartirGrupo(g) {
  const texto = textoFicha(g);
  if (navigator.share && matchMedia("(pointer: coarse)").matches) {
    try { await navigator.share({ title: g.grupo, text: texto }); return; }
    catch (e) { if (e && e.name === "AbortError") return; }
  }
  aviso(await copiar(texto) ? "Ficha copiada. Ya la puedes pegar en WhatsApp." : "No se pudo copiar.");
}

// Botones [data-compartir] / [data-copiar] en cualquier parte (tarjetas y globos del mapa)
function activarBotonesGrupo(grupos) {
  const porId = new Map(grupos.map((g) => [String(g.id), g]));
  document.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-compartir], [data-copiar]");
    if (!b) return;
    const g = porId.get(b.dataset.compartir || b.dataset.copiar);
    if (!g) return;
    if (b.dataset.compartir) compartirGrupo(g);
    else aviso(await copiar(enlaceGrupo(g)) ? "Enlace copiado." : "No se pudo copiar.");
  });
}

function botonesGrupo(g) {
  return `<div class="acciones-grupo">
    <button type="button" class="btn-mini" data-compartir="${esc(g.id)}">Compartir</button>
    <button type="button" class="btn-mini" data-copiar="${esc(g.id)}">Copiar enlace</button>
  </div>`;
}

async function cargarGrupos() {
  const r = await fetch("/api/grupos", { headers: { accept: "application/json" } });
  if (!r.ok) throw new Error("No se pudieron cargar los grupos.");
  const datos = await r.json();
  if (!Array.isArray(datos)) throw new Error("Respuesta inesperada del servidor.");
  return datos;
}

/* ===== Filtros compartidos (Directorio y Mapa) ===== */
function llenarSelect(select, valores, etiqueta = (v) => v) {
  const primero = select.options[0];
  select.innerHTML = "";
  select.appendChild(primero);
  valores.forEach((v) => {
    const o = document.createElement("option");
    o.value = v; o.textContent = etiqueta(v);
    select.appendChild(o);
  });
}

// Un solo buscador: nombre del grupo, calle, colonia, referencia, horario...
// Cada palabra tiene que aparecer ("pueblo nuevo" encuentra "Col. Pueblo Nuevo")
function coincide(g, q) {
  if (!q) return true;
  const texto = normal(`${g.grupo} ${g.direccion} ${g.colonia} ${g.referencia} ${g.ciudad} ${g.horario} ${g.idioma}`);
  return q.split(/\s+/).every((p) => texto.includes(p));
}

function prepararFiltros(grupos, ids, alCambiar) {
  const el = {
    ciudad:   document.getElementById(ids.ciudad),
    distrito: document.getElementById(ids.distrito),
    buscar:   document.getElementById(ids.buscar),
    limpiar:  document.getElementById(ids.limpiar),
  };
  const unicos = (campo) => [...new Set(grupos.map((g) => String(g[campo] ?? "").trim()).filter(Boolean))];
  llenarSelect(el.ciudad, unicos("ciudad").sort((a, b) => a.localeCompare(b, "es")));
  llenarSelect(el.distrito,
    unicos("distrito").sort((a, b) => (parseInt(a) || 0) - (parseInt(b) || 0) || a.localeCompare(b, "es")),
    (d) => `Distrito ${d}`);

  // ?id=12 en la dirección: muestra solo ese grupo (links compartidos)
  let soloId = new URLSearchParams(location.search).get("id");
  if (soloId && !grupos.some((g) => String(g.id) === soloId)) soloId = null;
  const quitarSolo = () => {
    if (!soloId) return;
    soloId = null;
    history.replaceState(null, "", location.pathname);
  };

  const aplicar = () => {
    if (soloId) {
      el.limpiar.hidden = true;
      alCambiar(grupos.filter((g) => String(g.id) === soloId), { solo: true });
      return;
    }
    const c = el.ciudad.value, d = el.distrito.value;
    const texto = el.buscar.value.trim();
    const q = normal(texto);
    const lista = grupos.filter((g) =>
      (!c || String(g.ciudad).trim() === c) &&
      (!d || String(g.distrito).trim() === d) &&
      coincide(g, q)
    );
    const activos = [d && `Distrito ${d}`, c, texto && `“${texto}”`].filter(Boolean);
    el.limpiar.hidden = activos.length === 0;
    alCambiar(lista, { activos });
  };
  const alFiltrar = () => { quitarSolo(); aplicar(); };
  el.ciudad.addEventListener("change", alFiltrar);
  el.distrito.addEventListener("change", alFiltrar);
  el.buscar.addEventListener("input", alFiltrar);
  // En el celular, "Buscar" en el teclado cierra el teclado para ver resultados
  el.buscar.addEventListener("keydown", (e) => { if (e.key === "Enter") el.buscar.blur(); });
  el.limpiar.addEventListener("click", () => {
    el.ciudad.value = ""; el.distrito.value = ""; el.buscar.value = "";
    alFiltrar();
  });
  // Botón "Mostrar todos" dentro del contador (cuando se ve un solo grupo)
  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-mostrar-todos]")) alFiltrar();
  });
  activarBotonesGrupo(grupos);
  aplicar();
}

// Texto del contador: "Total de grupos: 12 · Distrito 3 · Mexicali"
function textoTotal(lista, info) {
  if (info.solo) {
    return `Mostrando un grupo <button type="button" class="btn-mini" data-mostrar-todos>Mostrar todos</button>`;
  }
  const chips = (info.activos || []).map((a) => `<span class="chip">${esc(a)}</span>`).join("");
  return `Total de grupos: <strong>${lista.length}</strong>${chips}`;
}

/* ===== Encabezado, menú y pie ===== */
function rutaActual() {
  const p = location.pathname.replace(/\.html$/, "").replace(/\/index$/, "/").replace(/(.)\/$/, "$1");
  return p + location.search;
}

function pintarEncabezado() {
  const actual = rutaActual();
  const item = (m) => {
    if (m.sub) {
      return `<li class="tiene-sub">
        <button class="sub-btn" type="button" aria-expanded="false">${esc(m.t)} <span aria-hidden="true">▾</span></button>
        <ul class="sub">${m.sub.map((s) =>
          `<li><a href="${s.u}"${s.u === actual ? ' aria-current="page"' : ""}>${esc(s.t)}</a></li>`).join("")}</ul>
      </li>`;
    }
    return `<li><a href="${m.u}"${m.u === actual ? ' aria-current="page"' : ""}>${esc(m.t)}</a></li>`;
  };

  const cont = document.getElementById("encabezado");
  if (!cont) return;
  cont.outerHTML = `
  <a class="salto" href="#contenido">Saltar al contenido</a>
  <header class="enc">
    <div class="enc-in">
      <a class="marca" href="/">
        <img id="logo" src="/assets/logo.png" alt="">
        <span><strong>${esc(SITIO.titulo)}</strong><small>${esc(SITIO.subtitulo)}</small></span>
      </a>
      <button class="hamb" type="button" aria-label="Abrir menú" aria-expanded="false" aria-controls="menu">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
      </button>
      <nav class="menu" id="menu" aria-label="Menú principal"><ul>${MENU.map(item).join("")}</ul></nav>
    </div>
  </header>`;

  // Si todavía no hay logo, se esconde la imagen sin romper nada
  const logo = document.getElementById("logo");
  if (logo) logo.addEventListener("error", () => { logo.style.display = "none"; });

  const menu = document.getElementById("menu");
  const hamb = document.querySelector(".hamb");
  hamb.addEventListener("click", () => {
    const abierto = menu.classList.toggle("abierto");
    hamb.setAttribute("aria-expanded", String(abierto));
    hamb.setAttribute("aria-label", abierto ? "Cerrar menú" : "Abrir menú");
  });

  document.querySelectorAll(".tiene-sub > .sub-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const li = btn.parentElement;
      const abrir = !li.classList.contains("abierto");
      document.querySelectorAll(".tiene-sub.abierto").forEach((x) => {
        x.classList.remove("abierto");
        x.querySelector(".sub-btn").setAttribute("aria-expanded", "false");
      });
      if (abrir) { li.classList.add("abierto"); btn.setAttribute("aria-expanded", "true"); }
    });
  });
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".tiene-sub")) {
      document.querySelectorAll(".tiene-sub.abierto").forEach((x) => {
        x.classList.remove("abierto");
        x.querySelector(".sub-btn").setAttribute("aria-expanded", "false");
      });
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") document.querySelectorAll(".tiene-sub.abierto").forEach((x) => x.classList.remove("abierto"));
  });
}

function pintarPie() {
  const cont = document.getElementById("pie");
  if (!cont) return;
  cont.outerHTML = `
  <footer class="pie">
    <div class="pie-in">
      <span>${esc(SITIO.subtitulo)}, B.C.</span>
      <span>Contacto: <a href="mailto:${esc(SITIO.correo)}">${esc(SITIO.correo)}</a> · ${esc(SITIO.telefono)}</span>
      <span><a href="/pagina?p=aviso">Aviso de privacidad</a></span>
    </div>
  </footer>`;
}

pintarEncabezado();
pintarPie();
