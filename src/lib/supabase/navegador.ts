import { createBrowserClient } from "@supabase/ssr";
import { clavePublicaSupabase, urlSupabase } from "@/lib/entorno";

/** Cliente de Supabase para componentes de cliente (usa la sesión en cookies). */
export function crearClienteNavegador() {
  return createBrowserClient(urlSupabase(), clavePublicaSupabase());
}
