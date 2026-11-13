import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_CLAVE_PUBLICA, SUPABASE_URL } from "@/lib/entorno";

/** Cliente de Supabase para componentes de cliente (usa la sesión en cookies). */
export function crearClienteNavegador() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_CLAVE_PUBLICA);
}
