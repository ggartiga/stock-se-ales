"use server";

import { revalidatePath } from "next/cache";
import { requerirRol } from "@/lib/sesion";
import { ROLES_GESTION_INVENTARIO } from "@/lib/dominio/permisos";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { esUuid, validarCodigoCorto, validarTexto } from "@/lib/dominio/validacion";
import { mensajeDeError } from "@/lib/dominio/errores";
import { registrarError } from "@/lib/registro";
import type { EstadoFormulario } from "@/lib/tipos";

const RUTA = "/admin/almacenes";
const estadoValido = (v: FormDataEntryValue | null): "activo" | "inactivo" => (v === "inactivo" ? "inactivo" : "activo");

function refrescar() {
  revalidatePath(RUTA);
  revalidatePath("/inventario");
}

export async function crearAlmacen(_p: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  await requerirRol(ROLES_GESTION_INVENTARIO);
  const nombre = validarTexto(String(datos.get("nombre") ?? ""), "El nombre", { min: 2, max: 100, obligatorio: true });
  const codigo = validarCodigoCorto(String(datos.get("codigo") ?? ""), "El código");
  if (!nombre.ok) return { ok: false, mensaje: nombre.error };
  if (!codigo.ok) return { ok: false, mensaje: codigo.error };

  const supabase = await crearClienteServidor();
  const { error } = await supabase.from("almacenes").insert({ nombre: nombre.valor, codigo: codigo.valor });
  if (error) {
    registrarError("almacenes.crear", error);
    if (error.code === "23505") return { ok: false, mensaje: "Ya existe un almacén con ese nombre o código." };
    return { ok: false, mensaje: mensajeDeError(error) };
  }
  refrescar();
  return { ok: true, mensaje: `Almacén “${nombre.valor}” creado.`, marca: Date.now() };
}

export async function actualizarAlmacen(_p: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  await requerirRol(ROLES_GESTION_INVENTARIO);
  const id = String(datos.get("id") ?? "");
  const nombre = validarTexto(String(datos.get("nombre") ?? ""), "El nombre", { min: 2, max: 100, obligatorio: true });
  const codigo = validarCodigoCorto(String(datos.get("codigo") ?? ""), "El código");
  if (!esUuid(id)) return { ok: false, mensaje: "Almacén inválido." };
  if (!nombre.ok) return { ok: false, mensaje: nombre.error };
  if (!codigo.ok) return { ok: false, mensaje: codigo.error };

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from("almacenes")
    .update({ nombre: nombre.valor, codigo: codigo.valor, estado: estadoValido(datos.get("estado")) })
    .eq("id", id)
    .select("id");
  if (error || !data?.length) {
    if (error) registrarError("almacenes.actualizar", error);
    if (error?.code === "23505") return { ok: false, mensaje: "Ya existe un almacén con ese nombre o código." };
    return { ok: false, mensaje: error ? mensajeDeError(error) : "No se pudo actualizar." };
  }
  refrescar();
  return { ok: true, mensaje: "Almacén actualizado.", marca: Date.now() };
}

export async function eliminarAlmacen(_p: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  await requerirRol(ROLES_GESTION_INVENTARIO);
  const id = String(datos.get("id") ?? "");
  if (!esUuid(id)) return { ok: false, mensaje: "Almacén inválido." };
  const supabase = await crearClienteServidor();

  // Sólo se elimina si ninguna de sus ubicaciones tiene productos ni historial;
  // se comprueba antes para no dejar el almacén a medio borrar.
  const { data: ubicaciones, error: errorUbic } = await supabase.from("ubicaciones").select("id").eq("almacen_id", id);
  if (errorUbic) {
    registrarError("almacenes.eliminar.ubicaciones", errorUbic);
    return { ok: false, mensaje: mensajeDeError(errorUbic) };
  }
  const idsUbicaciones = (ubicaciones ?? []).map((u) => u.id);
  if (idsUbicaciones.length > 0) {
    const [inv, mov] = await Promise.all([
      supabase.from("inventario").select("id", { count: "exact", head: true }).in("ubicacion_id", idsUbicaciones),
      supabase.from("movimientos").select("id", { count: "exact", head: true }).eq("almacen_id", id),
    ]);
    if (inv.error || mov.error) {
      registrarError("almacenes.eliminar.revisar", inv.error ?? mov.error);
      return { ok: false, mensaje: mensajeDeError((inv.error ?? mov.error)!) };
    }
    if ((inv.count ?? 0) > 0) {
      return { ok: false, mensaje: "No se puede eliminar: tiene productos en sus ubicaciones. Quítelos primero o marque el almacén como Inactivo." };
    }
    if ((mov.count ?? 0) > 0) {
      return { ok: false, mensaje: "No se puede eliminar: tiene movimientos en el historial, que se conserva. Márquelo como Inactivo." };
    }
    const { error: errorBorrarUbic } = await supabase.from("ubicaciones").delete().eq("almacen_id", id);
    if (errorBorrarUbic) {
      registrarError("almacenes.eliminar.borrarUbicaciones", errorBorrarUbic);
      return { ok: false, mensaje: mensajeDeError(errorBorrarUbic) };
    }
  }

  const { data, error } = await supabase.from("almacenes").delete().eq("id", id).select("id");
  if (error) {
    registrarError("almacenes.eliminar", error);
    if (error.code === "23503") {
      return { ok: false, mensaje: "No se puede eliminar: el almacén tiene ubicaciones o movimientos. Puede marcarlo como inactivo." };
    }
    return { ok: false, mensaje: mensajeDeError(error) };
  }
  if (!data?.length) return { ok: false, mensaje: "No se pudo eliminar." };
  refrescar();
  return { ok: true, mensaje: "Almacén eliminado.", marca: Date.now() };
}

