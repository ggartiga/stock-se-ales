import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { clavePublicaSupabase, urlSupabase } from "@/lib/entorno";

/**
 * Cliente de Supabase para Server Components, Server Actions y Route Handlers.
 * Actúa con la sesión del usuario (RLS aplica normalmente).
 */
export async function crearClienteServidor() {
  const almacen = await cookies();
  return createServerClient(urlSupabase(), clavePublicaSupabase(), {
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
