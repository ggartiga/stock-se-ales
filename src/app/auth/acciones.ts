"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { rutaInternaSegura } from "@/lib/dominio/permisos";
import { mensajeDeError } from "@/lib/dominio/errores";
import { validarContrasena, validarCorreo } from "@/lib/dominio/validacion";
import { registrarError } from "@/lib/registro";
import { URL_SITIO } from "@/lib/entorno";
import type { EstadoFormulario } from "@/lib/tipos";

export async function iniciarSesion(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const correo = validarCorreo(String(datos.get("correo") ?? ""));
  const clave = String(datos.get("clave") ?? "");
  if (!correo.ok) return { ok: false, mensaje: correo.error };
  if (!clave) return { ok: false, mensaje: "Ingrese su contraseña." };

  const supabase = await crearClienteServidor();
  const { error } = await supabase.auth.signInWithPassword({ email: correo.valor, password: clave });
  if (error) {
    // No se registra el correo ni la clave; sólo el tipo de error.
    registrarError("auth.iniciarSesion", { message: error.message, code: error.code });
    return { ok: false, mensaje: mensajeDeError(error) };
  }
  redirect(rutaInternaSegura(String(datos.get("siguiente") ?? "")));
}

export async function cerrarSesion() {
  const supabase = await crearClienteServidor();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function solicitarRecuperacion(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const correo = validarCorreo(String(datos.get("correo") ?? ""));
  if (!correo.ok) return { ok: false, mensaje: correo.error };

  const origen = (await headers()).get("origin") ?? URL_SITIO;
  const supabase = await crearClienteServidor();
  const { error } = await supabase.auth.resetPasswordForEmail(correo.valor, {
    redirectTo: `${origen}/auth/confirmar?siguiente=/cuenta`,
  });
  if (error) registrarError("auth.solicitarRecuperacion", { message: error.message, code: error.code });
  // Respuesta idéntica exista o no la cuenta (no revela qué correos están registrados).
  return {
    ok: true,
    mensaje: "Si el correo está registrado, recibirá un enlace para crear una nueva contraseña.",
  };
}

export async function cambiarContrasena(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const validacion = validarContrasena(String(datos.get("clave") ?? ""), String(datos.get("confirmacion") ?? ""));
  if (!validacion.ok) return { ok: false, mensaje: validacion.error };

  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, mensaje: "Su sesión expiró. Vuelva a iniciar sesión." };

  const { error } = await supabase.auth.updateUser({ password: validacion.valor });
  if (error) {
    registrarError("auth.cambiarContrasena", { message: error.message, code: error.code });
    if (/different from the old/i.test(error.message)) {
      return { ok: false, mensaje: "La nueva contraseña debe ser distinta de la anterior." };
    }
    if (/weak|pwned|strength/i.test(error.message)) {
      return { ok: false, mensaje: "La contraseña es demasiado débil. Use una más larga y difícil de adivinar." };
    }
    return { ok: false, mensaje: mensajeDeError(error) };
  }
  return { ok: true, mensaje: "Contraseña actualizada correctamente.", marca: Date.now() };
}
