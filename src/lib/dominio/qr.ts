import { esUuid } from "./validacion";

/**
 * Contenido de los QR de ubicación.
 *
 * Cada QR codifica una URL de la aplicación con el identificador único de la
 * ubicación (ubicaciones.identificador_qr), por ejemplo:
 *   https://stock-senales.ejemplo.cl/escanear?u=3f6c…
 * Ventajas: la cámara nativa del teléfono también abre la app directamente, y
 * dos ubicaciones "A1" de distintos almacenes nunca se confunden.
 *
 * El lector también acepta el formato corto "STOCKSENALES:UBI:<uuid>" y el
 * uuid solo, por compatibilidad con etiquetas impresas por otros medios.
 */
export const PREFIJO_QR = "STOCKSENALES:UBI:";
export const PARAMETRO_QR = "u";

export function construirUrlQR(urlBase: string, identificadorQr: string): string {
  const base = urlBase.replace(/\/+$/, "");
  return `${base}/escanear?${PARAMETRO_QR}=${encodeURIComponent(identificadorQr)}`;
}

/** Devuelve el identificador de ubicación contenido en un QR, o null si no es válido. */
export function interpretarContenidoQR(contenido: string | null | undefined): string | null {
  const texto = (contenido ?? "").trim();
  if (!texto) return null;

  if (texto.toUpperCase().startsWith(PREFIJO_QR)) {
    const id = texto.slice(PREFIJO_QR.length).trim();
    return esUuid(id) ? id.toLowerCase() : null;
  }

  if (esUuid(texto)) return texto.toLowerCase();

  try {
    const url = new URL(texto);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (!url.pathname.replace(/\/+$/, "").endsWith("/escanear")) return null;
    const id = url.searchParams.get(PARAMETRO_QR);
    return esUuid(id) ? id!.toLowerCase() : null;
  } catch {
    return null;
  }
}

/** Código corto legible impreso bajo el QR (para identificación visual / soporte). */
export function codigoCortoQR(identificadorQr: string): string {
  return identificadorQr.replace(/-/g, "").slice(0, 8).toUpperCase();
}
