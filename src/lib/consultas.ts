import "server-only";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { registrarError } from "@/lib/registro";
import type { FiltrosInventario } from "@/lib/filtros";
import type { Almacen, ItemInventario, Ubicacion } from "@/lib/tipos";

/** Consultas de lectura reutilizadas por las páginas (todas pasan por RLS). */

export async function consultarInventario(f: FiltrosInventario): Promise<{ items: ItemInventario[]; error: boolean }> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc("buscar_inventario", {
    p_texto: f.q || null,
    p_campo: f.campo,
    p_almacen_id: f.almacen,
    p_ubicacion_id: f.ubicacion,
    p_estado: f.estado,
  });
  if (error) registrarError("consultas.inventario", error);
  return { items: (data ?? []) as ItemInventario[], error: Boolean(error) };
}

export type AlmacenConUbicaciones = Almacen & { ubicaciones: Ubicacion[] };

export async function listarAlmacenes(opciones: { soloActivos?: boolean } = {}): Promise<AlmacenConUbicaciones[]> {
  const supabase = await crearClienteServidor();
  let consulta = supabase
    .from("almacenes")
    .select("id, nombre, codigo, estado, es_prueba, ubicaciones(id, almacen_id, codigo_ubicacion, identificador_qr, descripcion, estado)")
    .order("nombre")
    .order("codigo_ubicacion", { referencedTable: "ubicaciones" });
  if (opciones.soloActivos) consulta = consulta.eq("estado", "activo");
  const { data, error } = await consulta;
  if (error) {
    registrarError("consultas.almacenes", error);
    return [];
  }
  const almacenes = (data ?? []) as AlmacenConUbicaciones[];
  if (opciones.soloActivos) {
    for (const a of almacenes) a.ubicaciones = a.ubicaciones.filter((u) => u.estado === "activo");
  }
  return almacenes;
}

export interface UbicacionResuelta {
  id: string;
  codigo_ubicacion: string;
  descripcion: string | null;
  estado: "activo" | "inactivo";
  identificador_qr: string;
  almacen: { id: string; nombre: string; codigo: string; estado: "activo" | "inactivo" };
}

/** Resuelve el identificador único impreso en un QR a su almacén y ubicación. */
export async function resolverUbicacionQR(identificadorQr: string): Promise<UbicacionResuelta | null> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from("ubicaciones")
    .select("id, codigo_ubicacion, descripcion, estado, identificador_qr, almacen:almacenes!inner(id, nombre, codigo, estado)")
    .eq("identificador_qr", identificadorQr)
    .maybeSingle();
  if (error) registrarError("consultas.resolverQR", error);
  return (data as UbicacionResuelta | null) ?? null;
}
