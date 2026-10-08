"""Convierte el export de Squarespace (WordPress .xml) en paginas.sql para el sitio de Mexicali.

Uso:  python3 herramientas/squarespace_a_sql.py export.xml > cargar-paginas.sql
Toma solo las páginas institucionales, limpia el HTML de Squarespace (deja títulos, párrafos,
listas, negritas, links e imágenes) y cambia los datos de Tijuana por los de Mexicali.
"""
import html
import re
import sys
import xml.etree.ElementTree as ET
from html.parser import HTMLParser

NS = {"wp": "http://wordpress.org/export/1.2/", "content": "http://purl.org/rss/1.0/modules/content/"}

# slug en Squarespace -> (slug en Mexicali, título)
PAGINAS = {
    "que-es-aa": ("que-es-aa", "¿Qué es AA?"),
    "aa-mexico": ("aa-en-mexico", "AA en México"),
    "osg": ("osg", "¿Qué es la OSG?"),
    "comites-de-servicio": ("comites", "Comités de servicio"),
    "comite-de-agenda": ("comite-agenda", "Comité de Agenda"),
    "archivos-histricos": ("comite-archivos-historicos", "Comité de Archivos Históricos"),
    "ccp": ("comite-ccp", "Comité de Cooperación con la Comunidad Profesional (C.C.C.P.)"),
    "comite-de-finanzas": ("comite-finanzas", "Comité de Finanzas"),
    "cip": ("comite-cip", "Comité de Información Pública (C.I.P.)"),
    "cic": ("comite-cic", "Comité de Instituciones Correccionales (C.I.C.)"),
    "literatura": ("comite-literatura", "Comité de Literatura"),
    "plenitud": ("comite-plenitud", "Comité de Plenitud"),
    "cta": ("comite-cta", "Comité de Tratamiento y Accesibilidades (C.T.A.)"),
    "profesionales": ("profesionales", "Profesionales"),
    "cartas": ("cartas", "Cartas"),
    "prensa": ("prensa", "Prensa y medios"),
    "faq": ("faq", "Preguntas frecuentes"),
    "aviso": ("aviso", "Aviso de privacidad"),
}
SLUGS = {k: v[0] for k, v in PAGINAS.items()}
SLUGS.update({"directorio-grupos": "/directorio", "directorio": "/directorio", "mapagrupos": "/mapa", "inicio": "/"})

PERMITIDAS = {"h2", "h3", "h4", "p", "ul", "ol", "li", "strong", "em", "a", "br", "blockquote", "img"}
VACIAS = {"br", "img"}
SITIO_TIJUANA = "https://www.aabcn01.org"


def enlace(href):
    href = html.unescape(href or "").strip()
    href = re.sub(r"[?&]utm_[^#]*", "", href)
    if href.startswith("mailto:") or href.startswith("tel:"):
        return href
    m = re.match(r"^(?:https?://(?:www\.)?aabcn01\.org)?/([\w-]+)/?$", href)
    if m and m.group(1) in SLUGS:
        s = SLUGS[m.group(1)]
        return s if s.startswith("/") else f"/pagina?p={s}"
    if href.startswith("/s/"):  # PDFs que siguen en Squarespace de Tijuana
        return SITIO_TIJUANA + href
    if href.startswith("/"):
        return ""
    return href if re.match(r"^https?://", href) else ""


