import Link from "next/link";
import { Archive, ChevronRight, Plus, Search } from "lucide-react";
import { requerirRol } from "@/lib/sesion";
import { ROLES_GESTION_INVENTARIO } from "@/lib/dominio/permisos";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { textoSeguroParaIlike } from "@/lib/filtros";
import { EncabezadoPagina } from "@/components/ui/EncabezadoPagina";
import { Alerta } from "@/components/ui/Alerta";

export const metadata = { title: "Administración de productos" };

interface FilaProducto {
  id: string;
  codigo_sap: string;
  elemento: string;
  activo: boolean;
  es_prueba: boolean;
  inventario: { cantidad_actual: number }[];
}

export default async function PaginaAdminProductos({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; archivados?: string; resultado?: string }>;
}) {
  await requerirRol(ROLES_GESTION_INVENTARIO);
  const { q = "", archivados, resultado } = await searchParams;
  const verArchivados = archivados === "1";
  const texto = textoSeguroParaIlike(q.slice(0, 100));

  const supabase = await crearClienteServidor();
  let consulta = supabase
    .from("productos")
    .select("id, codigo_sap, elemento, activo, es_prueba, inventario(cantidad_actual)")
    .eq("activo", !verArchivados)
    .order("elemento")
    .limit(300);
  if (texto) consulta = consulta.or(`codigo_sap.ilike.%${texto}%,elemento.ilike.%${texto}%,descripcion.ilike.%${texto}%`);
  const { data, error } = await consulta;
  const productos = (data ?? []) as FilaProducto[];

  return (
    <div className="space-y-4">
      <EncabezadoPagina
        titulo="Administración de productos"
        volver="/mas-acciones"
        acciones={
          <Link href="/admin/productos/nuevo" className="boton-primario">
            <Plus className="size-5" aria-hidden="true" /> Nuevo producto
          </Link>
        }
      />

      {resultado === "eliminado" && <Alerta tipo="exito">Producto eliminado.</Alerta>}
      {resultado === "archivado" && (
        <Alerta tipo="exito">El producto tenía movimientos registrados: se archivó para conservar el historial.</Alerta>
      )}
      {error && <Alerta tipo="error">No se pudo cargar la lista de productos.</Alerta>}

      <form className="tarjeta flex flex-col gap-2 p-3 sm:flex-row" role="search">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-gray-400" aria-hidden="true" />
          <input name="q" defaultValue={q} type="search" placeholder="Código SAP, elemento o descripción" className="campo pl-11" aria-label="Buscar productos" />
        </div>
        {verArchivados && <input type="hidden" name="archivados" value="1" />}
        <button type="submit" className="boton-secundario">
          Buscar
        </button>
      </form>

      <div className="flex gap-2 text-sm font-semibold">
        <Link href="/admin/productos" className={`rounded-full px-4 py-2 ${!verArchivados ? "bg-marca-500 text-white" : "bg-white ring-1 ring-borde"}`}>
          Activos
        </Link>
        <Link
          href="/admin/productos?archivados=1"
          className={`inline-flex items-center gap-1 rounded-full px-4 py-2 ${verArchivados ? "bg-marca-500 text-white" : "bg-white ring-1 ring-borde"}`}
        >
          <Archive className="size-4" aria-hidden="true" /> Archivados
        </Link>
      </div>

      <ul className="tarjeta divide-y divide-borde overflow-hidden">
        {productos.length === 0 && <li className="p-6 text-center text-tinta-suave">No hay productos.</li>}
        {productos.map((p) => {
          const total = p.inventario.reduce((s, i) => s + i.cantidad_actual, 0);
          return (
            <li key={p.id}>
              <Link href={`/admin/productos/${p.id}`} className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-gray-50">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">
                    {p.elemento}
                    {p.es_prueba && <span className="ml-2 rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-bold uppercase text-gray-600">Prueba</span>}
                  </p>
                  <p className="font-mono text-sm text-tinta-suave">SAP {p.codigo_sap}</p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-bold tabular-nums">{total} u.</p>
                  <p className="text-tinta-suave">
                    {p.inventario.length} {p.inventario.length === 1 ? "ubicación" : "ubicaciones"}
                  </p>
                </div>
                <ChevronRight className="size-5 text-gray-400" aria-hidden="true" />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
