"use server";

import { revalidatePath } from "next/cache";
import { requerirRol } from "@/lib/sesion";
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
  await requerirRol(["administrador"]);
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
  await requerirRol(["administrador"]);
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
  await requerirRol(["administrador"]);
  const id = String(datos.get("id") ?? "");
  if (!esUuid(id)) return { ok: false, mensaje: "Almacén inválido." };
  const supabase = await crearClienteServidor();
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
  await requerirRol(["administrador"]);
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
  await requerirRol(["administrador"]);
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
  await requerirRol(["administrador"]);
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
