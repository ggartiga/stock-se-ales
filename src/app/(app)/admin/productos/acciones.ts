"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requerirRol } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { esUuid, validarCantidadNoNegativa, validarCodigoSap, validarTexto } from "@/lib/dominio/validacion";
import { mensajeDeError } from "@/lib/dominio/errores";
import { registrarError } from "@/lib/registro";
import type { EstadoFormulario } from "@/lib/tipos";

/**
 * Acciones de administración de productos. Cada una:
 *  1) verifica el rol con la sesión (requerirRol),
 *  2) valida los datos,
 *  3) opera con la sesión del usuario: RLS y las funciones SQL vuelven a validar.
 */

function leerProducto(datos: FormData) {
  const sap = validarCodigoSap(String(datos.get("codigo_sap") ?? ""));
  if (!sap.ok) return { error: sap.error } as const;
  const elemento = validarTexto(String(datos.get("elemento") ?? ""), "El elemento", { max: 150, obligatorio: true });
  if (!elemento.ok) return { error: elemento.error } as const;
  const descripcion = validarTexto(String(datos.get("descripcion") ?? ""), "La descripción", { max: 1000 });
  if (!descripcion.ok) return { error: descripcion.error } as const;
  return { sap: sap.valor, elemento: elemento.valor!, descripcion: descripcion.valor } as const;
}

export async function crearProducto(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  await requerirRol(["administrador"]);
  const p = leerProducto(datos);
  if ("error" in p) return { ok: false, mensaje: p.error ?? null };

  const ubicacionId = String(datos.get("ubicacion_id") ?? "");
  const solicitud = String(datos.get("solicitud_id") ?? "");
  const minima = validarCantidadNoNegativa(String(datos.get("cantidad_minima") ?? ""), "Cantidad mínima");
  const inicial = validarCantidadNoNegativa(String(datos.get("cantidad_inicial") ?? ""), "Stock inicial");
  if (!esUuid(ubicacionId)) return { ok: false, mensaje: "Seleccione el almacén y la ubicación." };
  if (!minima.ok) return { ok: false, mensaje: minima.error };
  if (!inicial.ok) return { ok: false, mensaje: inicial.error };
  if (!esUuid(solicitud)) return { ok: false, mensaje: "Solicitud inválida. Recargue la página." };

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc("crear_producto", {
    p_codigo_sap: p.sap,
    p_elemento: p.elemento,
    p_descripcion: p.descripcion,
    p_ubicacion_id: ubicacionId,
    p_cantidad_minima: minima.valor,
    p_cantidad_inicial: inicial.valor,
    p_solicitud_id: solicitud,
  });
  if (error) {
    registrarError("productos.crear", error);
    return { ok: false, mensaje: mensajeDeError(error) };
  }
  revalidatePath("/inventario");
  revalidatePath("/admin/productos");
  redirect(`/admin/productos/${data as string}?creado=1`);
}

export async function actualizarProducto(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  await requerirRol(["administrador"]);
  const id = String(datos.get("id") ?? "");
  if (!esUuid(id)) return { ok: false, mensaje: "Producto inválido." };
  const p = leerProducto(datos);
  if ("error" in p) return { ok: false, mensaje: p.error ?? null };

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from("productos")
    .update({ codigo_sap: p.sap, elemento: p.elemento, descripcion: p.descripcion })
    .eq("id", id)
    .select("id");
  if (error) {
    registrarError("productos.actualizar", error);
    if (error.code === "23505") return { ok: false, mensaje: `Ya existe otro producto con el código SAP ${p.sap}.` };
    return { ok: false, mensaje: mensajeDeError(error) };
  }
  if (!data?.length) return { ok: false, mensaje: "No se pudo actualizar (sin permisos o producto inexistente)." };

  revalidatePath("/inventario");
  revalidatePath(`/admin/productos/${id}`);
  return { ok: true, mensaje: "Producto actualizado.", marca: Date.now() };
}

export async function actualizarMinimo(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  await requerirRol(["administrador"]);
  const inventarioId = String(datos.get("inventario_id") ?? "");
  const minima = validarCantidadNoNegativa(String(datos.get("cantidad_minima") ?? ""), "Cantidad mínima");
  if (!esUuid(inventarioId)) return { ok: false, mensaje: "Registro inválido." };
  if (!minima.ok) return { ok: false, mensaje: minima.error };

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.from("inventario").update({ cantidad_minima: minima.valor }).eq("id", inventarioId).select("producto_id");
  if (error || !data?.length) {
    if (error) registrarError("productos.minimo", error);
    return { ok: false, mensaje: error ? mensajeDeError(error) : "No se pudo actualizar." };
  }
  revalidatePath("/inventario");
  revalidatePath(`/admin/productos/${data[0].producto_id}`);
  return { ok: true, mensaje: "Mínimo actualizado.", marca: Date.now() };
}

