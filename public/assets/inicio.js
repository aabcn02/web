// Últimas 3 publicaciones en el Inicio (solo si hay)
fetch("/api/noticias?ultimas=3")
  .then((r) => (r.ok ? r.json() : []))
  .then((l) => {
    if (!Array.isArray(l) || !l.length) return;
    document.getElementById("ultimas-lista").innerHTML = l.map(tarjetaNoticia).join("");
    document.getElementById("ultimas").hidden = false;
  })
  .catch(() => {});
