(async function () {
  const lista = document.getElementById("lista");
  const total = document.getElementById("total");

  function tarjeta(g) {
    const llegar = urlComoLlegar(g);
    const ubic = [
      tieneCoords(g) ? `<a href="/mapa?id=${esc(g.id)}">Ver en mapa</a>` : "",
      llegar ? `<a href="${esc(llegar)}" target="_blank" rel="noopener">Cómo llegar</a>` : "",
    ].filter(Boolean).join(" · ") || "—";

    const fila = (dt, dd) => `<div><dt>${dt}</dt><dd>${dd}</dd></div>`;
    const idioma = g.idioma && normal(g.idioma) !== "espanol" ? `<span class="etiqueta">${esc(g.idioma)}</span>` : "";
    return `<article class="tarjeta">
      <div class="t-cab"><span>Distrito ${esc(g.distrito)}</span>${idioma}</div>
      <h2 class="t-nombre">${esc(g.grupo)}</h2>
      <dl>
        ${fila("Ciudad", esc(g.ciudad))}
        ${domicilio(g) ? fila("Dirección", esc(domicilio(g))) : ""}
        ${g.referencia ? fila("Referencia", esc(g.referencia)) : ""}
        ${fila("Ubicación", ubic)}
        ${fila("Horario", esc(g.horario || "—"))}
        ${g.telefono ? fila("Teléfono", telefonosHTML(g)) : ""}
        ${fila("Terapia", esc(g.terapia || "—"))}
        ${fila("Personas", esc(g.personas || "—"))}
      </dl>
      ${botonesGrupo(g)}
    </article>`;
  }

  function pintar(grupos, info) {
    total.innerHTML = textoTotal(grupos, info);
    lista.innerHTML = grupos.length
      ? grupos.map(tarjeta).join("")
      : `<p class="vacio">No hay grupos con esos filtros.</p>`;
  }

  try {
    const grupos = await cargarGrupos();
    prepararFiltros(grupos, { ciudad: "f-ciudad", distrito: "f-distrito", buscar: "f-buscar", limpiar: "limpiar" }, pintar);
  } catch (e) {
    total.textContent = "";
    lista.innerHTML = `<p class="error">${esc(e.message)} Intenta de nuevo en un momento.</p>`;
  }
})();
