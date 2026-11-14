/**
 * Validaciones de entrada (cliente y servidor). La base de datos vuelve a
 * validar todo: estas funciones sólo dan mensajes claros antes de enviar.
 */
export type Resultado<T> = { ok: true; valor: T } | { ok: false; error: string };

export const MAX_CANTIDAD = 1_000_000;

function aEntero(entrada: string | number | null | undefined): number | null {
  if (entrada === null || entrada === undefined) return null;
  const texto = String(entrada).trim();
  if (!/^-?\d+$/.test(texto)) return null;
  const n = Number(texto);
  return Number.isSafeInteger(n) ? n : null;
}

/** Valida la cantidad a retirar contra el stock disponible mostrado. */
export function validarCantidadRetiro(
  entrada: string | number | null | undefined,
  stockDisponible: number,
): Resultado<number> {
  if (entrada === null || entrada === undefined || String(entrada).trim() === "") {
    return { ok: false, error: "Ingrese la cantidad a retirar." };
  }
  const n = aEntero(entrada);
  if (n === null) return { ok: false, error: "La cantidad debe ser un número entero." };
  if (n <= 0) return { ok: false, error: "La cantidad debe ser mayor que cero." };
  if (stockDisponible <= 0) return { ok: false, error: "Este producto no tiene stock disponible." };
  if (n > stockDisponible) {
    return {
      ok: false,
      error: `No puede retirar más de lo disponible (${stockDisponible} ${stockDisponible === 1 ? "unidad" : "unidades"}).`,
    };
  }
  return { ok: true, valor: n };
}

/** Cantidad no negativa (stock inicial, cantidad mínima). */
export function validarCantidadNoNegativa(
  entrada: string | number | null | undefined,
  nombreCampo: string,
): Resultado<number> {
  if (entrada === null || entrada === undefined || String(entrada).trim() === "") {
    return { ok: true, valor: 0 };
  }
  const n = aEntero(entrada);
  if (n === null) return { ok: false, error: `${nombreCampo}: debe ser un número entero.` };
  if (n < 0) return { ok: false, error: `${nombreCampo}: no puede ser negativa.` };
  if (n > MAX_CANTIDAD) return { ok: false, error: `${nombreCampo}: supera el máximo permitido.` };
  return { ok: true, valor: n };
}

export function validarCodigoSap(entrada: string | null | undefined): Resultado<string> {
  const v = (entrada ?? "").trim();
  if (!v) return { ok: false, error: "El código SAP es obligatorio." };
  if (!/^[A-Za-z0-9._-]{1,30}$/.test(v)) {
    return { ok: false, error: "Código SAP inválido: use sólo letras, números, punto, guion o guion bajo (máx. 30)." };
  }
  return { ok: true, valor: v };
}

/** Códigos de almacén y ubicación: mayúsculas, números, guion (p. ej. LF, A1, B-02). */
export function validarCodigoCorto(entrada: string | null | undefined, nombreCampo: string): Resultado<string> {
  const v = (entrada ?? "").trim().toUpperCase();
  if (!v) return { ok: false, error: `${nombreCampo} es obligatorio.` };
  if (!/^[A-Z0-9_-]{1,20}$/.test(v)) {
    return { ok: false, error: `${nombreCampo} inválido: use letras, números o guion (máx. 20, sin espacios).` };
  }
  return { ok: true, valor: v };
}

export function validarTexto(
  entrada: string | null | undefined,
  nombreCampo: string,
  opciones: { min?: number; max: number; obligatorio?: boolean },
): Resultado<string | null> {
  const v = (entrada ?? "").trim();
  if (!v) {
    return opciones.obligatorio ? { ok: false, error: `${nombreCampo} es obligatorio.` } : { ok: true, valor: null };
  }
  if (opciones.min && v.length < opciones.min) {
    return { ok: false, error: `${nombreCampo} debe tener al menos ${opciones.min} caracteres.` };
  }
  if (v.length > opciones.max) return { ok: false, error: `${nombreCampo} no puede superar ${opciones.max} caracteres.` };
  return { ok: true, valor: v };
}

export function validarCorreo(entrada: string | null | undefined): Resultado<string> {
  const v = (entrada ?? "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) return { ok: false, error: "Correo electrónico inválido." };
  return { ok: true, valor: v };
}

/** Dominio de correo obligatorio para registrarse (mantener alineado con la migración 6). */
export const DOMINIO_REGISTRO = "metro.cl";

/** Correo válido y del dominio de la empresa (p. ej. nombre@metro.cl). */
export function validarCorreoRegistro(entrada: string | null | undefined): Resultado<string> {
  const correo = validarCorreo(entrada);
  if (!correo.ok) return correo;
  if (!correo.valor!.endsWith(`@${DOMINIO_REGISTRO}`)) {
    return { ok: false, error: `Debe registrarse con su correo de trabajo @${DOMINIO_REGISTRO}.` };
  }
  return correo;
}

const UUID =/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function esUuid(valor: unknown): valor is string {
  return typeof valor === "string" && UUID.test(valor);
}

export function validarContrasena(clave: string, confirmacion: string): Resultado<string> {
  if (clave.length < 8) return { ok: false, error: "La contraseña debe tener al menos 8 caracteres." };
  if (!/[A-Za-z]/.test(clave) || !/\d/.test(clave)) {
    return { ok: false, error: "La contraseña debe combinar letras y números." };
  }
  if (clave !== confirmacion) return { ok: false, error: "Las contraseñas no coinciden." };
  return { ok: true, valor: clave };
}
