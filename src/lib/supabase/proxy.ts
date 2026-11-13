import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { clavePublicaSupabase, urlSupabase } from "@/lib/entorno";

const RUTAS_PUBLICAS = ["/login", "/auth"];

/**
 * Refresca la sesión de Supabase en cada petición y protege las rutas:
 * sin sesión válida sólo se puede acceder a /login y /auth/*.
 */
export async function actualizarSesion(request: NextRequest) {
  let respuesta = NextResponse.next({ request });

  const supabase = createServerClient(urlSupabase(), clavePublicaSupabase(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(lista) {
        for (const { name, value } of lista) request.cookies.set(name, value);
        respuesta = NextResponse.next({ request });
        for (const { name, value, options } of lista) respuesta.cookies.set(name, value, options);
      },
    },
  });

  // getUser() valida el token contra Supabase Auth (no confía sólo en la cookie).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const ruta = request.nextUrl.pathname;
  const esPublica = RUTAS_PUBLICAS.some((r) => ruta === r || ruta.startsWith(`${r}/`));

  const redirigir = (destino: URL) => {
    const r = NextResponse.redirect(destino);
    for (const c of respuesta.cookies.getAll()) r.cookies.set(c);
    return r;
  };

  if (!user && !esPublica) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("siguiente", ruta + request.nextUrl.search);
    return redirigir(url);
  }

  if (user && ruta === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/inventario";
    url.search = "";
    return redirigir(url);
  }

  return respuesta;
}
