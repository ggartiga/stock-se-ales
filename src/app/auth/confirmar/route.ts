import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { rutaInternaSegura } from "@/lib/dominio/permisos";
import { registrarError } from "@/lib/registro";

const TIPOS_VALIDOS: EmailOtpType[] = ["invite", "recovery", "signup", "magiclink", "email_change", "email"];

/**
 * Destino de los enlaces de correo de Supabase (invitación, recuperación).
 * Soporta:
 *  - token_hash + type  (plantillas de correo recomendadas, ver docs/DESPLIEGUE.md)
 *  - code               (flujo PKCE iniciado desde este mismo navegador)
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const tokenHash = url.searchParams.get("token_hash");
  const tipo = url.searchParams.get("type") as EmailOtpType | null;
  const codigo = url.searchParams.get("code");
  // Tras una invitación o recuperación se lleva al usuario a definir su contraseña.
  const porDefecto = tipo === "invite" || tipo === "recovery" ? "/cuenta?definir=1" : "/inventario";
  const siguiente = rutaInternaSegura(url.searchParams.get("siguiente"), porDefecto);

  const supabase = await crearClienteServidor();

  if (tokenHash && tipo && TIPOS_VALIDOS.includes(tipo)) {
    const { error } = await supabase.auth.verifyOtp({ type: tipo, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL(siguiente, url.origin));
    registrarError("auth.confirmar.verifyOtp", { message: error.message, code: error.code });
  } else if (codigo) {
    const { error } = await supabase.auth.exchangeCodeForSession(codigo);
    if (!error) return NextResponse.redirect(new URL(siguiente, url.origin));
    registrarError("auth.confirmar.exchangeCode", { message: error.message, code: error.code });
  }

  return NextResponse.redirect(new URL("/login?error=enlace", url.origin));
}
