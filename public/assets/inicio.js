// Últimas 3 publicaciones en el Inicio (solo si hay)
fetch("/api/noticias?ultimas=3")
  .then((r) => (r.ok ? r.json() : []))
  .then((l) => {
    if (!Array.isArray(l) || !l.length) return;
    document.getElementById("ultimas-lista").innerHTML = l.map(tarjetaNoticia).join("");
    document.getElementById("ultimas").hidden = false;
  })
  .catch(() => {});

// Reflexión del día: el video directo en el Inicio (solo si está configurada)
fetch("/api/reflexion")
  .then((r) => (r.ok ? r.json() : null))
  .then((x) => {
    if (!x || !x.titulo || !/^[\w-]{6,20}$/.test(x.video || "")) return;
    document.getElementById("ri-fecha").textContent = `Reflexión del día · ${x.fecha}`;
    document.getElementById("ri-titulo").textContent = x.titulo;
    const f = document.createElement("iframe");
    f.src = `https://www.youtube-nocookie.com/embed/${x.video}?rel=0`;
    f.title = x.titulo;
    f.loading = "lazy";
    f.allow = "accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    f.allowFullscreen = true;
    f.referrerPolicy = "strict-origin-when-cross-origin";
    document.getElementById("ri-video").replaceChildren(f);
    document.getElementById("reflexion-inicio").hidden = false;
  })
  .catch(() => {});
