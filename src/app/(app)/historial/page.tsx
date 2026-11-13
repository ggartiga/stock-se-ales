import Link from "next/link";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { requerirPerfil } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { parsearFiltrosHistorial, serializarFiltrosHistorial, TAMANO_PAGINA_HISTORIAL, textoSeguroParaIlike } from "@/lib/filtros";
import { hoyEnZona, rangoDeFechas } from "@/lib/dominio/fechas";
import { permisos } from "@/lib/dominio/permisos";
import { registrarError } from "@/lib/registro";
import type { Movimiento } from "@/lib/tipos";
import { ListaMovimientos } from "@/components/historial/ListaMovimientos";
import { Alerta } from "@/components/ui/Alerta";

export const metadata = { title: "Historial de movimientos" };

function haceDias(hoy: string, dias: number): string {
  const d = new Date(`${hoy}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - dias);
  return d.toISOString().slice(0, 10);
}

export default async function PaginaHistorial({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const perfil = await requerirPerfil();
  const filtros = parsearFiltrosHistorial(await searchParams);
  const rango = rangoDeFechas(filtros.desde, filtros.hasta);
  const hoy = hoyEnZona();

  const supabase = await crearClienteServidor();
  const desdeFila = (filtros.pagina - 1) * TAMANO_PAGINA_HISTORIAL;

  // RLS decide el alcance: un trabajador sólo recibe sus propios movimientos.
  let consulta = supabase
    .from("movimientos")
    .select("*", { count: "exact" })
    .order("fecha_hora", { ascending: false })
    .order("id", { ascending: false })
    .range(desdeFila, desdeFila + TAMANO_PAGINA_HISTORIAL - 1);
  if (!rango.error && rango.desde) consulta = consulta.gte("fecha_hora", rango.desde);
  if (!rango.error && rango.hasta) consulta = consulta.lt("fecha_hora", rango.hasta);
  if (filtros.tipo) consulta = consulta.eq("tipo_movimiento", filtros.tipo);
  const texto = textoSeguroParaIlike(filtros.q);
  if (texto) {
    consulta = consulta.or(
      `codigo_sap.ilike.%${texto}%,elemento.ilike.%${texto}%,trabajador.ilike.%${texto}%,correo_trabajador.ilike.%${texto}%,codigo_ubicacion.ilike.%${texto}%`,
    );
  }

  const { data, count, error } = rango.error ? { data: [], count: 0, error: null } : await consulta;
  if (error) registrarError("historial.consultar", error);
  const movimientos = (data ?? []) as Movimiento[];
  const total = count ?? 0;
  const paginas = Math.max(1, Math.ceil(total / TAMANO_PAGINA_HISTORIAL));
  const verTodo = permisos.verHistorialCompleto(perfil.rol);

  const atajos = [
    { texto: "Hoy", desde: hoy, hasta: hoy },
    { texto: "Últimos 7 días", desde: haceDias(hoy, 6), hasta: hoy },
    { texto: "Últimos 30 días", desde: haceDias(hoy, 29), hasta: hoy },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="titulo-pagina">Historial de movimientos</h1>
        <p className="mt-1 text-tinta-suave">
          {verTodo ? "Movimientos de todos los trabajadores" : "Sus movimientos registrados"} · más recientes primero
        </p>
      </div>

      <form className="tarjeta grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_10rem_1.5fr_auto] lg:items-end" role="search">
        <div>
          <label htmlFor="h-desde" className="etiqueta">
            Desde
          </label>
          <input id="h-desde" name="desde" type="date" max={hoy} defaultValue={filtros.desde ?? ""} className="campo" />
        </div>
        <div>
          <label htmlFor="h-hasta" className="etiqueta">
            Hasta
          </label>
          <input id="h-hasta" name="hasta" type="date" max={hoy} defaultValue={filtros.hasta ?? ""} className="campo" />
        </div>
        <div>
          <label htmlFor="h-tipo" className="etiqueta">
            Tipo
          </label>
          <select id="h-tipo" name="tipo" defaultValue={filtros.tipo ?? ""} className="campo">
            <option value="">Todos</option>
            <option value="RETIRO">Retiro</option>
            <option value="INGRESO">Ingreso</option>
            <option value="AJUSTE">Ajuste</option>
          </select>
        </div>
        <div>
          <label htmlFor="h-q" className="etiqueta">
            Buscar
          </label>
          <input id="h-q" name="q" type="search" defaultValue={filtros.q} placeholder="SAP, elemento, trabajador, ubicación" className="campo" />
        </div>
        <button type="submit" className="boton-primario">
          <Search className="size-5" aria-hidden="true" /> Filtrar
        </button>
        <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-5">
          {atajos.map((a) => {
            const activo = filtros.desde === a.desde && filtros.hasta === a.hasta;
            return (
              <Link
                key={a.texto}
                href={`/historial${serializarFiltrosHistorial({ ...filtros, desde: a.desde, hasta: a.hasta, pagina: 1 })}`}
                className={`rounded-full px-3.5 py-2 text-sm font-semibold ring-1 ring-inset ${activo ? "bg-marca-500 text-white ring-marca-500" : "bg-white ring-borde hover:bg-gray-50"}`}
              >
                {a.texto}
              </Link>
            );
          })}
          {(filtros.desde || filtros.hasta || filtros.tipo || filtros.q) && (
            <Link href="/historial" className="rounded-full px-3.5 py-2 text-sm font-semibold text-marca-600 hover:underline">
              Limpiar filtros
            </Link>
          )}
        </div>
      </form>

      {rango.error && <Alerta tipo="error">{rango.error}</Alerta>}
      {error && <Alerta tipo="error">No se pudo cargar el historial. Intente nuevamente.</Alerta>}

      <p className="text-sm text-tinta-suave" aria-live="polite">
        {total} {total === 1 ? "movimiento" : "movimientos"}
        {paginas > 1 && ` · página ${filtros.pagina} de ${paginas}`}
      </p>

      <ListaMovimientos movimientos={movimientos} />

      {paginas > 1 && (
        <nav className="flex items-center justify-between gap-2" aria-label="Paginación">
          {filtros.pagina > 1 ? (
            <Link href={`/historial${serializarFiltrosHistorial({ ...filtros, pagina: filtros.pagina - 1 })}`} className="boton-secundario">
              <ChevronLeft className="size-5" aria-hidden="true" /> Anterior
            </Link>
          ) : (
            <span />
          )}
          {filtros.pagina < paginas && (
            <Link href={`/historial${serializarFiltrosHistorial({ ...filtros, pagina: filtros.pagina + 1 })}`} className="boton-secundario">
              Siguiente <ChevronRight className="size-5" aria-hidden="true" />
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
