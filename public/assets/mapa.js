(async function () {
  const total = document.getElementById("total");
  const nota = document.getElementById("nota-mapa");

  // Mapa centrado en Mexicali
  const mapa = L.map("mapa", { scrollWheelZoom: false }).setView([32.6245, -115.4523], 12);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(mapa);
  mapa.on("focus", () => mapa.scrollWheelZoom.enable());
  mapa.on("blur", () => mapa.scrollWheelZoom.disable());

  const icono = L.divIcon({ className: "", html: '<div class="pin"></div>', iconSize: [30, 30], iconAnchor: [15, 30], popupAnchor: [0, -28] });
  const capa = L.layerGroup().addTo(mapa);
  const marcadores = new Map();

  function globo(g) {
    const llegar = urlComoLlegar(g);
    return `<div class="globo">
      <strong>${esc(g.grupo)}</strong>
      <span>Distrito ${esc(g.distrito)} · ${esc(g.ciudad)}</span>
      ${g.direccion ? `<span>${esc(g.direccion)}</span>` : ""}
      ${g.horario ? `<span>${esc(g.horario)}</span>` : ""}
      <span>${esc([g.terapia, g.personas].filter(Boolean).join(" · "))}</span>
      ${llegar ? `<a href="${esc(llegar)}" target="_blank" rel="noopener">Cómo llegar</a>` : ""}
    </div>`;
  }

  let primeraVez = true;
  function pintar(grupos) {
    capa.clearLayers();
    marcadores.clear();
    const conCoords = grupos.filter(tieneCoords);
    conCoords.forEach((g) => {
      const m = L.marker([g.lat, g.lng], { icon: icono, title: g.grupo }).bindPopup(globo(g));
      m.addTo(capa);
      marcadores.set(String(g.id), m);
    });
    total.innerHTML = `Total de grupos: <strong>${grupos.length}</strong>`;
    const sinMapa = grupos.length - conCoords.length;
    nota.textContent = sinMapa > 0 ? `${sinMapa} grupo(s) todavía no tienen ubicación en el mapa; búscalos en el Directorio.` : "";

    if (conCoords.length) {
      const limites = L.latLngBounds(conCoords.map((g) => [g.lat, g.lng]));
      mapa.fitBounds(limites, { padding: [40, 40], maxZoom: 15 });
    }

    // Si llegaron desde el Directorio ("Ver en mapa"), abre ese grupo
    if (primeraVez) {
      primeraVez = false;
      const id = (location.hash.match(/^#g-(\d+)$/) || [])[1];
      const m = id && marcadores.get(id);
      if (m) { mapa.setView(m.getLatLng(), 16); m.openPopup(); }
    }
  }

  try {
    const grupos = await cargarGrupos();
    prepararFiltros(grupos, { ciudad: "f-ciudad", distrito: "f-distrito", grupo: "f-grupo", ubic: "f-ubic", limpiar: "limpiar" }, pintar);
  } catch (e) {
    total.innerHTML = `<span class="error" style="display:block">${esc(e.message)} Intenta de nuevo en un momento.</span>`;
  }
})();
