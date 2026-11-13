/**
 * Traducción de errores de Supabase/PostgreSQL a mensajes claros en español.
 * Las funciones SQL del proyecto lanzan errores con un `hint` (código propio)
 * y un mensaje ya redactado para el usuario.
 */
export interface ErrorSupabase {
  message?: string | null;
  code?: string | null;
  hint?: string | null;
  details?: string | null;
}

/** Códigos propios definidos en las migraciones SQL (campo hint). */
export const CODIGOS_PROPIOS = [
  "NO_AUTENTICADO",
  "USUARIO_INACTIVO",
  "SIN_PERMISO",
  "CANTIDAD_INVALIDA",
  "STOCK_INSUFICIENTE",
  "SOLICITUD_INVALIDA",
  "SOLICITUD_DUPLICADA",
  "INVENTARIO_NO_ENCONTRADO",
  "PRODUCTO_INACTIVO",
  "UBICACION_INACTIVA",
  "STOCK_SOLO_POR_MOVIMIENTO",
  "INVENTARIO_INMUTABLE",
  "HISTORIAL_INMUTABLE",
  "ULTIMO_ADMINISTRADOR",
  "SAP_DUPLICADO",
  "YA_EXISTE",
  "NO_ENCONTRADO",
  "DATO_INVALIDO",
  "TIPO_INVALIDO",
] as const;

const POR_SQLSTATE: Record<string, string> = {
  "42501": "No tiene permisos para realizar esta acción.",
  "23505": "Ya existe un registro con esos datos.",
  "23503": "No se puede completar: hay registros asociados (por ejemplo, productos en la ubicación o movimientos).",
  "23514": "Los datos no cumplen las reglas de validación.",
  "22P02": "Formato de dato inválido.",
  PGRST116: "No se encontró el registro solicitado.",
  PGRST301: "Su sesión expiró. Vuelva a iniciar sesión.",
};

export const MENSAJE_GENERICO = "Ocurrió un error inesperado. Intente nuevamente.";

export function esErrorDeRed(error: unknown): boolean {
  const msg = String((error as { message?: string })?.message ?? error ?? "");
  return /failed to fetch|network|fetch failed|load failed|networkerror/i.test(msg);
}

export function mensajeDeError(error: ErrorSupabase | Error | null | undefined): string {
  if (!error) return MENSAJE_GENERICO;
  if (esErrorDeRed(error)) return "Sin conexión con el servidor. Revise su red e intente nuevamente.";

  const e = error as ErrorSupabase;
  if (e.hint && (CODIGOS_PROPIOS as readonly string[]).includes(e.hint) && e.message) {
    return e.message;
  }
  if (e.code && POR_SQLSTATE[e.code]) return POR_SQLSTATE[e.code];
  if (/invalid login credentials/i.test(e.message ?? "")) return "Correo o contraseña incorrectos.";
  if (/email not confirmed/i.test(e.message ?? "")) return "Debe confirmar su correo antes de ingresar.";
  if (/jwt|session/i.test(e.message ?? "")) return "Su sesión expiró. Vuelva a iniciar sesión.";
  return MENSAJE_GENERICO;
}

export function codigoDeError(error: ErrorSupabase | null | undefined): string | null {
  return error?.hint ?? error?.code ?? null;
}
