/* =========================================================
   Panel de administración — aabcn02.org/admin
   Secciones: Grupos · Noticias · Páginas (admin) · Usuarios (admin)
   ========================================================= */
(function () {
  "use strict";

  const vista = document.getElementById("vista");
  let YO = null;               // { email, rol, puede: {...}, fotos }
  let cambiosSinGuardar = false;
  let mapaEd = null;           // mapa del editor de grupos (Leaflet)

  /* ---------- Utilidades ---------- */
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const normal = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  const $ = (sel, raiz = document) => raiz.querySelector(sel);
  const hoy = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
  const fechaBonita = (f) => {
    const [a, m, d] = String(f || "").split("-").map(Number);
    if (!a) return "";
    return new Date(a, m - 1, d).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
  };
  const CATEGORIAS = { noticia: "Noticias", publicacion: "Publicaciones", reflexion: "Reflexión" };

  function aviso(msg, esError = false) {
    const a = document.getElementById("aviso");
    a.textContent = msg;
    a.classList.toggle("error", esError);
    a.classList.add("ver");
    clearTimeout(a._t);
    a._t = setTimeout(() => a.classList.remove("ver"), esError ? 5000 : 2500);
  }

  async function api(ruta, { method = "GET", body, binario, tipo } = {}) {
    const opciones = { method, headers: { accept: "application/json" } };
    if (method !== "GET") opciones.headers["x-aa-panel"] = "1";
    if (binario) { opciones.body = binario; opciones.headers["content-type"] = tipo || "application/octet-stream"; }
    else if (body !== undefined) { opciones.body = JSON.stringify(body); opciones.headers["content-type"] = "application/json"; }
    let r;
    try { r = await fetch(ruta, opciones); }
    catch { throw new Error("Sin conexión. Revisa tu internet e intenta de nuevo."); }
    const ct = r.headers.get("content-type") || "";
    if (!ct.includes("application/json")) throw Object.assign(new Error("Error del servidor."), { status: r.status });
    const datos = await r.json();
    if (r.status === 401 && ruta !== "/api/admin/yo" && ruta !== "/api/acceso/entrar") {
      aviso("Tu sesión terminó. Vuelve a entrar.", true);
      setTimeout(() => location.reload(), 1500);
    }
    if (!r.ok) throw Object.assign(new Error(datos.error || "Ocurrió un error."), { status: r.status });
    return datos;
  }

  function conCarga(boton, fn) {
    return async (...args) => {
      if (boton.disabled) return;
      const txt = boton.textContent;
      boton.disabled = true;
      boton.textContent = "Guardando…";
      try { await fn(...args); }
      catch (e) { aviso(e.message, true); }
      finally { boton.disabled = false; boton.textContent = txt; }
    };
  }

  function marcarCambios(form) {
    cambiosSinGuardar = false;
    const sucio = () => { cambiosSinGuardar = true; };
    form.addEventListener("input", sucio);
    form.addEventListener("change", sucio);
  }
  window.addEventListener("beforeunload", (e) => { if (cambiosSinGuardar) { e.preventDefault(); e.returnValue = ""; } });
  const confirmarSalir = () => !cambiosSinGuardar || confirm("Tienes cambios sin guardar. ¿Salir sin guardar?");

  /* ---------- Fotos: se achican en el navegador antes de subir ---------- */
  const LADO_MAX = 1600;

  async function achicarFoto(archivo) {
    let img;
    try { img = await createImageBitmap(archivo, { imageOrientation: "from-image" }); }
    catch {
      img = await new Promise((ok, mal) => {
        const i = new Image();
        i.onload = () => ok(i);
        i.onerror = () => mal(new Error("No se pudo leer la foto. Prueba con otra (JPG o PNG)."));
        i.src = URL.createObjectURL(archivo);
      });
    }
    const w0 = img.width, h0 = img.height;
    const escala = Math.min(1, LADO_MAX / Math.max(w0, h0));
    const w = Math.round(w0 * escala), h = Math.round(h0 * escala);
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    const aBlob = (tipo, q) => new Promise((ok) => c.toBlob(ok, tipo, q));
    let blob = await aBlob("image/webp", 0.8);
    if (!blob || blob.type !== "image/webp") blob = await aBlob("image/jpeg", 0.82);   // Safari viejo
    return blob;
  }

  async function subirArchivo(archivo) {
    if (!YO.fotos) throw new Error("Todavía no está conectado el almacenamiento de fotos (R2).");
    const esPDF = archivo.type === "application/pdf" || /\.pdf$/i.test(archivo.name);
    const datos = esPDF ? archivo : await achicarFoto(archivo);
    const r = await api(`/api/admin/fotos?nombre=${encodeURIComponent(archivo.name || "archivo")}`, {
      method: "POST", binario: datos, tipo: datos.type || (esPDF ? "application/pdf" : "image/jpeg"),
    });
    return r.url;
  }

  function elegirArchivo(accept) {
    return new Promise((ok) => {
      const i = document.createElement("input");
      i.type = "file";
      i.accept = accept;
      i.addEventListener("change", () => ok(i.files[0] || null), { once: true });
      i.click();
    });
  }

  /* ---------- Editor de texto tipo Word ---------- */
  function crearEditor(cont, html, { placeholder = "Escribe aquí…" } = {}) {
    cont.innerHTML = `
      <div class="herr" role="toolbar" aria-label="Formato">
        <button type="button" data-cmd="h2" title="Título">Título</button>
        <button type="button" data-cmd="h3" title="Subtítulo">Subtítulo</button>
        <button type="button" data-cmd="p" title="Texto normal">Normal</button>
        <span class="sep"></span>
        <button type="button" data-cmd="bold" title="Negrita"><b>B</b></button>
        <button type="button" data-cmd="italic" title="Cursiva"><i>I</i></button>
        <button type="button" data-cmd="insertUnorderedList" title="Lista con puntos">• Lista</button>
        <button type="button" data-cmd="insertOrderedList" title="Lista numerada">1. Lista</button>
        <span class="sep"></span>
        <button type="button" data-cmd="link" title="Poner link">Link</button>
        <button type="button" data-cmd="foto" title="Insertar foto">Foto</button>
        <button type="button" data-cmd="pdf" title="Adjuntar PDF">PDF</button>
        <button type="button" data-cmd="quitar" title="Quitar formato o foto seleccionada">Quitar</button>
      </div>
      <div class="editor contenido" contenteditable="true" role="textbox" aria-multiline="true" data-placeholder="${esc(placeholder)}"></div>`;
    const ed = $(".editor", cont);
    ed.innerHTML = html || "";
    try { document.execCommand("defaultParagraphSeparator", false, "p"); } catch { /* */ }

    let imgElegida = null;
    let rango = null;
    const guardarRango = () => {
      const s = getSelection();
      if (s.rangeCount && ed.contains(s.anchorNode)) rango = s.getRangeAt(0).cloneRange();
    };
    const recuperarRango = () => {
      ed.focus();
      if (rango) { const s = getSelection(); s.removeAllRanges(); s.addRange(rango); }
    };
    ed.addEventListener("keyup", guardarRango);
    ed.addEventListener("mouseup", guardarRango);
    ed.addEventListener("input", guardarRango);

    ed.addEventListener("click", (e) => {
      ed.querySelectorAll("img.elegida").forEach((i) => i.classList.remove("elegida"));
      imgElegida = e.target.tagName === "IMG" ? e.target : null;
      if (imgElegida) imgElegida.classList.add("elegida");
    });

    // Al pegar desde Word/WhatsApp: solo texto, cada renglón en blanco = párrafo nuevo
    ed.addEventListener("paste", (e) => {
      e.preventDefault();
      const t = (e.clipboardData || window.clipboardData).getData("text/plain") || "";
      const html = t.split(/\r?\n\s*\r?\n/).map((p) => `<p>${esc(p).replace(/\r?\n/g, "<br>")}</p>`).join("");
      document.execCommand("insertHTML", false, html);
    });

    const insertar = (html) => { recuperarRango(); document.execCommand("insertHTML", false, html); ed.dispatchEvent(new Event("input", { bubbles: true })); };

    $(".herr", cont).addEventListener("mousedown", (e) => { if (e.target.closest("button")) e.preventDefault(); });
    $(".herr", cont).addEventListener("click", async (e) => {
      const b = e.target.closest("button[data-cmd]");
      if (!b) return;
      const cmd = b.dataset.cmd;
      if (["h2", "h3", "p"].includes(cmd)) { recuperarRango(); document.execCommand("formatBlock", false, `<${cmd}>`); }
      else if (["bold", "italic", "insertUnorderedList", "insertOrderedList"].includes(cmd)) { recuperarRango(); document.execCommand(cmd); }
      else if (cmd === "link") {
        recuperarRango();
        const url = prompt("Pega el link (https://… o un correo):", "https://");
        if (!url || url === "https://") return;
        const limpio = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(url) ? `mailto:${url}` : url.trim();
        if (!/^(https?:\/\/|mailto:|tel:|\/)/i.test(limpio)) { aviso("El link debe empezar con https://", true); return; }
        if (getSelection().isCollapsed) insertar(`<a href="${esc(limpio)}">${esc(url)}</a>`);
        else document.execCommand("createLink", false, limpio);
      } else if (cmd === "foto" || cmd === "pdf") {
        guardarRango();
        const archivo = await elegirArchivo(cmd === "pdf" ? "application/pdf" : "image/*");
        if (!archivo) return;
        aviso(cmd === "pdf" ? "Subiendo PDF…" : "Achicando y subiendo foto…");
        try {
          const url = await subirArchivo(archivo);
          if (cmd === "pdf") {
            const nombre = (archivo.name || "Documento").replace(/\.pdf$/i, "");
            insertar(`<p><a href="${esc(url)}">📄 ${esc(nombre)} (PDF)</a></p>`);
          } else {
            insertar(`<img src="${esc(url)}" alt=""><p></p>`);
          }
          aviso("Listo.");
        } catch (err) { aviso(err.message, true); }
      } else if (cmd === "quitar") {
        if (imgElegida) { imgElegida.remove(); imgElegida = null; ed.dispatchEvent(new Event("input", { bubbles: true })); return; }
        recuperarRango();
        document.execCommand("removeFormat");
        document.execCommand("unlink");
        document.execCommand("formatBlock", false, "<p>");
      }
      ed.dispatchEvent(new Event("input", { bubbles: true }));
    });

    return { html: () => ed.innerHTML.replace(/<img([^>]*?) class="elegida"/g, "<img$1"), elemento: ed };
  }

  /* ---------- Navegación ---------- */
  const SECCIONES = { grupos: verGrupos, noticias: verNoticias, paginas: verPaginas, usuarios: verUsuarios };
  let hashAnterior = location.hash;

  function ir() {
    const [sec, ...resto] = location.hash.replace(/^#/, "").split("/");
    if (sec === "clave") {
      document.querySelectorAll(".pestanas a[data-sec]").forEach((a) => a.classList.remove("activa"));
      if (mapaEd) { mapaEd.remove(); mapaEd = null; }
      verClave(false);
      return;
    }
    const nombre = SECCIONES[sec] && (sec === "grupos" || sec === "noticias" || YO.puede[sec]) ? sec : "grupos";
    document.querySelectorAll(".pestanas a[data-sec]").forEach((a) => a.classList.toggle("activa", a.dataset.sec === nombre));
    if (mapaEd) { mapaEd.remove(); mapaEd = null; }
    cambiosSinGuardar = false;
    window.scrollTo(0, 0);
    SECCIONES[nombre](resto.join("/")).catch((e) => {
      vista.innerHTML = `<p class="error-p">${esc(e.message)}</p>`;
    });
  }
  window.addEventListener("hashchange", () => {
    if (location.hash === hashAnterior) return;
    if (cambiosSinGuardar && !confirm("Tienes cambios sin guardar. ¿Salir sin guardar?")) {
      history.replaceState(null, "", hashAnterior);
      return;
    }
    hashAnterior = location.hash;
    ir();
  });
  const navegar = (h) => { cambiosSinGuardar = false; location.hash = h; };

  /* =========================================================
     GRUPOS
     ========================================================= */
  let filtroGrupos = { q: "", estado: "activos" };

  async function verGrupos(param) {
    if (param) return editarGrupo(param);
    vista.innerHTML = `<p class="cargando">Cargando grupos…</p>`;
    const grupos = await api("/api/admin/grupos");
    vista.innerHTML = `
      <div class="barra">
        <h1>Grupos</h1>
        <a class="btn" href="#grupos/nuevo">+ Nuevo grupo</a>
      </div>
      <div class="barra">
        <input type="search" id="bq" placeholder="Buscar por nombre, colonia, calle…" value="${esc(filtroGrupos.q)}" autocomplete="off">
        <select id="be" aria-label="Mostrar">
          <option value="activos">Activos</option>
          <option value="sinpin">Sin pin en el mapa</option>
          <option value="baja">Dados de baja</option>
          <option value="todos">Todos</option>
        </select>
      </div>
      <p class="cuenta" id="bc"></p>
      <div class="lista" id="bl"></div>`;
    $("#be").value = filtroGrupos.estado;
    const pintar = () => {
      filtroGrupos = { q: $("#bq").value, estado: $("#be").value };
      const q = normal(filtroGrupos.q);
      const lista = grupos.filter((g) => {
        if (filtroGrupos.estado === "activos" && !g.activo) return false;
        if (filtroGrupos.estado === "baja" && g.activo) return false;
        if (filtroGrupos.estado === "sinpin" && (g.lat !== null || !g.activo)) return false;
        if (!q) return true;
        const t = normal(`${g.grupo} ${g.direccion} ${g.colonia} ${g.ciudad} distrito ${g.distrito}`);
        return q.split(/\s+/).every((p) => t.includes(p));
      });
      $("#bc").textContent = `${lista.length} grupo(s)`;
      $("#bl").innerHTML = lista.length ? lista.map((g) => `
        <button type="button" class="fila${g.activo ? "" : " baja"}" data-id="${g.id}">
          <span class="txt"><strong>${esc(g.grupo)}</strong>
            <small>Distrito ${esc(g.distrito)} · ${esc(g.ciudad)}${g.colonia ? ` · ${esc(g.colonia)}` : ""}</small></span>
          <span class="marcas">
            ${g.activo ? "" : `<span class="marca-e gris">De baja</span>`}
            ${g.lat === null ? `<span class="marca-e alerta">Sin pin</span>` : ""}
          </span>
        </button>`).join("") : `<p class="vacio-p">No hay grupos con esa búsqueda.</p>`;
    };
    $("#bq").addEventListener("input", pintar);
    $("#be").addEventListener("change", pintar);
    $("#bl").addEventListener("click", (e) => { const f = e.target.closest(".fila"); if (f) navegar(`#grupos/${f.dataset.id}`); });
    pintar();
  }

  async function editarGrupo(param) {
    const nuevo = param === "nuevo";
    vista.innerHTML = `<p class="cargando">Cargando…</p>`;
    const grupos = await api("/api/admin/grupos");
    const g = nuevo
      ? { grupo: "", distrito: "", ciudad: "Mexicali", terapia: "Tradicional", personas: "Mixto", idioma: "Español", lat: null, lng: null, activo: 1 }
      : grupos.find((x) => String(x.id) === param);
    if (!g) { vista.innerHTML = `<p class="error-p">Ese grupo no existe. <a href="#grupos">Volver</a></p>`; return; }

    const opciones = (campo) => [...new Set(grupos.map((x) => x[campo]).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), "es", { numeric: true }));
    const lista = (id, campo) => `<datalist id="${id}">${opciones(campo).map((v) => `<option value="${esc(v)}">`).join("")}</datalist>`;
    const c = (nombre, etiqueta, valor, extra = "") =>
      `<label class="c">${etiqueta}<input name="${nombre}" value="${esc(valor ?? "")}" ${extra}></label>`;

    vista.innerHTML = `
      <a class="volver" href="#grupos">← Grupos</a>
      <div class="barra"><h1>${nuevo ? "Nuevo grupo" : esc(g.grupo)}</h1>
        ${g.activo ? "" : `<span class="marca-e gris">De baja: no aparece en el sitio</span>`}</div>
      <form id="fg" novalidate>
        <section class="tarjeta-f">
          <h2>Datos del grupo</h2>
          <div class="campos">
            ${c("grupo", "Nombre del grupo *", g.grupo, 'required maxlength="120"')}
            ${c("distrito", "Distrito *", g.distrito, 'required inputmode="numeric" maxlength="10" list="l-dist"')}
            ${c("ciudad", "Ciudad *", g.ciudad, 'required maxlength="80" list="l-ciudad"')}
            ${c("direccion", "Dirección (calle y número)", g.direccion, 'maxlength="250"')}
            ${c("colonia", "Colonia", g.colonia, 'maxlength="120"')}
            ${c("cp", "Código postal", g.cp, 'inputmode="numeric" maxlength="10"')}
            ${c("referencia", "Referencia", g.referencia, 'maxlength="250" placeholder="Ej. frente a la glorieta"')}
            <label class="c ancho">Horario <small>Como se lee en el sitio. Ej. «Diario de 7:00 a 8:30 pm»</small>
              <textarea name="horario" maxlength="600">${esc(g.horario ?? "")}</textarea></label>
            ${c("telefono", "Teléfono", g.telefono, 'maxlength="120" inputmode="tel" placeholder="686 123 4567 / 686 765 4321"')}
            ${c("terapia", "Terapia", g.terapia, 'maxlength="60" list="l-terapia"')}
            ${c("personas", "Personas", g.personas, 'maxlength="60" list="l-personas"')}
            ${c("idioma", "Idioma", g.idioma, 'maxlength="40" list="l-idioma"')}
          </div>
          ${lista("l-dist", "distrito")}${lista("l-ciudad", "ciudad")}${lista("l-terapia", "terapia")}${lista("l-personas", "personas")}${lista("l-idioma", "idioma")}
        </section>

        <section class="tarjeta-f">
          <h2>Ubicación en el mapa</h2>
          <p class="ayuda">Arrastra el pin o toca el mapa donde está el grupo. También puedes pegar el link de Google Maps.</p>
          <div id="mapa-ed" role="application" aria-label="Mapa para ubicar el grupo"></div>
          <div class="link-maps">
            <input name="maps_url" value="${esc(g.maps_url ?? "")}" placeholder="https://maps.app.goo.gl/…" inputmode="url" aria-label="Link de Google Maps">
            <button type="button" class="btn-sec" id="usar-link">Usar link</button>
            <button type="button" class="btn-sec" id="quitar-pin">Quitar pin</button>
          </div>
          <p class="coords" id="coords"></p>
        </section>

        <div class="botones pie-f">
          <button type="submit" class="btn" id="guardar">Guardar</button>
          <a class="btn-sec" href="#grupos">Cancelar</a>
          ${nuevo ? "" : `<button type="button" class="btn-sec empuja" id="baja">${g.activo ? "Dar de baja" : "Reactivar"}</button>`}
          ${!nuevo && !g.activo && YO.rol === "admin" ? `<button type="button" class="btn btn-peligro" id="borrar">Borrar</button>` : ""}
        </div>
      </form>`;

    const form = $("#fg");
    marcarCambios(form);

    // --- Mapa con pin arrastrable ---
    let pos = g.lat !== null ? { lat: g.lat, lng: g.lng } : null;
    let precision = g.precision_ubic === "link" ? "link" : "manual";
    mapaEd = L.map("mapa-ed", { scrollWheelZoom: false }).setView(pos ? [pos.lat, pos.lng] : [32.6245, -115.4523], pos ? 17 : 12);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "&copy; OpenStreetMap" }).addTo(mapaEd);
    mapaEd.on("focus", () => mapaEd.scrollWheelZoom.enable());
    const icono = L.divIcon({ className: "", html: '<div class="pin"></div>', iconSize: [30, 30], iconAnchor: [15, 30] });
    let marcador = null;
    const ponerPin = (lat, lng, centrar, prec) => {
      pos = { lat: +lat.toFixed(6), lng: +lng.toFixed(6) };
      precision = prec || "manual";
      if (!marcador) {
        marcador = L.marker([pos.lat, pos.lng], { icon: icono, draggable: true, autoPan: true }).addTo(mapaEd);
        marcador.on("dragend", () => { const p = marcador.getLatLng(); ponerPin(p.lat, p.lng, false, "manual"); cambiosSinGuardar = true; });
      } else marcador.setLatLng([pos.lat, pos.lng]);
      if (centrar) mapaEd.setView([pos.lat, pos.lng], 17);
      $("#coords").textContent = `Pin: ${pos.lat}, ${pos.lng}${precision === "link" ? " (del link de Google Maps)" : ""}`;
    };
    if (pos) ponerPin(pos.lat, pos.lng, false, precision);
    else $("#coords").textContent = "Este grupo todavía no tiene pin: no aparece en el mapa.";
    mapaEd.on("click", (e) => { ponerPin(e.latlng.lat, e.latlng.lng, false, "manual"); cambiosSinGuardar = true; });
    setTimeout(() => mapaEd && mapaEd.invalidateSize(), 150);

    $("#quitar-pin").addEventListener("click", () => {
      if (marcador) { marcador.remove(); marcador = null; }
      pos = null;
      cambiosSinGuardar = true;
      $("#coords").textContent = "Sin pin: no aparecerá en el mapa.";
    });
    $("#usar-link").addEventListener("click", conCarga($("#usar-link"), async () => {
      const url = form.maps_url.value.trim();
      if (!url) { aviso("Primero pega el link de Google Maps.", true); return; }
      const r = await api("/api/admin/link", { method: "POST", body: { url } });
      ponerPin(r.lat, r.lng, true, "link");
      cambiosSinGuardar = true;
      aviso("Pin puesto con el link. Revisa que esté bien y dale Guardar.");
    }));

    // --- Guardar ---
    form.addEventListener("submit", (e) => e.preventDefault());
    $("#guardar").addEventListener("click", conCarga($("#guardar"), async () => {
      const f = Object.fromEntries(new FormData(form));
      if (!f.grupo.trim() || !f.distrito.trim() || !f.ciudad.trim()) { aviso("Faltan nombre, distrito o ciudad.", true); return; }
      const datos = { ...f, lat: pos ? pos.lat : null, lng: pos ? pos.lng : null, precision_ubic: pos ? precision : null };
      const r = nuevo
        ? await api("/api/admin/grupos", { method: "POST", body: datos })
        : await api(`/api/admin/grupos/${g.id}`, { method: "PUT", body: datos });
      cambiosSinGuardar = false;
      aviso(r.aviso || "Guardado. Ya se ve en el sitio.", !!r.aviso);
      if (nuevo) navegar(`#grupos/${r.id}`);
      else if (r.lat !== null && !pos) ponerPin(r.lat, r.lng, true, "link");
    }));

    if ($("#baja")) $("#baja").addEventListener("click", conCarga($("#baja"), async () => {
      const activar = g.activo ? 0 : 1;
      if (!activar && !confirm(`¿Dar de baja "${g.grupo}"? Ya no aparecerá en el directorio ni en el mapa (se puede reactivar después).`)) return;
      await api(`/api/admin/grupos/${g.id}`, { method: "PATCH", body: { activo: activar } });
      aviso(activar ? "Grupo reactivado." : "Grupo dado de baja.");
      navegar("#grupos");
    }));
    if ($("#borrar")) $("#borrar").addEventListener("click", conCarga($("#borrar"), async () => {
      if (!confirm(`¿Borrar "${g.grupo}" para siempre? Esto no se puede deshacer.`)) return;
      await api(`/api/admin/grupos/${g.id}`, { method: "DELETE" });
      aviso("Grupo borrado.");
      navegar("#grupos");
    }));
  }

  /* =========================================================
     NOTICIAS
     ========================================================= */
  let filtroNoticias = "";

  async function verNoticias(param) {
    if (param) return editarNoticia(param);
    vista.innerHTML = `<p class="cargando">Cargando noticias…</p>`;
    const noticias = await api("/api/admin/noticias");
    vista.innerHTML = `
      <div class="barra">
        <h1>Noticias</h1>
        <a class="btn" href="#noticias/nueva">+ Nueva</a>
      </div>
      <div class="barra">
        <select id="nc" aria-label="Categoría">
          <option value="">Todas las categorías</option>
          ${Object.entries(CATEGORIAS).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}
        </select>
      </div>
      <div class="lista" id="nl"></div>`;
    $("#nc").value = filtroNoticias;
    const pintar = () => {
      filtroNoticias = $("#nc").value;
      const lista = noticias.filter((n) => !filtroNoticias || n.categoria === filtroNoticias);
      $("#nl").innerHTML = lista.length ? lista.map((n) => `
        <button type="button" class="fila" data-id="${n.id}">
          ${n.imagen ? `<img class="mini" src="${esc(n.imagen)}" alt="">` : `<span class="mini"></span>`}
          <span class="txt"><strong>${esc(n.titulo)}</strong>
            <small>${esc(CATEGORIAS[n.categoria])} · ${esc(fechaBonita(n.fecha))}</small></span>
          <span class="marcas">${n.publicado ? `<span class="marca-e verde">Publicada</span>` : `<span class="marca-e gris">Borrador</span>`}</span>
        </button>`).join("") : `<p class="vacio-p">Todavía no hay nada aquí. Dale “+ Nueva” para publicar la primera.</p>`;
    };
    $("#nc").addEventListener("change", pintar);
    $("#nl").addEventListener("click", (e) => { const f = e.target.closest(".fila"); if (f) navegar(`#noticias/${f.dataset.id}`); });
    pintar();
  }

  async function editarNoticia(param) {
    const nueva = param === "nueva";
    vista.innerHTML = `<p class="cargando">Cargando…</p>`;
    let n = { categoria: filtroNoticias || "noticia", titulo: "", fecha: hoy(), contenido: "", imagen: "", publicado: 1 };
    if (!nueva) {
      n = (await api("/api/admin/noticias")).find((x) => String(x.id) === param);
      if (!n) { vista.innerHTML = `<p class="error-p">Esa noticia no existe. <a href="#noticias">Volver</a></p>`; return; }
    }
    vista.innerHTML = `
      <a class="volver" href="#noticias">← Noticias</a>
      <div class="barra"><h1>${nueva ? "Nueva publicación" : "Editar"}</h1></div>
      <form id="fn" novalidate>
        <section class="tarjeta-f">
          <div class="campos">
            <label class="c">Sección
              <select name="categoria">${Object.entries(CATEGORIAS).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select></label>
            <label class="c">Fecha <input type="date" name="fecha" value="${esc(n.fecha)}" required></label>
            <label class="c ancho">Título * <input name="titulo" value="${esc(n.titulo)}" maxlength="200" required></label>
          </div>
        </section>
        <section class="tarjeta-f">
          <h2>Foto de portada</h2>
          <div class="portada-f">
            <div id="port"></div>
            <div class="botones">
              <button type="button" class="btn-sec" id="subir-port">Subir foto</button>
              <button type="button" class="btn-sec" id="quitar-port">Quitar</button>
            </div>
          </div>
          <p class="ayuda">La foto se achica sola antes de subirse; puedes usar la de tu celular tal cual.</p>
        </section>
        <section class="tarjeta-f">
          <h2>Contenido</h2>
          <div id="ed-n"></div>
        </section>
        <section class="tarjeta-f">
          <label class="casilla"><input type="checkbox" name="publicado" ${n.publicado ? "checked" : ""}> Publicar en el sitio</label>
          <p class="ayuda">Si lo desmarcas se guarda como borrador y no se ve en el sitio.</p>
        </section>
        <div class="botones pie-f">
          <button type="button" class="btn" id="guardar">Guardar</button>
          <a class="btn-sec" href="#noticias">Cancelar</a>
          ${nueva ? "" : `<a class="btn-sec" href="/noticias?id=${n.id}" target="_blank" rel="noopener">Ver en el sitio ↗</a>
          <button type="button" class="btn btn-peligro empuja" id="borrar">Borrar</button>`}
        </div>
      </form>`;
    const form = $("#fn");
    form.categoria.value = n.categoria;
    const editor = crearEditor($("#ed-n"), n.contenido, { placeholder: "Escribe la noticia aquí. Puedes pegar texto de WhatsApp o Word." });
    marcarCambios(form);

    let imagen = n.imagen || "";
    const pintarPortada = () => {
      $("#port").innerHTML = imagen ? `<img src="${esc(imagen)}" alt="Foto de portada">` : `<div class="vacia">Sin foto</div>`;
      $("#quitar-port").hidden = !imagen;
    };
    pintarPortada();
    $("#subir-port").addEventListener("click", async () => {
      const archivo = await elegirArchivo("image/*");
      if (!archivo) return;
      const b = $("#subir-port");
      b.disabled = true; b.textContent = "Subiendo…";
      try { imagen = await subirArchivo(archivo); cambiosSinGuardar = true; pintarPortada(); aviso("Foto lista. No olvides Guardar."); }
      catch (e) { aviso(e.message, true); }
      finally { b.disabled = false; b.textContent = "Subir foto"; }
    });
    $("#quitar-port").addEventListener("click", () => { imagen = ""; cambiosSinGuardar = true; pintarPortada(); });

    $("#guardar").addEventListener("click", conCarga($("#guardar"), async () => {
      const datos = {
        categoria: form.categoria.value, fecha: form.fecha.value, titulo: form.titulo.value,
        contenido: editor.html(), imagen, publicado: form.publicado.checked,
      };
      if (!datos.titulo.trim()) { aviso("Falta el título.", true); return; }
      if (!datos.fecha) { aviso("Falta la fecha.", true); return; }
      const r = nueva
        ? await api("/api/admin/noticias", { method: "POST", body: datos })
        : await api(`/api/admin/noticias/${n.id}`, { method: "PUT", body: datos });
      cambiosSinGuardar = false;
      aviso(datos.publicado ? "Guardado y publicado." : "Guardado como borrador.");
      filtroNoticias = "";
      navegar(nueva ? `#noticias/${r.id}` : "#noticias");
    }));
    if ($("#borrar")) $("#borrar").addEventListener("click", conCarga($("#borrar"), async () => {
      if (!confirm(`¿Borrar "${n.titulo}"? Esto no se puede deshacer.`)) return;
      await api(`/api/admin/noticias/${n.id}`, { method: "DELETE" });
      aviso("Borrada.");
      navegar("#noticias");
    }));
  }

  /* =========================================================
     PÁGINAS (solo administrador)
     ========================================================= */
  async function verPaginas(param) {
    if (param) return editarPagina(param);
    vista.innerHTML = `<p class="cargando">Cargando páginas…</p>`;
    const paginas = await api("/api/admin/paginas");
    vista.innerHTML = `
      <div class="barra"><h1>Páginas</h1></div>
      <p class="cuenta">Textos institucionales del sitio (Quiénes somos, Profesionales, FAQ, Contacto…).</p>
      <div class="lista" id="pl">${paginas.map((p) => `
        <button type="button" class="fila" data-slug="${esc(p.slug)}">
          <span class="txt"><strong>${esc(p.titulo)}</strong><small>/pagina?p=${esc(p.slug)}</small></span>
        </button>`).join("")}</div>`;
    $("#pl").addEventListener("click", (e) => { const f = e.target.closest(".fila"); if (f) navegar(`#paginas/${f.dataset.slug}`); });
  }

  async function editarPagina(slug) {
    vista.innerHTML = `<p class="cargando">Cargando…</p>`;
    const p = await api(`/api/admin/paginas/${encodeURIComponent(slug)}`);
    vista.innerHTML = `
      <a class="volver" href="#paginas">← Páginas</a>
      <form id="fp" novalidate>
        <section class="tarjeta-f">
          <label class="c">Título <input name="titulo" value="${esc(p.titulo)}" maxlength="150"></label>
        </section>
        <section class="tarjeta-f"><div id="ed-p"></div></section>
        <div class="botones pie-f">
          <button type="button" class="btn" id="guardar">Guardar</button>
          <a class="btn-sec" href="#paginas">Cancelar</a>
          <a class="btn-sec" href="/pagina?p=${esc(p.slug)}" target="_blank" rel="noopener">Ver en el sitio ↗</a>
        </div>
      </form>`;
    const form = $("#fp");
    const editor = crearEditor($("#ed-p"), p.contenido);
    marcarCambios(form);
    $("#guardar").addEventListener("click", conCarga($("#guardar"), async () => {
      await api(`/api/admin/paginas/${encodeURIComponent(p.slug)}`, { method: "PUT", body: { titulo: form.titulo.value, contenido: editor.html() } });
      cambiosSinGuardar = false;
      aviso("Página guardada. En unos minutos se ve en el sitio.");
    }));
  }

  /* =========================================================
     USUARIOS (solo administrador)
     ========================================================= */
  async function verUsuarios() {
    vista.innerHTML = `<p class="cargando">Cargando usuarios…</p>`;
    const usuarios = await api("/api/admin/usuarios");
    vista.innerHTML = `
      <div class="barra"><h1>Usuarios</h1></div>
      <section class="tarjeta-f">
        <h2>Dar acceso a alguien</h2>
        <form id="fu" class="u-alta" novalidate>
          <label class="c">Correo <input type="email" name="email" required placeholder="correo@ejemplo.com" autocomplete="off"></label>
          <label class="c">Nombre <input name="nombre" maxlength="80" placeholder="Opcional"></label>
          <label class="c">Puede
            <select name="rol">
              <option value="editor">Editor (grupos y noticias)</option>
              <option value="admin">Administrador (todo)</option>
            </select></label>
          <button type="submit" class="btn" id="alta">Dar acceso</button>
        </form>
        <p class="ayuda" style="margin-top:10px">Se crea una <strong>contraseña temporal</strong> que le mandas a la persona (por WhatsApp, por ejemplo). La primera vez que entre a <strong>aabcn02.org/admin</strong> tendrá que cambiarla por una suya.</p>
      </section>
      <div id="temporal"></div>
      <div class="lista" id="ul">${usuarios.map((u) => `
        <div class="fila" style="cursor:default">
          <span class="txt"><strong>${esc(u.email)}</strong><small>${esc(u.nombre || "")}</small></span>
          <span class="marcas"><span class="marca-e ${u.rol === "admin" ? "" : "gris"}">${u.rol === "admin" ? "Administrador" : "Editor"}</span>
          ${u.cambiar_clave && u.email !== YO.email ? `<span class="marca-e alerta">No ha entrado</span>` : ""}
          ${u.email === YO.email ? `<span class="marca-e verde">Tú</span>` : `<button type="button" class="btn-mini" data-restablecer="${esc(u.email)}">Nueva contraseña</button>
            <button type="button" class="btn-mini" data-quitar="${esc(u.email)}">Quitar acceso</button>`}</span>
        </div>`).join("")}</div>`;
    const form = $("#fu");
    form.addEventListener("submit", (e) => e.preventDefault());
    $("#alta").addEventListener("click", conCarga($("#alta"), async () => {
      const f = Object.fromEntries(new FormData(form));
      const r = await api("/api/admin/usuarios", { method: "POST", body: f });
      await verUsuarios();
      mostrarTemporal(r.email, r.temporal);
    }));
    $("#ul").addEventListener("click", async (e) => {
      const rb = e.target.closest("[data-restablecer]");
      if (rb) {
        if (!confirm(`¿Crear una contraseña temporal nueva para ${rb.dataset.restablecer}? La anterior dejará de funcionar.`)) return;
        try {
          const r = await api(`/api/admin/usuarios/${encodeURIComponent(rb.dataset.restablecer)}`, { method: "PATCH" });
          await verUsuarios();
          mostrarTemporal(r.email, r.temporal);
        } catch (err) { aviso(err.message, true); }
        return;
      }
      const b = e.target.closest("[data-quitar]");
      if (!b) return;
      if (!confirm(`¿Quitarle el acceso al panel a ${b.dataset.quitar}?`)) return;
      try {
        await api(`/api/admin/usuarios/${encodeURIComponent(b.dataset.quitar)}`, { method: "DELETE" });
        aviso("Acceso quitado.");
        verUsuarios();
      } catch (err) { aviso(err.message, true); }
    });
  }

  function mostrarTemporal(email, temporal) {
    const msg = `Hola, ya tienes acceso al panel del sitio de AA Área 64 Región 02.\nEntra a https://aabcn02.org/admin\nCorreo: ${email}\nContraseña temporal: ${temporal}\nAl entrar te pedirá cambiarla por una tuya.`;
    $("#temporal").innerHTML = `
      <section class="tarjeta-f clave-temp">
        <h2>Contraseña temporal de ${esc(email)}</h2>
        <p class="clave-grande">${esc(temporal)}</p>
        <p class="ayuda">Mándasela a la persona. Solo se muestra esta vez; si se pierde, dale “Nueva contraseña”.</p>
        <div class="botones">
          <button type="button" class="btn" id="copiar-msg">Copiar mensaje para WhatsApp</button>
          <a class="btn-sec" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(msg)}">Abrir WhatsApp</a>
        </div>
      </section>`;
    $("#copiar-msg").addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(msg); aviso("Mensaje copiado."); }
      catch { prompt("Copia este mensaje:", msg); }
    });
    $("#temporal").scrollIntoView({ behavior: "smooth", block: "center" });
  }

  /* =========================================================
     MI CONTRASEÑA (todos)
     ========================================================= */
  function verClave(obligatorio = false) {
    vista.innerHTML = `
      ${obligatorio ? "" : `<a class="volver" href="#grupos">← Regresar</a>`}
      <div class="caja-entrar">
        <h1>${obligatorio ? "Crea tu contraseña" : "Mi contraseña"}</h1>
        ${obligatorio ? `<p class="ayuda">Entraste con una contraseña temporal. Ponle una tuya para seguir (mínimo 8 caracteres). Guárdala bien.</p>` : ""}
        <form id="fc" novalidate>
          ${obligatorio ? "" : `<label class="c">Contraseña actual <input type="password" name="actual" autocomplete="current-password" required></label>`}
          <label class="c">Contraseña nueva <input type="password" name="nueva" autocomplete="new-password" minlength="8" required></label>
          <label class="c">Repite la contraseña nueva <input type="password" name="repite" autocomplete="new-password" minlength="8" required></label>
          <label class="casilla"><input type="checkbox" id="ver-c"> Mostrar contraseñas</label>
          <button type="submit" class="btn" id="g-clave">Guardar contraseña</button>
        </form>
      </div>`;
    const form = $("#fc");
    $("#ver-c").addEventListener("change", (e) => form.querySelectorAll("input[type=password], input[data-pw]").forEach((i) => {
      i.dataset.pw = "1"; i.type = e.target.checked ? "text" : "password";
    }));
    form.addEventListener("submit", (e) => { e.preventDefault(); $("#g-clave").click(); });
    $("#g-clave").addEventListener("click", conCarga($("#g-clave"), async () => {
      const f = Object.fromEntries(new FormData(form));
      if ((f.nueva || "").length < 8) { aviso("La contraseña debe tener al menos 8 caracteres.", true); return; }
      if (f.nueva !== f.repite) { aviso("Las dos contraseñas nuevas no coinciden.", true); return; }
      await api("/api/admin/clave", { method: "POST", body: { actual: f.actual, nueva: f.nueva } });
      aviso("Contraseña guardada.");
      if (obligatorio) setTimeout(() => location.reload(), 800);
      else navegar("#grupos");
    }));
  }

  /* =========================================================
     ENTRAR (sin sesión)
     ========================================================= */
  function verEntrar() {
    document.getElementById("sesion").hidden = true;
    vista.innerHTML = `
      <div class="caja-entrar">
        <h1>Entrar al panel</h1>
        <form id="fe" novalidate>
          <label class="c">Correo <input type="email" name="email" autocomplete="username" required autofocus></label>
          <label class="c">Contraseña <input type="password" name="clave" autocomplete="current-password" required></label>
          <label class="casilla"><input type="checkbox" id="ver-e"> Mostrar contraseña</label>
          <button type="submit" class="btn" id="entrar">Entrar</button>
        </form>
        <p class="ayuda">¿Olvidaste tu contraseña? Pídele al administrador del sitio que te dé una nueva.</p>
      </div>`;
    const form = $("#fe");
    $("#ver-e").addEventListener("change", (e) => { form.clave.type = e.target.checked ? "text" : "password"; });
    form.addEventListener("submit", (e) => { e.preventDefault(); $("#entrar").click(); });
    $("#entrar").addEventListener("click", conCarga($("#entrar"), async () => {
      const f = Object.fromEntries(new FormData(form));
      if (!f.email || !f.clave) { aviso("Escribe tu correo y tu contraseña.", true); return; }
      await api("/api/acceso/entrar", { method: "POST", body: f });
      location.reload();
    }));
  }

  /* ---------- Arranque ---------- */
  (async function () {
    document.getElementById("salir").addEventListener("click", async () => {
      if (!confirmarSalir()) return;
      cambiosSinGuardar = false;
      try { await api("/api/acceso/salir", { method: "POST" }); } catch { /* igual se sale */ }
      location.href = "/admin/";
    });
    try {
      YO = await api("/api/admin/yo");
    } catch (e) {
      if (e.status === 401) { verEntrar(); return; }
      vista.innerHTML = `<div class="error-p"><p><strong>No se pudo entrar al panel.</strong></p><p>${esc(e.message)}</p></div>`;
      return;
    }
    document.getElementById("quien").textContent = `${YO.email} · ${YO.rol === "admin" ? "Administrador" : "Editor"}`;
    document.getElementById("sesion").hidden = false;
    if (YO.cambiar_clave) { verClave(true); return; }
    document.querySelectorAll(".pestanas a[data-sec]").forEach((a) => {
      if (a.dataset.sec in YO.puede) a.hidden = !YO.puede[a.dataset.sec];
    });
    document.getElementById("pestanas").hidden = false;
    hashAnterior = location.hash;
    ir();
  })();
})();
