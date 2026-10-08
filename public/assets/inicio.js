// Últimas 3 publicaciones en el Inicio (solo si hay)
fetch("/api/noticias?ultimas=3")
  .then((r) => (r.ok ? r.json() : []))
  .then((l) => {
    if (!Array.isArray(l) || !l.length) return;
    document.getElementById("ultimas-lista").innerHTML = l.map(tarjetaNoticia).join("");
    document.getElementById("ultimas").hidden = false;
  })
  .catch(() => {});

// Reflexión del día (solo si está configurada)
fetch("/api/reflexion")
  .then((r) => (r.ok ? r.json() : null))
  .then((x) => {
    if (!x || !x.titulo) return;
    document.getElementById("ri-fecha").textContent = `Reflexión del día · ${x.fecha}`;
    document.getElementById("ri-titulo").textContent = x.titulo;
    document.getElementById("reflexion-inicio").hidden = false;
  })
  .catch(() => {});
