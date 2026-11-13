import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import type { Perfil } from "@/lib/tipos";
import type { Rol } from "@/lib/dominio/permisos";
import { registrarError } from "@/lib/registro";

/**
 * Perfil del usuario autenticado, obtenido de la sesión (cookie validada con
 * Supabase Auth) + tabla public.usuarios. Nunca de datos enviados por el cliente.
 * `cache` evita repetir la consulta dentro de una misma petición.
 */
export const obtenerSesion = cache(async (): Promise<{ autenticado: boolean; perfil: Perfil | null }> => {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { autenticado: false, perfil: null };

  const { data, error } = await supabase
    .from("usuarios")
    .select("id, nombre_completo, correo, rol, activo, fecha_creacion")
    .eq("id", user.id)
    .maybeSingle();

  if (error) registrarError("sesion.obtenerSesion", error);
  return { autenticado: true, perfil: (data as Perfil | null) ?? null };
});

/** Exige sesión y cuenta activa; si no, redirige. */
export async function requerirPerfil(): Promise<Perfil> {
  const { autenticado, perfil } = await obtenerSesion();
  if (!autenticado) redirect("/login");
  if (!perfil || !perfil.activo) redirect("/auth/cuenta-inactiva");
  return perfil;
}

/** Exige uno de los roles indicados (la BD vuelve a verificarlo con RLS). */
export async function requerirRol(roles: Rol[]): Promise<Perfil> {
  const perfil = await requerirPerfil();
  if (!roles.includes(perfil.rol)) redirect("/inventario?aviso=sin-permiso");
  return perfil;
}
