/**
 * Variables de entorno públicas. Next.js sólo expone al navegador las que
 * empiezan con NEXT_PUBLIC_ y deben referenciarse de forma literal.
 *
 * Se validan al USARLAS (al crear un cliente de Supabase), no al importar el
 * módulo: así `next build` no falla al analizar las páginas y, si falta una
 * variable, el error aparece con un mensaje claro en la primera petición.
 */
function requerida(nombre: string, valor: string | undefined): string {
  if (!valor) {
    throw new Error(`Falta la variable de entorno ${nombre}. Revise .env.local (ver .env.example).`);
  }
  return valor;
}

export function urlSupabase(): string {
  return requerida("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
}

export function clavePublicaSupabase(): string {
  return requerida("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}

export const URL_SITIO = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
