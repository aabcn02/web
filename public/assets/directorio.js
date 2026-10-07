(async function () {
  const lista = document.getElementById("lista");
  const total = document.getElementById("total");

  function tarjeta(g) {
    const llegar = urlComoLlegar(g);
    const ubic = [
      tieneCoords(g) ? `<a href="/mapa#g-${g.id}">Ver en mapa</a>` : "",
      llegar ? `<a href="${esc(llegar)}" target="_blank" rel="noopener">Cómo llegar</a>` : "",
    ].filter(Boolean).join(" · ") || "—";

    const fila = (dt, dd) => `<div><dt>${dt}</dt><dd>${dd}</dd></div>`;
    return `<article class="tarjeta">
      <div class="t-cab"><span>Distrito</span><span>${esc(g.distrito)}</span></div>
      <dl>
        ${fila("Grupo", esc(g.grupo))}
        ${fila("Ciudad", esc(g.ciudad))}
        ${g.direccion ? fila("Dirección", esc(g.direccion)) : ""}
        ${fila("Ubicación", ubic)}
        ${fila("Terapia", esc(g.terapia || "—"))}
        ${fila("Personas", esc(g.personas || "—"))}
        ${fila("Horario", esc(g.horario || "—"))}
      </dl>
    </article>`;
  }

  function pintar(grupos) {
    total.innerHTML = `Total de grupos: <strong>${grupos.length}</strong>`;
    lista.innerHTML = grupos.length
      ? grupos.map(tarjeta).join("")
      : `<p class="vacio">No hay grupos con esos filtros.</p>`;
  }

  try {
    const grupos = await cargarGrupos();
    prepararFiltros(grupos, { ciudad: "f-ciudad", distrito: "f-distrito", grupo: "f-grupo", ubic: "f-ubic", limpiar: "limpiar" }, pintar);
  } catch (e) {
    total.textContent = "";
    lista.innerHTML = `<p class="error">${esc(e.message)} Intenta de nuevo en un momento.</p>`;
  }
})();
