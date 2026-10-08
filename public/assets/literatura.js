// Catálogo de Literatura de AA (Central Mexicana de Servicios Generales de AA, A.C.)
// Para agregar un título: una línea más con [código, título, descripción breve].
// La portada se toma de aamexico.org con el código (ej. 101.png).
const LITERATURA = [
  ["101", "Alcohólicos Anónimos (texto básico)", "El “Libro Grande”: presenta el programa de recuperación de AA, publicado desde 1939."],
  ["102", "Alcohólicos Anónimos (con historiales)", "Incluye doce historiales de alcohólicos mexicanos que muestran que el programa funciona."],
  ["103", "Alcohólicos Anónimos (de bolsillo)", "Edición compacta del Libro Grande, ideal para llevar a todas partes."],
  ["104", "Alcohólicos Anónimos (letra grande)", "Edición pensada para personas con dificultad visual."],
  ["106", "El Manual de Servicio de AA con Doce Conceptos", "Recurso esencial para los miembros que participan en la estructura de servicio."],
  ["107", "AA llega a su mayoría de edad", "Relato histórico de los primeros veinte años de AA y su Convención de 1955."],
  ["108", "Antología", "Compendio que reúne el Libro Grande, Doce Pasos y Doce Tradiciones y varios folletos."],
  ["109", "Como lo ve Bill", "Cientos de extractos de nuestra literatura sobre la forma de vida de AA."],
  ["110", "Viviendo sobrio", "Sugerencias prácticas escuchadas en reuniones para mantenerse sobrio día a día."],
  ["111", "Llegamos a creer", "Las experiencias de 75 miembros de AA sobre el despertar espiritual."],
  ["112", "Doce Pasos y Doce Tradiciones", "Comentario interpretativo del programa escrito por uno de los cofundadores."],
  ["113", "Doce Pasos y Doce Tradiciones (letra grande)", "Versión en letra grande del comentario sobre los Pasos y las Tradiciones."],
  ["114", "El Dr. Bob y los buenos veteranos", "La vida del cofundador y de los pioneros de AA en el medio oeste americano."],
  ["115", "De las tinieblas hacia la luz", "Historiales de recuperación: del sufrimiento del alcoholismo a la sobriedad."],
  ["116", "Transmítelo", "La historia de Bill W. y de cómo el mensaje de AA llegó al mundo."],
  ["117", "Reflexiones diarias", "Una reflexión para cada día del año, escrita por miembros para miembros."],
  ["119", "Plan Nacional de Literatura", "Guía de estudio para profundizar en los principios y fundamentos de AA."],
  ["120", "Alcohólicos Anónimos en México", "Historia del origen y desarrollo de la comunidad de AA en nuestro país."],
  ["121", "Alcohólicos Anónimos en México, 2.ª parte", "Continuación de la historia de la comunidad mexicana de AA."],
  ["131", "Libro de trabajo de comités de Tratamiento", "Guía práctica para el servicio de los comités de Tratamiento."],
  ["132", "Libro de trabajo de Información Pública", "Guía para llevar el mensaje de AA a la comunidad y a los medios."],
  ["133", "Libro de trabajo de Correccionales", "Guía para llevar el mensaje a las instituciones correccionales."],
  ["134", "Libro de trabajo del CCCP", "Guía para la cooperación de AA con la comunidad profesional."],
  ["135", "Experiencia, fortaleza y Esperanza", "Historiales de las primeras ediciones del Libro Grande."],
  ["202", "Esto es AA", "Introducción breve al programa para quien se acerca por primera vez."],
  ["203", "El grupo de AA donde todo empieza", "Explica cómo funciona un grupo de AA y cómo se sostiene."],
  ["204", "El artículo de Jack Alexander acerca de AA", "El reportaje de 1941 que dio a conocer a AA ante el gran público."],
  ["205", "¿Hay un alcohólico en su vida?", "Orientación para familiares y amigos de una persona con problemas de alcohol."],
  ["212", "Tres charlas a sociedades médicas", "Conferencias de Bill W. ante profesionales de la medicina."],
  ["213", "Preguntas y respuestas sobre el apadrinamiento", "La experiencia compartida de AA responde 34 preguntas sobre apadrinar."],
  ["215", "La tradición de AA: cómo se desarrolló", "Bill W. relata cómo surgieron las Doce Tradiciones."],
  ["216", "Los jóvenes y AA", "Experiencias de jóvenes que encontraron la recuperación en AA."],
  ["222", "Las Doce Tradiciones ilustradas", "Introducción ilustrada a las Tradiciones que mantienen unida a la comunidad."],
  ["225", "Carta a un preso que puede ser un alcohólico", "Mensaje de esperanza para quien está privado de la libertad."],
  ["226", "Si usted es un profesional… AA quiere trabajar con usted", "Cómo AA puede colaborar con el trabajo de los profesionales."],
  ["227", "Comprendiendo el anonimato", "Qué significa el anonimato y por qué es la base espiritual de AA."],
  ["229", "¿Sabes cuál es la causa de tus sufrimientos?", "Preguntas para reconocer si la bebida se ha vuelto un problema."],
  ["230", "Hablando en reuniones de no-alcohólicos", "Sugerencias para informar sobre AA fuera de la comunidad."],
  ["231", "AA en las instituciones correccionales", "Cómo funciona AA dentro de los centros penitenciarios."],
  ["236", "Manual de comités de Literatura", "Cómo favorecer el conocimiento, uso y difusión de la literatura de AA."],
  ["237", "¿Se cree usted diferente?", "Historiales de miembros de orígenes y circunstancias muy distintas."],
  ["239", "Problemas diferentes del alcohol", "La postura de AA frente a otras adicciones y su propósito único."],
  ["242", "Es mejor que estar sentado en una celda", "Testimonios de recuperación de quienes pasaron por prisión."],
  ["245", "Los Doce Pasos (ilustrados)", "Introducción ilustrada al método de recuperación que nos legaron nuestros antecesores."],
  ["246", "Manual de oficinas intergrupales", "Origen, funcionamiento y responsabilidades de una oficina intergrupal."],
  ["249", "Doce Conceptos ilustrados", "Introducción ilustrada a los Conceptos para el Servicio Mundial."],
  ["250", "¿Cómo llevar la información de AA al profesional?", "Guía para presentar AA ante la comunidad profesional."],
  ["260", "AA en IC con historiales de igual a igual", "Historiales de recuperación compartidos entre personas internas."],
  ["261", "El alcoholismo en los jóvenes (ilustrado)", "Folleto ilustrado sobre el alcoholismo en la juventud."],
  ["269", "El automantenimiento", "Por qué AA se sostiene con sus propias contribuciones (Séptima Tradición)."],
  ["271", "Los alcohólicos LGBTQ en AA", "Trece experiencias de miembros de la comunidad LGBTQ en AA."],
  ["272", "Accesibilidad para todos los alcohólicos", "Experiencias de miembros con retos visuales, auditivos o confinados en casa."],
  ["273", "Hay un bebedor problema en el lugar de trabajo", "Orientación para acercar a AA a empleados con problemas de alcohol."],
  ["274", "Las mujeres en AA", "Experiencia, fortaleza y esperanza de doce mujeres en recuperación."],
  ["275", "Preguntas frecuentes acerca de AA", "Respuestas breves y claras para quien se acerca por primera vez."],
  ["276", "El miembro de AA, los medicamentos y otras drogas", "Orientación para miembros que requieren tratamiento médico o psiquiátrico."],
  ["277", "AA como un recurso para los profesionales de la salud", "Cómo AA complementa el trabajo del personal de salud."],
  ["278", "AA para el alcohólico de edad avanzada", "Ocho historias de recuperación después de los 60 años: nunca es demasiado tarde."],
  ["279", "AA en los entornos de tratamiento", "Cómo colabora AA con los centros de tratamiento."],
  ["280", "Uniendo las orillas", "Acompañar al alcohólico que sale de una institución en su llegada a AA."],
  ["281", "RSG Representante de Servicios Generales", "Responsabilidades del RSG, el enlace del grupo con la totalidad de AA."],
  ["282", "Una breve guía a AA", "Información general sobre AA en lenguaje sencillo."],
  ["283", "El punto de vista de un miembro de AA sobre la comunidad", "AA explicada desde la mirada de uno de sus propios miembros."],
  ["284", "Sugerencias para coordinar reuniones de principiantes", "Cómo organizar reuniones dirigidas a los recién llegados."],
  ["285", "Mujeres Hispanas en AA", "Historias de mujeres hispanas que encontraron la sobriedad en AA."],
  ["286", "Autodiagnóstico en Braille", "Cuestionario de autodiagnóstico en Braille para personas con discapacidad visual."]
];
const PORTADAS = "https://aamexico.org/assete/literatura/portadas/";

