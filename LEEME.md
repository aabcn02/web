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
| `functions/api/noticias.js` | Noticias y publicaciones para el sitio |
| `functions/api/reflexion.js` + `lib/reflexion.js` | Reflexión del día desde la lista de YouTube (fecha en el título del video) |
| `functions/fotos/` | Entrega las fotos y PDFs guardados en R2 |
| `lib/` | Código compartido: login (correo y contraseña), mapas, limpieza de HTML |
| `functions/api/acceso/` | Entrar y salir del panel |
| `herramientas/clave_inicial.py` | Genera una contraseña temporal por SQL (si el administrador olvida la suya) |
| `public/admin/` | Panel de administración |
| `parte2.sql` | Estructura de usuarios, sesiones, noticias y bitácora (instalación nueva) |
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
- Secreto en Pages: `YOUTUBE_KEY` (clave de YouTube Data API v3). Opcional: `YOUTUBE_LISTA` para cambiar de lista.
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
- Entrada con correo y contraseña (cifrada con PBKDF2). Sesión de 7 días en cookie segura.
  5 intentos fallidos bloquean la cuenta 15 minutos.
- Usuarios nuevos reciben una contraseña temporal y deben cambiarla al entrar.
- Si el administrador olvida su contraseña y no hay otro administrador:
  `python3 herramientas/clave_inicial.py correo@ejemplo.com admin` y pegar el SQL en la consola de D1.
- Las fotos se achican en el navegador (máx. 1600 px, WebP) antes de subirse a R2.
- Todo cambio queda anotado en la tabla `bitacora` (quién, qué y cuándo).

## Literatura

- Catálogo en `public/assets/literatura.js` (lista `LITERATURA`: código, título, descripción). Portadas desde aamexico.org.

## Reflexión del día

- Sale sola de la lista de YouTube: el video cuyo título trae la fecha de hoy ("8 de Octubre", "Octubre 8"...).
- Revisar qué fechas faltan en la lista: abrir `/api/reflexion?verificar=1`.
