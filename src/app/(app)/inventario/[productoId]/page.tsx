import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { requerirPerfil } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { esUuid } from "@/lib/dominio/validacion";
import { permisos } from "@/lib/dominio/permisos";
import { formatearFechaHora } from "@/lib/dominio/fechas";
import type { ItemInventario, Movimiento, Producto } from "@/lib/tipos";
import { EncabezadoPagina } from "@/components/ui/EncabezadoPagina";
import { ListaInventario } from "@/components/inventario/ListaInventario";
import { ListaMovimientos } from "@/components/historial/ListaMovimientos";
import { Alerta } from "@/components/ui/Alerta";

export const metadata = { title: "Detalle del producto" };

export default async function PaginaDetalleProducto({ params }: { params: Promise<{ productoId: string }> }) {
  const perfil = await requerirPerfil();
  const { productoId } = await params;
  if (!esUuid(productoId)) notFound();

  const supabase = await crearClienteServidor();
  const [{ data: producto }, { data: inventario }, { data: movimientos }] = await Promise.all([
    supabase.from("productos").select("*").eq("id", productoId).maybeSingle(),
    supabase.from("v_inventario").select("*").eq("producto_id", productoId).order("almacen_nombre").order("codigo_ubicacion"),
    supabase
      .from("movimientos")
      .select("*")
      .eq("producto_id", productoId)
      .order("fecha_hora", { ascending: false })
      .order("id", { ascending: false })
      .limit(10),
  ]);

  if (!producto) notFound();
  const p = producto as Producto;
  const items = (inventario ?? []) as ItemInventario[];
  const total = items.reduce((s, i) => s + i.cantidad_actual, 0);

  return (
    <div className="space-y-5">
      <EncabezadoPagina
        titulo={p.elemento}
        volver="/inventario"
        descripcion={<span className="font-mono">SAP {p.codigo_sap}</span>}
        acciones={
          permisos.administrarInventario(perfil.rol) && (
            <Link href={`/admin/productos/${p.id}`} className="boton-secundario">
              <Pencil className="size-4" aria-hidden="true" /> Editar
            </Link>
          )
        }
      />

      {!p.activo && <Alerta tipo="info">Este producto está archivado: no admite movimientos.</Alerta>}

      <section className="tarjeta grid gap-4 p-5 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-tinta-suave">Descripción</h2>
          <p className="mt-1 whitespace-pre-line">{p.descripcion || "Sin descripción."}</p>
          <p className="mt-3 text-xs text-tinta-suave">
            Creado {formatearFechaHora(p.fecha_creacion)} · Actualizado {formatearFechaHora(p.fecha_actualizacion)}
          </p>
        </div>
        <div className="rounded-xl bg-fondo p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-tinta-suave">Stock total</p>
          <p className="text-4xl font-black tabular-nums">{total}</p>
          <p className="text-sm text-tinta-suave">
            en {items.length} {items.length === 1 ? "ubicación" : "ubicaciones"}
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">Existencias por ubicación</h2>
        <ListaInventario items={items} volverA="/inventario" mensajeVacio="Este producto no está asignado a ninguna ubicación." />
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Últimos movimientos</h2>
          <Link href={`/historial?q=${encodeURIComponent(p.codigo_sap)}`} className="text-sm font-semibold text-marca-600 hover:underline">
            Ver todos
          </Link>
        </div>
        <ListaMovimientos movimientos={(movimientos ?? []) as Movimiento[]} />
      </section>
    </div>
  );
}