class Limpiador(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.out, self.pila, self.saltar = [], [], 0

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag in ("style", "script", "noscript", "button", "svg", "form"):
            self.saltar += 1
            return
        if self.saltar:
            return
        if tag == "h1":
            tag = "h2"
        if tag == "b":
            tag = "strong"
        if tag == "i":
            tag = "em"
        if tag not in PERMITIDAS:
            return
        if tag == "img":
            src = a.get("data-src") or a.get("src") or ""
            if src.startswith("https://images.squarespace-cdn.com/"):
                src = src.split("?")[0]
                alt = html.escape(a.get("alt") or "", quote=True)
                self.out.append(f'<img src="{html.escape(src, quote=True)}" alt="{alt}" loading="lazy">')
            return
        if tag == "br":
            self.out.append("<br>")
            return
        if tag == "a":
            href = enlace(a.get("href"))
            if not href:
                self.pila.append(None)
                return
            extra = ' target="_blank" rel="noopener"' if href.startswith("http") else ""
            self.out.append(f'<a href="{html.escape(href, quote=True)}"{extra}>')
            self.pila.append("a")
            return
        self.out.append(f"<{tag}>")
        self.pila.append(tag)

    def handle_endtag(self, tag):
        if tag in ("style", "script", "noscript", "button", "svg", "form"):
            self.saltar = max(0, self.saltar - 1)
            return
        if self.saltar:
            return
        tag = {"h1": "h2", "b": "strong", "i": "em"}.get(tag, tag)
        if tag not in PERMITIDAS or tag in VACIAS:
            return
        if tag in self.pila:
            while self.pila:
                t = self.pila.pop()
                if t:
                    self.out.append(f"</{t}>")
                if t == tag or (t is None and tag == "a"):
                    break

    def handle_data(self, data):
        if not self.saltar:
            self.out.append(html.escape(data, quote=False))

    def resultado(self):
        while self.pila:
            t = self.pila.pop()
            if t:
                self.out.append(f"</{t}>")
        return "".join(self.out)


def limpiar(fragmento, titulo):
    p = Limpiador()
    p.feed(fragmento)
    h = p.resultado()
    h = re.sub(r"[ \t\r\n ]+", " ", h)
    h = re.sub(r"\s*<br>\s*", "<br>", h)
    for _ in range(3):  # quita elementos vacíos
        h = re.sub(r"<(p|h2|h3|h4|strong|em|li|ul|ol|blockquote|a)( [^>]*)?>\s*(<br>\s*)*</\1>", "", h)
    h = re.sub(r"<br></p>", "</p>", h)
    h = re.sub(r"\s*(</?(?:p|h2|h3|h4|ul|ol|li|blockquote)>)\s*", r"\1", h)
    # el primer encabezado que repite el título de la página sobra
    m = re.match(r"^<h[234]>(.*?)</h[234]>", h)
    if m and normal(re.sub("<[^>]+>", "", m.group(1))) in (normal(titulo), normal(titulo).replace("preguntas frecuentes", "faq")):
        h = h[m.end():]
    return adaptar(h).strip()


def normal(s):
    import unicodedata
    s = unicodedata.normalize("NFD", s or "")
    return re.sub(r"[^a-z0-9 ]", "", "".join(c for c in s if unicodedata.category(c) != "Mn").lower()).strip()


def adaptar(h):
    """Cambia datos de Tijuana por los de Mexicali (los marcados [ ] los llena el área)."""
    rep = [
        (r"contacto@aabcn01\.org|area@aabcn01\.org", "contacto@aabcn02.org"),
        (r"664\s?624-?1418", "[TELÉFONO DE OFICINA]"),
        (r"www\.aabcn01\.org/directorio", "aabcn02.org/directorio"),
        (r"https?://www\.aabcn01\.org/aviso", "https://aabcn02.org/pagina?p=aviso"),
        (r"Área BCN 01 \(Baja California Norte\)", "Área 64 Región 02 (Mexicali, Baja California)"),
        (r"Área BCN 01", "Área 64 Región 02"),
        (r"Calzada Ing\. Juan Ojeda Robles No\.\s*14716, Colonia Guadalupe Victoria,\s*Tijuana Baja California, México\.\s*CP 22380",
         "[DIRECCIÓN DE LA OFICINA DE ÁREA], Mexicali, Baja California, México"),
    ]
    for a, b in rep:
        h = re.sub(a, b, h)
    return h


def sql(v):
    return "'" + str(v).replace("'", "''") + "'"


def main(ruta):
    ch = ET.parse(ruta).getroot().find("channel")
    filas = []
    for it in ch.findall("item"):
        if it.findtext("wp:post_type", namespaces=NS) != "page":
            continue
        slug_sq = (it.findtext("link") or "").strip("/")
        if slug_sq not in PAGINAS:
            continue
        slug, titulo = PAGINAS[slug_sq]
        contenido = limpiar(it.findtext("content:encoded", namespaces=NS) or "", titulo)
        filas.append((slug, titulo, contenido))
    filas.sort(key=lambda f: list(SLUGS.values()).index(f[0]))
    # Contacto: en Tijuana tiene sus datos, aquí se arma con los de Mexicali
    filas.append(("contacto", "Contacto", (
        "<h2>Escríbenos</h2>"
        "<p><strong>Correo:</strong> <a href=\"mailto:contacto@aabcn02.org\">contacto@aabcn02.org</a></p>"
        "<p><strong>Teléfono:</strong> [TELÉFONO DE OFICINA]</p>"
        "<p><strong>Oficina de área:</strong> [DIRECCIÓN DE LA OFICINA DE ÁREA], Mexicali, Baja California, México</p>"
        "<p>Si buscas un grupo, consulta el <a href=\"/directorio\">Directorio de grupos</a> o el <a href=\"/mapa\">mapa</a>. "
        "Preséntate en cualquier grupo diciendo que deseas información para dejar de beber.</p>"
    )))
    print("CREATE TABLE IF NOT EXISTS paginas (slug TEXT PRIMARY KEY, titulo TEXT NOT NULL, contenido TEXT NOT NULL, actualizado TEXT NOT NULL DEFAULT (datetime('now')));")
    for slug, titulo, contenido in filas:
        print(f"INSERT OR REPLACE INTO paginas (slug, titulo, contenido) VALUES ({sql(slug)}, {sql(titulo)}, {sql(contenido)});")
    print(f"-- {len(filas)} páginas", file=sys.stderr)


if __name__ == "__main__":
    main(sys.argv[1])
