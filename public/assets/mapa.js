(async function () {
  const total = document.getElementById("total");
  const nota = document.getElementById("nota-mapa");

  // Arranca mostrando Mexicali; luego se acomoda a los pines que haya
  const mapa = L.map("mapa", { scrollWheelZoom: false }).setView([32.6245, -115.4523], 11);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(mapa);
  mapa.on("focus", () => mapa.scrollWheelZoom.enable());
  mapa.on("blur", () => mapa.scrollWheelZoom.disable());

  // Pin con el logo de AA si existe /assets/pin.png; si no, el pin azul
  const pinImg = new Image();
  const iconoAzul = L.divIcon({ className: "", html: '<div class="pin"></div>', iconSize: [30, 30], iconAnchor: [15, 30], popupAnchor: [0, -28] });
  let icono = iconoAzul;
  await new Promise((listo) => {
    pinImg.onload = () => { icono = L.icon({ iconUrl: "/assets/pin.png", iconSize: [40, 40], iconAnchor: [20, 40], popupAnchor: [0, -38] }); listo(); };
    pinImg.onerror = listo;
    pinImg.src = "/assets/pin.png";
  });

  const capa = L.layerGroup().addTo(mapa);
  const marcadores = new Map();

  function globo(g) {
    const llegar = urlComoLlegar(g);
    return `<div class="globo">
      <strong>${esc(g.grupo)}</strong>
      <span>Distrito ${esc(g.distrito)} · ${esc(g.ciudad)}${g.idioma && normal(g.idioma) !== "espanol" ? ` · ${esc(g.idioma)}` : ""}</span>
      ${domicilio(g) ? `<span>${esc(domicilio(g))}</span>` : ""}
      ${g.referencia ? `<span class="ref">${esc(g.referencia)}</span>` : ""}
      ${g.horario ? `<span><b>Horario:</b> ${esc(g.horario)}</span>` : ""}
      ${g.telefono ? `<span><b>Tel:</b> ${telefonosHTML(g)}</span>` : ""}
      ${llegar ? `<a class="llegar" href="${esc(llegar)}" target="_blank" rel="noopener">Cómo llegar</a>` : ""}
      ${botonesGrupo(g)}
    </div>`;
  }

  function pintar(grupos, info) {
    capa.clearLayers();
    marcadores.clear();
    const conCoords = grupos.filter(tieneCoords);
    conCoords.forEach((g) => {
      const m = L.marker([g.lat, g.lng], { icon: icono, title: g.grupo }).bindPopup(globo(g), { maxWidth: 290 });
      m.addTo(capa);
      marcadores.set(String(g.id), m);
    });
    total.innerHTML = textoTotal(grupos, info);
    const sinMapa = grupos.length - conCoords.length;
    nota.innerHTML = sinMapa > 0
      ? `${sinMapa} grupo(s) todavía no tienen ubicación en el mapa; búscalos en el <a href="/directorio">Directorio</a>.`
      : "";

    if (conCoords.length === 1) {
      const m = marcadores.get(String(conCoords[0].id));
      mapa.setView(m.getLatLng(), 16);
      m.openPopup();
    } else if (conCoords.length) {
      mapa.fitBounds(L.latLngBounds(conCoords.map((g) => [g.lat, g.lng])), { padding: [40, 40], maxZoom: 15 });
    }
  }

  try {
    const grupos = await cargarGrupos();
    // Links viejos tipo /mapa#g-12 → /mapa?id=12
    const viejo = (location.hash.match(/^#g-(\d+)$/) || [])[1];
    if (viejo) history.replaceState(null, "", `${location.pathname}?id=${viejo}`);
    prepararFiltros(grupos, { ciudad: "f-ciudad", distrito: "f-distrito", buscar: "f-buscar", limpiar: "limpiar" }, pintar);
  } catch (e) {
    total.innerHTML = `<span class="error" style="display:block">${esc(e.message)} Intenta de nuevo en un momento.</span>`;
  }
})();
