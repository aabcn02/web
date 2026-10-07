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
    { t: "¿Quiénes somos?", u: "/pagina?p=quienes-somos" },
    { t: "Profesionales",   u: "/pagina?p=profesionales" },
    { t: "FAQ",             u: "/pagina?p=faq" },
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

async function cargarGrupos() {
  const r = await fetch("/api/grupos", { headers: { accept: "application/json" } });
  if (!r.ok) throw new Error("No se pudieron cargar los grupos.");
  const datos = await r.json();
  if (!Array.isArray(datos)) throw new Error("Respuesta inesperada del servidor.");
  return datos;
}

/* ===== Filtros compartidos (Directorio y Mapa) ===== */
function llenarSelect(select, valores) {
  const primero = select.options[0];
  select.innerHTML = "";
  select.appendChild(primero);
  valores.forEach((v) => {
    const o = document.createElement("option");
    o.value = v; o.textContent = v;
    select.appendChild(o);
  });
}

function prepararFiltros(grupos, ids, alCambiar) {
  const el = {
    ciudad:   document.getElementById(ids.ciudad),
    distrito: document.getElementById(ids.distrito),
    grupo:    document.getElementById(ids.grupo),
    ubic:     document.getElementById(ids.ubic),
    limpiar:  document.getElementById(ids.limpiar),
  };
  const unicos = (campo) => [...new Set(grupos.map((g) => String(g[campo] ?? "").trim()).filter(Boolean))];
  llenarSelect(el.ciudad, unicos("ciudad").sort((a, b) => a.localeCompare(b, "es")));
  llenarSelect(el.distrito, unicos("distrito").sort((a, b) => (parseInt(a) || 0) - (parseInt(b) || 0) || a.localeCompare(b, "es")));

  const aplicar = () => {
    const c = el.ciudad.value, d = el.distrito.value;
    const qg = normal(el.grupo.value), qu = normal(el.ubic.value);
    const lista = grupos.filter((g) =>
      (!c || String(g.ciudad).trim() === c) &&
      (!d || String(g.distrito).trim() === d) &&
      (!qg || normal(g.grupo).includes(qg)) &&
      (!qu || normal(`${g.direccion} ${g.ciudad} ${g.grupo} ${g.horario}`).includes(qu))
    );
    alCambiar(lista);
  };
  el.ciudad.addEventListener("change", aplicar);
  el.distrito.addEventListener("change", aplicar);
  el.grupo.addEventListener("input", aplicar);
  el.ubic.addEventListener("input", aplicar);
  el.limpiar.addEventListener("click", () => {
    el.ciudad.value = ""; el.distrito.value = ""; el.grupo.value = ""; el.ubic.value = "";
    aplicar();
  });
  aplicar();
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
    </div>
  </footer>`;
}

pintarEncabezado();
pintarPie();
