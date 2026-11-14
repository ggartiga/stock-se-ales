import { randomUUID } from "node:crypto";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Trash2 } from "lucide-react";
import { requerirRol } from "@/lib/sesion";
import { ROLES_GESTION_INVENTARIO } from "@/lib/dominio/permisos";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { listarAlmacenes } from "@/lib/consultas";
import { esUuid } from "@/lib/dominio/validacion";
import type { Producto } from "@/lib/tipos";
import { EncabezadoPagina } from "@/components/ui/EncabezadoPagina";
import { Alerta } from "@/components/ui/Alerta";
import { AccionConfirmada } from "@/components/admin/AccionConfirmada";
import { eliminarProducto, quitarDeUbicacion, reactivarProducto } from "../acciones";
import { FormularioAsignar, FormularioEditarProducto, FormularioMinimo } from "./Formularios";

export const metadata = { title: "Editar producto" };

interface FilaInventario {
  id: string;
  cantidad_actual: number;
  cantidad_minima: number;
  ubicacion: { id: string; codigo_ubicacion: string; almacen: { nombre: string } };
}

export default async function PaginaEditarProducto({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ creado?: string }>;
}) {
  await requerirRol(ROLES_GESTION_INVENTARIO);
  const { id } = await params;
  const { creado } = await searchParams;
  if (!esUuid(id)) notFound();

  const supabase = await crearClienteServidor();
  const [{ data: producto }, { data: inventario }, { count: movimientos }, almacenes] = await Promise.all([
    supabase.from("productos").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("inventario")
      .select("id, cantidad_actual, cantidad_minima, ubicacion:ubicaciones!inner(id, codigo_ubicacion, almacen:almacenes!inner(nombre))")
      .eq("producto_id", id),
    supabase.from("movimientos").select("id", { count: "exact", head: true }).eq("producto_id", id),
    listarAlmacenes({ soloActivos: true }),
  ]);
  if (!producto) notFound();
  const p = producto as Producto;
  const filas = (inventario ?? []) as unknown as FilaInventario[];

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <EncabezadoPagina
        titulo={p.elemento}
        volver="/admin/productos"
        descripcion={<span className="font-mono">SAP {p.codigo_sap}</span>}
        acciones={
          p.activo && (
            <Link href={`/inventario/${p.id}`} className="boton-secundario">
              <ExternalLink className="size-4" aria-hidden="true" /> Ver en inventario
            </Link>
          )
        }
      />

      {creado && <Alerta tipo="exito">Producto creado correctamente.</Alerta>}
      {!p.activo && (
        <div className="space-y-3">
          <Alerta tipo="info">Producto archivado: no aparece en el inventario ni admite movimientos.</Alerta>
          <AccionConfirmada
            accion={reactivarProducto}
            campos={{ id: p.id }}
            variante="secundario"
            textoBoton="Reactivar producto"
            titulo="Reactivar producto"
            descripcion="El producto volverá a aparecer en el inventario."
            textoConfirmar="Reactivar"
          />
        </div>
      )}

      <section className="tarjeta p-5">
        <h2 className="text-lg font-bold">Datos del producto</h2>
        <FormularioEditarProducto producto={p} />
      </section>

      <section className="tarjeta p-5">
        <h2 className="text-lg font-bold">Ubicaciones y cantidad mínima</h2>
        <p className="mt-1 text-sm text-tinta-suave">
          El stock actual sólo cambia mediante movimientos (retiros e ingresos) para mantener la trazabilidad.
        </p>
        <ul className="mt-4 space-y-3">
          {filas.length === 0 && <li className="text-tinta-suave">Sin ubicaciones asignadas.</li>}
          {filas.map((f) => (
            <li key={f.id} className="rounded-xl border border-borde p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">
                  {f.ubicacion.almacen.nombre} · <span className="text-marca-600">{f.ubicacion.codigo_ubicacion}</span>
                </p>
                <p className="text-sm">
                  Stock actual: <strong className="tabular-nums">{f.cantidad_actual}</strong>
                </p>
              </div>
              <div className="mt-2 flex flex-wrap items-end gap-2">
                <FormularioMinimo inventarioId={f.id} minima={f.cantidad_minima} />
                <AccionConfirmada
                  accion={quitarDeUbicacion}
                  campos={{ inventario_id: f.id }}
                  variante="secundario"
                  textoBoton="Quitar"
                  titulo="Quitar de la ubicación"
                  descripcion="Sólo es posible si este registro no tiene movimientos. Si los tiene, se conserva para no perder el historial."
                  textoConfirmar="Quitar"
                />
              </div>
            </li>
          ))}
        </ul>
        {p.activo && (
          <div className="mt-5 border-t border-borde pt-5">
            <h3 className="font-bold">Agregar a otra ubicación</h3>
            <FormularioAsignar productoId={p.id} almacenes={almacenes} excluir={filas.map((f) => f.ubicacion.id)} solicitudId={randomUUID()} />
          </div>
        )}
      </section>

      {p.activo && (
        <section className="tarjeta border-red-200 p-5">
          <h2 className="text-lg font-bold text-red-700">Eliminar producto</h2>
          <p className="mt-1 text-sm text-tinta-suave">
            {movimientos && movimientos > 0
              ? `Tiene ${movimientos} movimiento(s) registrado(s): se ARCHIVARÁ para conservar el historial.`
              : "No tiene movimientos: se eliminará definitivamente junto con sus registros de inventario."}
          </p>
          <div className="mt-4">
            <AccionConfirmada
              accion={eliminarProducto}
              campos={{ id: p.id }}
              textoBoton="Eliminar producto"
              icono={<Trash2 className="size-5" aria-hidden="true" />}
              titulo={`Eliminar “${p.elemento}”`}
              descripcion="Esta acción requiere confirmación. Los movimientos históricos nunca se eliminan."
              textoConfirmar="Eliminar"
              palabraClave="ELIMINAR"
            />
          </div>
        </section>
      )}
    </div>
  );
}