export async function crearUbicacion(_p: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  await requerirRol(ROLES_GESTION_INVENTARIO);
  const almacenId = String(datos.get("almacen_id") ?? "");
  const codigo = validarCodigoCorto(String(datos.get("codigo_ubicacion") ?? ""), "El código de ubicación");
  const descripcion = validarTexto(String(datos.get("descripcion") ?? ""), "La descripción", { max: 300 });
  if (!esUuid(almacenId)) return { ok: false, mensaje: "Almacén inválido." };
  if (!codigo.ok) return { ok: false, mensaje: codigo.error };
  if (!descripcion.ok) return { ok: false, mensaje: descripcion.error };

  const supabase = await crearClienteServidor();
  const { error } = await supabase
    .from("ubicaciones")
    .insert({ almacen_id: almacenId, codigo_ubicacion: codigo.valor, descripcion: descripcion.valor });
  if (error) {
    registrarError("ubicaciones.crear", error);
    if (error.code === "23505") return { ok: false, mensaje: `La ubicación ${codigo.valor} ya existe en este almacén.` };
    return { ok: false, mensaje: mensajeDeError(error) };
  }
  refrescar();
  return { ok: true, mensaje: `Ubicación ${codigo.valor} creada. Ya puede imprimir su código QR.`, marca: Date.now() };
}

export async function actualizarUbicacion(_p: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  await requerirRol(ROLES_GESTION_INVENTARIO);
  const id = String(datos.get("id") ?? "");
  const codigo = validarCodigoCorto(String(datos.get("codigo_ubicacion") ?? ""), "El código de ubicación");
  const descripcion = validarTexto(String(datos.get("descripcion") ?? ""), "La descripción", { max: 300 });
  if (!esUuid(id)) return { ok: false, mensaje: "Ubicación inválida." };
  if (!codigo.ok) return { ok: false, mensaje: codigo.error };
  if (!descripcion.ok) return { ok: false, mensaje: descripcion.error };

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from("ubicaciones")
    .update({ codigo_ubicacion: codigo.valor, descripcion: descripcion.valor, estado: estadoValido(datos.get("estado")) })
    .eq("id", id)
    .select("id");
  if (error || !data?.length) {
    if (error) registrarError("ubicaciones.actualizar", error);
    if (error?.code === "23505") return { ok: false, mensaje: `La ubicación ${codigo.valor} ya existe en este almacén.` };
    return { ok: false, mensaje: error ? mensajeDeError(error) : "No se pudo actualizar." };
  }
  refrescar();
  return { ok: true, mensaje: "Ubicación actualizada. Su QR no cambia.", marca: Date.now() };
}

export async function eliminarUbicacion(_p: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  await requerirRol(ROLES_GESTION_INVENTARIO);
  const id = String(datos.get("id") ?? "");
  if (!esUuid(id)) return { ok: false, mensaje: "Ubicación inválida." };
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.from("ubicaciones").delete().eq("id", id).select("id");
  if (error) {
    registrarError("ubicaciones.eliminar", error);
    if (error.code === "23503") {
      return { ok: false, mensaje: "No se puede eliminar: la ubicación tiene productos o movimientos. Puede marcarla como inactiva." };
    }
    return { ok: false, mensaje: mensajeDeError(error) };
  }
  if (!data?.length) return { ok: false, mensaje: "No se pudo eliminar." };
  refrescar();
  return { ok: true, mensaje: "Ubicación eliminada.", marca: Date.now() };
}
