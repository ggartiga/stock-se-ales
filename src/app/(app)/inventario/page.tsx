import Link from "next/link";
import { Plus, ScanLine } from "lucide-react";
import { requerirPerfil } from "@/lib/sesion";
import { consultarInventario, listarAlmacenes } from "@/lib/consultas";
import { parsearFiltrosInventario } from "@/lib/filtros";
import { resumirEstados } from "@/lib/dominio/stock";
import { permisos } from "@/lib/dominio/permisos";
import { FiltrosInventarioPanel } from "@/components/inventario/FiltrosInventario";
import { ResumenEstados } from "@/components/inventario/ResumenEstados";
import { ListaInventario } from "@/components/inventario/ListaInventario";
import { Alerta } from "@/components/ui/Alerta";

export const metadata = { title: "Inventario" };

export default async function PaginaInventario({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const perfil = await requerirPerfil();
  const params = await searchParams;
  const filtros = parsearFiltrosInventario(params);

  // Una consulta sin el filtro de estado: alimenta el resumen y luego se filtra por estado.
  const [{ items: todos, error }, almacenes] = await Promise.all([
    consultarInventario({ ...filtros, estado: null }),
    listarAlmacenes(),
  ]);
  const items = filtros.estado ? todos.filter((i) => i.estado_stock === filtros.estado) : todos;
  const resumen = resumirEstados(todos);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-marca-600">Inventario</p>
          <h1 className="titulo-pagina">STOCK SEÑALES</h1>
        </div>
        <div className="flex gap-2">
          <Link href="/escanear" className="boton-secundario">
            <ScanLine className="size-5 text-marca-500" aria-hidden="true" />
            Escanear rack
          </Link>
          {permisos.administrarInventario(perfil.rol) && (
            <Link href="/admin/productos/nuevo" className="boton-primario">
              <Plus className="size-5" aria-hidden="true" />
              <span className="hidden sm:inline">Nuevo producto</span>
              <span className="sm:hidden">Nuevo</span>
            </Link>
          )}
        </div>
      </div>

      {params.aviso === "sin-permiso" && <Alerta tipo="error">No tiene permisos para acceder a esa sección.</Alerta>}
      {error && <Alerta tipo="error">No se pudo consultar el inventario. Revise su conexión e intente nuevamente.</Alerta>}

      <ResumenEstados resumen={resumen} filtros={filtros} base="/inventario" />
      <FiltrosInventarioPanel filtros={filtros} almacenes={almacenes} totalResultados={items.length} />
      <ListaInventario items={items} />
    </div>
  );
}
