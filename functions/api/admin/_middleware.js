// Guardia de TODO lo que está en /api/admin/*:
// 1) tiene que haber una sesión válida (login con correo y contraseña),
// 2) el correo tiene que estar dado de alta y activo en "usuarios",
// 3) si tiene contraseña temporal, solo puede cambiarla,
// 4) los cambios (POST/PUT/PATCH/DELETE) deben traer el encabezado "x-aa-panel" (bloquea envíos desde otros sitios).
import { usuarioActual } from "../../../lib/auth.js";
import { error } from "../../../lib/http.js";

export async function onRequest(ctx) {
  const { request, env, data } = ctx;
  if (!env.DB) return error("Falta conectar la base de datos (binding DB).", 500);

  const usuario = await usuarioActual(request, env);
  if (!usuario) return error("No has iniciado sesión.", 401);
  if (!usuario.rol) return error(`El correo ${usuario.email} no tiene permiso para el panel.`, 403);

  if (request.method !== "GET" && request.method !== "HEAD" && request.headers.get("x-aa-panel") !== "1") {
    return error("Solicitud no permitida.", 403);
  }
  const ruta = new URL(request.url).pathname;
  if (usuario.cambiar_clave && !["/api/admin/yo", "/api/admin/clave"].includes(ruta)) {
    return error("Primero cambia tu contraseña temporal.", 403);
  }
  data.usuario = usuario;
  try {
    return await ctx.next();
  } catch (e) {
    return error("Ocurrió un error en el servidor. Intenta de nuevo.", 500);
  }
}