export async function asignarUbicacion(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  await requerirRol(["administrador"]);
  const productoId = String(datos.get("producto_id") ?? "");
  const ubicacionId = String(datos.get("ubicacion_id") ?? "");
  const solicitud = String(datos.get("solicitud_id") ?? "");
  const minima = validarCantidadNoNegativa(String(datos.get("cantidad_minima") ?? ""), "Cantidad mínima");
  const inicial = validarCantidadNoNegativa(String(datos.get("cantidad_inicial") ?? ""), "Stock inicial");
  if (!esUuid(productoId) || !esUuid(solicitud)) return { ok: false, mensaje: "Solicitud inválida. Recargue la página." };
  if (!esUuid(ubicacionId)) return { ok: false, mensaje: "Seleccione el almacén y la ubicación." };
  if (!minima.ok) return { ok: false, mensaje: minima.error };
  if (!inicial.ok) return { ok: false, mensaje: inicial.error };

  const supabase = await crearClienteServidor();
  const { error } = await supabase.rpc("asignar_producto_ubicacion", {
    p_producto_id: productoId,
    p_ubicacion_id: ubicacionId,
    p_cantidad_minima: minima.valor,
    p_cantidad_inicial: inicial.valor,
    p_solicitud_id: solicitud,
  });
  if (error) {
    registrarError("productos.asignar", error);
    return { ok: false, mensaje: mensajeDeError(error) };
  }
  revalidatePath("/inventario");
  revalidatePath(`/admin/productos/${productoId}`);
  return { ok: true, mensaje: "Producto asignado a la ubicación.", marca: Date.now() };
}

export async function quitarDeUbicacion(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  await requerirRol(["administrador"]);
  const inventarioId = String(datos.get("inventario_id") ?? "");
  if (!esUuid(inventarioId)) return { ok: false, mensaje: "Registro inválido." };

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.from("inventario").delete().eq("id", inventarioId).select("producto_id");
  if (error) {
    registrarError("productos.quitarUbicacion", error);
    if (error.code === "23503") {
      return { ok: false, mensaje: "No se puede quitar: esta ubicación tiene movimientos registrados (se conserva la trazabilidad)." };
    }
    return { ok: false, mensaje: mensajeDeError(error) };
  }
  if (!data?.length) return { ok: false, mensaje: "No se pudo quitar el registro." };
  revalidatePath("/inventario");
  revalidatePath(`/admin/productos/${data[0].producto_id}`);
  return { ok: true, mensaje: "Ubicación quitada del producto.", marca: Date.now() };
}

export async function eliminarProducto(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  await requerirRol(["administrador"]);
  const id = String(datos.get("id") ?? "");
  if (!esUuid(id)) return { ok: false, mensaje: "Producto inválido." };
  if (String(datos.get("confirmacion") ?? "") !== "ELIMINAR") {
    return { ok: false, mensaje: "Escriba ELIMINAR para confirmar." };
  }

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc("eliminar_producto", { p_producto_id: id });
  if (error) {
    registrarError("productos.eliminar", error);
    return { ok: false, mensaje: mensajeDeError(error) };
  }
  revalidatePath("/inventario");
  revalidatePath("/admin/productos");
  redirect(`/admin/productos?resultado=${data === "archivado" ? "archivado" : "eliminado"}`);
}

export async function reactivarProducto(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  await requerirRol(["administrador"]);
  const id = String(datos.get("id") ?? "");
  if (!esUuid(id)) return { ok: false, mensaje: "Producto inválido." };
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.from("productos").update({ activo: true }).eq("id", id).select("id");
  if (error || !data?.length) {
    if (error) registrarError("productos.reactivar", error);
    return { ok: false, mensaje: error ? mensajeDeError(error) : "No se pudo reactivar." };
  }
  revalidatePath("/inventario");
  revalidatePath(`/admin/productos/${id}`);
  return { ok: true, mensaje: "Producto reactivado.", marca: Date.now() };
}
