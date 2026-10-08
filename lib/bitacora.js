// Registro de quién cambió qué (para saber, por ejemplo, quién editó un grupo).
export async function anotar(env, usuario, accion, detalle = "") {
  try {
    await env.DB.prepare("INSERT INTO bitacora (email, accion, detalle) VALUES (?, ?, ?)")
      .bind(usuario.email, accion, String(detalle).slice(0, 300)).run();
  } catch (_) { /* la bitácora nunca debe impedir guardar */ }
}