(function () {
  const grid = document.getElementById("lit-grid");
  const buscar = document.getElementById("lit-buscar");
  const total = document.getElementById("lit-total");
  const vacio = document.getElementById("lit-vacio");

  LITERATURA.forEach(([codigo, titulo, desc]) => {
    const card = document.createElement("article");
    card.className = "libro";
    card.dataset.buscar = normal(`${codigo} ${titulo} ${desc}`);
    const portada = document.createElement("div");
    portada.className = "libro-portada";
    const img = document.createElement("img");
    img.src = `${PORTADAS}${encodeURIComponent(codigo)}.png`;
    img.alt = `Portada: ${titulo}`;
    img.loading = "lazy";
    img.addEventListener("error", () => { portada.classList.add("sin-portada"); img.remove(); });
    portada.appendChild(img);
    const info = document.createElement("div");
    info.className = "libro-info";
    const h = document.createElement("h2"); h.textContent = titulo;
    const p = document.createElement("p"); p.textContent = desc;
    const c = document.createElement("span"); c.className = "libro-codigo"; c.textContent = `Código ${codigo}`;
    info.append(h, p, c);
    card.append(portada, info);
    grid.appendChild(card);
  });

  function filtrar() {
    const q = normal(buscar.value.trim());
    const palabras = q ? q.split(/\s+/) : [];
    let n = 0;
    for (const card of grid.children) {
      const ok = palabras.every((w) => card.dataset.buscar.includes(w));
      card.hidden = !ok;
      if (ok) n++;
    }
    vacio.hidden = n > 0;
    total.textContent = `${n} de ${LITERATURA.length} títulos`;
  }
  buscar.addEventListener("input", filtrar);
  buscar.addEventListener("keydown", (e) => { if (e.key === "Enter") buscar.blur(); });
  filtrar();
})();
