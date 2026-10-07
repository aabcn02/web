# aabcn02.org — Sitio de AA Área 64 Región 02 (Mexicali)

## Qué hay en esta carpeta

| Archivo / carpeta | Para qué sirve |
|---|---|
| `public/` | Las páginas del sitio (lo que ve la gente) |
| `public/assets/estilos.css` | Diseño y colores (el azul se cambia en `--azul`) |
| `public/assets/sitio.js` | Título, correo, teléfono y menú |
| `public/assets/logo.png` | **Falta**: aquí va el logo (con ese nombre exacto) |
| `functions/api/grupos.js` | Lee los grupos de la base de datos |
| `schema.sql` | Crea la tabla de grupos (se usa una vez) |
| `datos-prueba.sql` | 5 grupos de prueba (se borran después) |

## Configuración en Cloudflare (una sola vez)

- Proyecto de Pages conectado a este repositorio
  - Comando de compilación: *(vacío)*
  - Directorio de salida: `public`
- Base de datos D1: `aabcn02-db`
- Enlace (binding) D1 en el proyecto de Pages: nombre de variable `DB`
- Dominio personalizado: `aabcn02.org`

## Borrar los grupos de prueba

En la consola de D1:

```sql
DELETE FROM grupos;
```
