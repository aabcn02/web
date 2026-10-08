// Reflexión del día (video de YouTube según la fecha de hoy)
(async function () {
  const titulo = document.getElementById("r-titulo");
  const fecha = document.getElementById("r-fecha");
  const video = document.getElementById("r-video");
  const texto = document.getElementById("r-texto");
  try {
    const r = await fetch("/api/reflexion");
    if (!r.ok) throw new Error();
    const x = await r.json();
    if (!/^[\w-]{6,20}$/.test(x.video || "")) throw new Error();
    fecha.textContent = `Reflexión del día · ${x.fecha}`;
    titulo.textContent = x.titulo;
    document.title = `${x.titulo} · AA Área 64 Región 02`;
    const f = document.createElement("iframe");
    f.src = `https://www.youtube-nocookie.com/embed/${x.video}?rel=0`;
    f.title = x.titulo;
    f.loading = "lazy";
    f.allow = "accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    f.allowFullscreen = true;
    f.referrerPolicy = "strict-origin-when-cross-origin";
    video.replaceChildren(f);
    texto.textContent = x.descripcion || "";
  } catch {
    titulo.textContent = "Reflexión del día";
    video.remove();
    texto.textContent = "No se pudo cargar la reflexión en este momento. Intenta de nuevo más tarde.";
  }
})();
