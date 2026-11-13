/**
 * Registro de errores estructurado (JSON en una línea). En Vercel u otro
 * hosting queda en los logs del servidor; en el navegador, en la consola.
 * Punto único para conectar más adelante un servicio externo (Sentry, etc.).
 * Nunca registra claves ni contraseñas.
 */
export function registrarError(contexto: string, error: unknown, extra?: Record<string, unknown>) {
  const e = error as { message?: string; code?: string; hint?: string; details?: string } | undefined;
  const entrada = {
    nivel: "error",
    contexto,
    mensaje: e?.message ?? String(error),
    codigo: e?.code ?? null,
    hint: e?.hint ?? null,
    detalles: e?.details ?? null,
    ...extra,
    fecha: new Date().toISOString(),
  };
  console.error(JSON.stringify(entrada));
}
