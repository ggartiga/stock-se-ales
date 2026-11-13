import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_CLAVE_PUBLICA, SUPABASE_URL } from "@/lib/entorno";

/**
 * Cliente de Supabase para Server Components, Server Actions y Route Handlers.
 * Actúa con la sesión del usuario (RLS aplica normalmente).
 */
export async function crearClienteServidor() {
  const almacen = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_CLAVE_PUBLICA, {
    cookies: {
      getAll() {
        return almacen.getAll();
      },
      setAll(lista) {
        try {
          for (const { name, value, options } of lista) almacen.set(name, value, options);
        } catch {
          // Llamado desde un Server Component: el proxy ya refresca la sesión.
        }
      },
    },
  });
}
