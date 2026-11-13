import type { NextRequest } from "next/server";
import { actualizarSesion } from "@/lib/supabase/proxy";

/** Proxy de Next.js 16 (antes "middleware"): sesión y protección de rutas. */
export async function proxy(request: NextRequest) {
  return actualizarSesion(request);
}

export const config = {
  matcher: [
    // Todo excepto archivos estáticos e imágenes
    "/((?!_next/static|_next/image|favicon.ico|icono.svg|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
