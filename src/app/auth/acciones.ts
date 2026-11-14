"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { rutaInternaSegura } from "@/lib/dominio/permisos";
import { mensajeDeError } from "@/lib/dominio/errores";
import { validarContrasena, validarCorreo, validarCorreoRegistro, validarTexto } from "@/lib/dominio/validacion";
import { crearClienteAdminAuth } from "@/lib/supabase/admin";
import { registrarError } from "@/lib/registro";
import { URL_SITIO, clavePublicaSupabase, urlSupabase } from "@/lib/entorno";
import { createClient } from "@supabase/supabase-js";
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

/**
 * Registro abierto desde /registro. La cuenta se crea siempre con rol
 * "trabajador" (fijado en app_metadata por el servidor, no por el usuario) y
 * queda confirmada para poder ingresar de inmediato.
 */
export async function registrarse(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const nombre = validarTexto(String(datos.get("nombre") ?? ""), "El nombre", { min: 2, max: 150, obligatorio: true });
  const correo = validarCorreoRegistro(String(datos.get("correo") ?? ""));
  const clave = validarContrasena(String(datos.get("clave") ?? ""), String(datos.get("confirmacion") ?? ""));
  if (!nombre.ok) return { ok: false, mensaje: nombre.error };
  if (!correo.ok) return { ok: false, mensaje: correo.error };
  if (!clave.ok) return { ok: false, mensaje: clave.error };

  let admin;
  try {
    admin = crearClienteAdminAuth();
  } catch (e) {
    registrarError("auth.registrarse.config", e);
    return { ok: false, mensaje: "El registro no está disponible: falta configurar el servidor." };
  }

  const { error: errorAlta } = await admin.auth.admin.createUser({
    email: correo.valor,
    password: clave.valor,
    email_confirm: true,
    user_metadata: { nombre_completo: nombre.valor! },
    app_metadata: { rol: "trabajador" },
  });
  if (errorAlta) {
    registrarError("auth.registrarse", { message: errorAlta.message, code: errorAlta.code });
    if (/already|registered|exists/i.test(errorAlta.message)) {
      return { ok: false, mensaje: "Ya existe una cuenta con ese correo. Inicie sesión." };
    }
    if (/weak|pwned|strength/i.test(errorAlta.message)) {
      return { ok: false, mensaje: "La contraseña es demasiado débil. Use una más larga y difícil de adivinar." };
    }
    return { ok: false, mensaje: "No se pudo crear la cuenta. Intente nuevamente." };
  }

  const supabase = await crearClienteServidor();
  const { error } = await supabase.auth.signInWithPassword({ email: correo.valor, password: clave.valor });
  if (error) {
    registrarError("auth.registrarse.ingreso", { message: error.message, code: error.code });
    return { ok: true, mensaje: "Cuenta creada. Ya puede iniciar sesión." };
  }
  redirect("/inventario");
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
  // Flujo implícito (sin PKCE): el enlace funciona aunque se abra en otro
  // navegador o en el celular. La sesión llega a /auth/enlace en el fragmento.
  const supabase = createClient(urlSupabase(), clavePublicaSupabase(), {
    auth: { flowType: "implicit", persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { error } = await supabase.auth.resetPasswordForEmail(correo.valor, {
    redirectTo: `${origen}/auth/enlace`,
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
