# aabcn02.org — Sitio de AA Área 64 Región 02 (Mexicali)

## Qué hay en esta carpeta

| Archivo / carpeta | Para qué sirve |
|---|---|
| `public/` | Las páginas del sitio (lo que ve la gente) |
| `public/assets/estilos.css` | Diseño y colores (el azul se cambia en `--azul`) |
| `public/assets/sitio.js` | Título, correo, teléfono, menú y funciones compartidas |
| `public/assets/logo.png` | **Falta**: logo del encabezado (con ese nombre exacto) |
| `public/assets/pin.png` | **Opcional**: pin del mapa con el logo de AA (si no está, sale pin azul) |
| `functions/api/grupos.js` | Lee los grupos de la base de datos |
| `functions/api/admin/` | API del panel (grupos, noticias, páginas, usuarios, fotos, ubicar) |
| `functions/api/noticias.js` | Noticias, publicaciones y reflexión para el sitio |
| `functions/fotos/` | Entrega las fotos y PDFs guardados en R2 |
| `lib/` | Código compartido: login (Access), mapas, limpieza de HTML |
| `public/admin/` | Panel de administración |
| `parte2.sql` | Tablas de usuarios, noticias y bitácora (se pega una vez) |
| `schema.sql` | Estructura de la tabla de grupos |
| `cargar-grupos.sql` | Los 63 grupos del Excel del área (carga inicial) |
| `herramientas/excel_a_sql.py` | Convierte el Excel en `cargar-grupos.sql` |
| `cargar-paginas.sql` | Páginas institucionales sacadas de Squarespace (Tijuana), adaptadas a Mexicali |
| `herramientas/squarespace_a_sql.py` | Convierte el export de Squarespace en `cargar-paginas.sql` |
| `functions/api/pagina.js` | Lee las páginas institucionales de la base de datos |

## Configuración en Cloudflare (una sola vez)

- Proyecto de Pages `aabcn02` conectado al repositorio `aabcn02/web`, rama `main`
  - Comando de compilación: *(vacío)*
  - Directorio de salida: `public`
- Base de datos D1: `aabcn02-db`
- Enlace (binding) D1 en el proyecto de Pages: nombre de variable `DB`
- Bucket R2: `aabcn02-fotos`, enlace (binding) en Pages: `FOTOS`
- Variables de entorno en Pages: `ACCESS_EQUIPO` (equipo de Zero Trust) y `ACCESS_AUD` (audiencia de la app de Access)
- Cloudflare Access: aplicación "Panel AA" que protege `aabcn02.org/admin` y `aabcn02.org/api/admin`
  (política: cualquiera que entre con código de correo; el permiso real lo da la tabla `usuarios` desde el panel)
- Dominio personalizado: `aabcn02.org`

**No** se debe subir un `wrangler.toml` al repositorio: Cloudflare lo tomaría en lugar de la configuración del panel.

## Carga inicial de grupos

1. Pegar `cargar-grupos.sql` en la consola de D1 (borra la tabla y la crea de nuevo).
2. Abrir `https://aabcn02.org/api/admin/ubicar` (como administrador) y recargar hasta que diga **TERMINADO**.
3. Los que salgan sin pin o "aproximado" se corrigen en el panel (Grupos → filtro "Sin pin").

## Páginas institucionales

Pegar `cargar-paginas.sql` en la consola de D1. Se pueden volver a pegar sin problema (reemplaza las existentes).
Pendientes de llenar: `[TELÉFONO DE OFICINA]` y `[DIRECCIÓN DE LA OFICINA DE ÁREA]` (Contacto y Aviso de privacidad).

## Links útiles

- `/directorio?id=12` o `/mapa?id=12`: muestra solo ese grupo (los botones Compartir los generan solos).

## Panel de administración (`/admin`)

- **Administrador:** grupos, noticias, páginas y usuarios.
- **Editor:** grupos y noticias.
- Las fotos se achican en el navegador (máx. 1600 px, WebP) antes de subirse a R2.
- Todo cambio queda anotado en la tabla `bitacora` (quién, qué y cuándo).
