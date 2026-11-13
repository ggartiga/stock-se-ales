import "server-only";
import { createClient } from "@supabase/supabase-js";
import { urlSupabase } from "@/lib/entorno";

/**
 * Cliente con la CLAVE SECRETA de Supabase. Sólo servidor ("server-only"
 * impide importarlo desde el navegador). Se usa EXCLUSIVAMENTE para la API de
 * administración de Auth (invitar/crear cuentas), siempre después de verificar
 * que quien llama es administrador. Aun con esta clave el historial es
 * inmutable (privilegios + trigger en la base de datos).
 */
export function crearClienteAdminAuth() {
  const clave = process.env.SUPABASE_SECRET_KEY;
  if (!clave) {
    throw new Error("Falta SUPABASE_SECRET_KEY en el entorno del servidor.");
  }
  return createClient(urlSupabase(), clave, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
