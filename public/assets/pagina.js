// Página temporal: muestra el título de la sección mientras construimos el módulo de Páginas.
(function () {
  const p = new URLSearchParams(location.search).get("p") || "";
  let titulo = "Sección";
  MENU.forEach((m) => (m.sub || [m]).forEach((s) => {
    if (s.u === `/pagina?p=${p}`) titulo = s.t;
  }));
  document.getElementById("titulo").textContent = titulo;
  document.title = `${titulo} · AA Área 64 Región 02`;
})();
