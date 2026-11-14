"use server";

import { revalidatePath } from "next/cache";
import { requerirRol } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { crearClienteAdminAuth } from "@/lib/supabase/admin";
import { esRol } from "@/lib/dominio/permisos";
import { esUuid, validarCorreo, validarTexto } from "@/lib/dominio/validacion";
import { mensajeDeError } from "@/lib/dominio/errores";
import { registrarError } from "@/lib/registro";
import { URL_SITIO } from "@/lib/entorno";
import type { EstadoFormulario } from "@/lib/tipos";

/**
 * Alta de un trabajador. Sólo administradores.
 * - "invitar": Supabase envía un correo para que defina su contraseña.
 * - "temporal": se crea con una contraseña temporal que el admin comunica.
 * El rol se fija en app_metadata (no editable por el usuario) y luego se
 * confirma con la RPC admin_actualizar_usuario usando la sesión del admin.
 */
export async function crearUsuario(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  await requerirRol(["administrador"]);

  const nombre = validarTexto(String(datos.get("nombre") ?? ""), "El nombre", { min: 2, max: 150, obligatorio: true });
  const correo = validarCorreo(String(datos.get("correo") ?? ""));
  const rol = String(datos.get("rol") ?? "");
  const modo = String(datos.get("modo") ?? "invitar");
  const claveTemporal = String(datos.get("clave_temporal") ?? "");

  if (!nombre.ok) return { ok: false, mensaje: nombre.error };
  if (!correo.ok) return { ok: false, mensaje: correo.error };
  if (!esRol(rol)) return { ok: false, mensaje: "Seleccione un rol válido." };
  if (modo === "temporal" && (claveTemporal.length < 8 || !/\d/.test(claveTemporal) || !/[A-Za-z]/.test(claveTemporal))) {
    return { ok: false, mensaje: "La contraseña temporal debe tener al menos 8 caracteres con letras y números." };
  }

  let admin;
  try {
    admin = crearClienteAdminAuth();
  } catch (e) {
    registrarError("usuarios.crear.config", e);
    return { ok: false, mensaje: "El servidor no tiene configurada la clave de administración (SUPABASE_SECRET_KEY)." };
  }

  const metadatos = { nombre_completo: nombre.valor! };
  const resultado =
    modo === "temporal"
      ? await admin.auth.admin.createUser({
          email: correo.valor,
          password: claveTemporal,
          email_confirm: true,
          user_metadata: metadatos,
          app_metadata: { rol },
        })
      : await admin.auth.admin.inviteUserByEmail(correo.valor, {
          data: metadatos,
          // El cliente admin usa el flujo implícito: la sesión llega en el fragmento a /auth/enlace.
          redirectTo: `${URL_SITIO}/auth/enlace`,
        });

  if (resultado.error || !resultado.data.user) {
    const e = resultado.error;
    registrarError("usuarios.crear", { message: e?.message, code: e?.code });
    if (e && /already|registered|exists/i.test(e.message)) {
      return { ok: false, mensaje: "Ya existe una cuenta con ese correo." };
    }
    return { ok: false, mensaje: "No se pudo crear la cuenta. Revise el correo e intente nuevamente." };
  }

  // Confirmar nombre y rol con la sesión del administrador (queda validado por la BD).
  const supabase = await crearClienteServidor();
  const { error } = await supabase.rpc("admin_actualizar_usuario", {
    p_usuario_id: resultado.data.user.id,
    p_nombre_completo: nombre.valor,
    p_rol: rol,
    p_activo: true,
  });
  if (error) {
    registrarError("usuarios.crear.rol", error);
    return { ok: false, mensaje: `Cuenta creada, pero no se pudo asignar el rol: ${mensajeDeError(error)}` };
  }

  revalidatePath("/admin/usuarios");
  return {
    ok: true,
    marca: Date.now(),
    mensaje:
      modo === "temporal"
        ? `Cuenta creada para ${correo.valor}. Comunique la contraseña temporal; podrá cambiarla en "Mi cuenta".`
        : `Invitación enviada a ${correo.valor}.`,
  };
}

export async function actualizarUsuario(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  await requerirRol(["administrador"]);

  const id = String(datos.get("id") ?? "");
  const nombre = validarTexto(String(datos.get("nombre") ?? ""), "El nombre", { min: 2, max: 150, obligatorio: true });
  const rol = String(datos.get("rol") ?? "");
  const activo = datos.get("activo") === "on";

  if (!esUuid(id)) return { ok: false, mensaje: "Usuario inválido." };
  if (!nombre.ok) return { ok: false, mensaje: nombre.error };
  if (!esRol(rol)) return { ok: false, mensaje: "Seleccione un rol válido." };

  const supabase = await crearClienteServidor();
  const { error } = await supabase.rpc("admin_actualizar_usuario", {
    p_usuario_id: id,
    p_nombre_completo: nombre.valor,
    p_rol: rol,
    p_activo: activo,
  });
  if (error) {
    registrarError("usuarios.actualizar", error);
    return { ok: false, mensaje: mensajeDeError(error) };
  }

  revalidatePath("/admin/usuarios");
  return { ok: true, mensaje: "Cambios guardados.", marca: Date.now() };
}
