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
| `functions/api/ubicar.js` | Saca las coordenadas de los grupos sin pin (carga inicial) |
| `schema.sql` | Estructura de la tabla de grupos |
| `cargar-grupos.sql` | Los 63 grupos del Excel del área (carga inicial) |
| `herramientas/excel_a_sql.py` | Convierte el Excel en `cargar-grupos.sql` |

## Configuración en Cloudflare (una sola vez)

- Proyecto de Pages `aabcn02` conectado al repositorio `aabcn02/web`, rama `main`
  - Comando de compilación: *(vacío)*
  - Directorio de salida: `public`
- Base de datos D1: `aabcn02-db`
- Enlace (binding) D1 en el proyecto de Pages: nombre de variable `DB`
- Dominio personalizado: `aabcn02.org`

## Carga inicial de grupos

1. Pegar `cargar-grupos.sql` en la consola de D1 (borra la tabla y la crea de nuevo).
2. Abrir `https://aabcn02.org/api/ubicar` y recargar hasta que diga **TERMINADO**.
3. Los que salgan sin pin o "aproximado" se corrigen a mano (en el panel, Parte 2).

## Links útiles

- `/directorio?id=12` o `/mapa?id=12`: muestra solo ese grupo (los botones Compartir los generan solos).
