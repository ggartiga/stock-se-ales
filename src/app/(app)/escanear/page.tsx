import Link from "next/link";
import { MapPin, ScanLine, Warehouse } from "lucide-react";
import { requerirPerfil } from "@/lib/sesion";
import { consultarInventario, listarAlmacenes, resolverUbicacionQR } from "@/lib/consultas";
import { esUuid } from "@/lib/dominio/validacion";
import { resumirEstados } from "@/lib/dominio/stock";
import { EscanerQR } from "@/components/qr/EscanerQR";
import { SelectorManualUbicacion } from "@/components/qr/SelectorManualUbicacion";
import { ListaInventario } from "@/components/inventario/ListaInventario";
import { Alerta } from "@/components/ui/Alerta";

export const metadata = { title: "Escanear QR" };

/**
 * /escanear            → lector QR
 * /escanear?u=<id QR>  → sólo los productos de esa ubicación (rack).
 * Escanear otro QR reemplaza el parámetro: el filtro anterior se limpia.
 */
export default async function PaginaEscanear({ searchParams }: { searchParams: Promise<{ u?: string }> }) {
  await requerirPerfil();
  const { u } = await searchParams;

  if (u !== undefined) {
    const ubicacion = esUuid(u) ? await resolverUbicacionQR(u.toLowerCase()) : null;

    if (ubicacion) {
      const { items, error } = await consultarInventario({ q: "", campo: "todo", almacen: null, ubicacion: ubicacion.id, estado: null });
      const resumen = resumirEstados(items);
      const inactiva = ubicacion.estado !== "activo" || ubicacion.almacen.estado !== "activo";

      return (
        <div className="space-y-4">
          <section className="tarjeta overflow-hidden">
            <div className="flex items-center gap-4 bg-marca-500 p-5 text-white">
              <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-white text-2xl font-black text-marca-600">
                {ubicacion.codigo_ubicacion}
              </div>
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-white/90">
                  <Warehouse className="size-4" aria-hidden="true" /> {ubicacion.almacen.nombre}
                </p>
                <h1 className="flex items-center gap-1.5 text-2xl font-black">
                  <MapPin className="size-6" aria-hidden="true" /> Ubicación {ubicacion.codigo_ubicacion}
                </h1>
                {ubicacion.descripcion && <p className="truncate text-sm text-white/90">{ubicacion.descripcion}</p>}
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 p-4">
              <p className="text-sm text-tinta-suave">
                <strong className="text-tinta">{resumen.total}</strong> {resumen.total === 1 ? "producto" : "productos"} en este rack
                {resumen.sin_stock > 0 && <> · <strong className="text-red-600">{resumen.sin_stock} sin stock</strong></>}
                {resumen.stock_bajo > 0 && <> · <strong className="text-orange-600">{resumen.stock_bajo} con stock bajo</strong></>}
              </p>
              <Link href="/escanear" className="boton-primario">
                <ScanLine className="size-5" aria-hidden="true" /> Escanear otro rack
              </Link>
            </div>
          </section>

          {inactiva && <Alerta tipo="info">Esta ubicación o su almacén están inactivos: no se permiten retiros.</Alerta>}
          {error && <Alerta tipo="error">No se pudo consultar el inventario de esta ubicación.</Alerta>}

          <ListaInventario items={items} mostrarUbicacion={false} mensajeVacio="No hay productos registrados en esta ubicación." />
        </div>
      );
    }

    // QR inválido o ubicación inexistente: se informa y se vuelve a ofrecer el lector.
    const almacenes = await listarAlmacenes({ soloActivos: true });
    return (
      <div className="space-y-4">
        <h1 className="titulo-pagina">Escanear QR</h1>
        <Alerta tipo="error">El código escaneado no corresponde a ninguna ubicación registrada. Puede haber sido eliminada o la etiqueta estar dañada.</Alerta>
        <EscanerQR iniciarAutomaticamente={false} />
        <SelectorManualUbicacion almacenes={almacenes} />
      </div>
    );
  }

  const almacenes = await listarAlmacenes({ soloActivos: true });
  return (
    <div className="space-y-4">
      <div className="text-center">
        <h1 className="titulo-pagina">Escanear QR del rack</h1>
        <p className="mt-1 text-tinta-suave">Se mostrarán sólo los productos almacenados en esa ubicación.</p>
      </div>
      <EscanerQR />
      <SelectorManualUbicacion almacenes={almacenes} />
    </div>
  );
}
