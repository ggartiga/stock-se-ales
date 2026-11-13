import Link from "next/link";
import { MapPin, PackageMinus, Warehouse } from "lucide-react";
import { COLOR_NUMERO_ESTADO, InsigniaEstado } from "@/components/ui/InsigniaEstado";
import type { ItemInventario } from "@/lib/tipos";

/** Tarjeta de un producto en una ubicación: nombre, estado, stock actual/mínimo y RETIRAR. */
export function TarjetaProducto({
  item,
  alRetirar,
  mostrarUbicacion = true,
}: {
  item: ItemInventario;
  alRetirar: (item: ItemInventario) => void;
  mostrarUbicacion?: boolean;
}) {
  const sinStock = item.cantidad_actual <= 0;
  const inactiva = item.ubicacion_estado !== "activo" || item.almacen_estado !== "activo";

  return (
    <article className="tarjeta flex flex-col p-4" aria-label={`${item.elemento}, ${item.almacen_nombre} ${item.codigo_ubicacion}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="line-clamp-2 text-lg font-bold leading-snug">{item.elemento}</h3>
          <p className="mt-0.5 font-mono text-sm text-tinta-suave">SAP {item.codigo_sap}</p>
        </div>
        <InsigniaEstado estado={item.estado_stock} />
      </div>

      {item.descripcion && <p className="mt-2 line-clamp-2 text-sm text-tinta-suave">{item.descripcion}</p>}

      {mostrarUbicacion && (
        <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-medium">
          <span className="inline-flex items-center gap-1">
            <Warehouse className="size-4 text-marca-500" aria-hidden="true" />
            {item.almacen_nombre}
          </span>
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-4 text-marca-500" aria-hidden="true" />
            {item.codigo_ubicacion}
          </span>
          {item.es_prueba && <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-600">Prueba</span>}
        </p>
      )}

      <dl className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-fondo p-3">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-tinta-suave">Stock actual</dt>
          <dd className={`text-3xl font-black tabular-nums ${COLOR_NUMERO_ESTADO[item.estado_stock]}`}>{item.cantidad_actual}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-tinta-suave">Mínimo</dt>
          <dd className="text-3xl font-black tabular-nums text-tinta-suave">{item.cantidad_minima}</dd>
        </div>
      </dl>

      <div className="mt-auto grid grid-cols-[auto_1fr] gap-2 pt-3">
        <Link href={`/inventario/${item.producto_id}`} className="boton-secundario px-4">
          Detalles
        </Link>
        <button
          type="button"
          className="boton-primario tracking-wide"
          onClick={() => alRetirar(item)}
          disabled={sinStock || inactiva}
          title={inactiva ? "Ubicación o almacén inactivo" : undefined}
        >
          <PackageMinus className="size-5" aria-hidden="true" />
          {sinStock ? "SIN STOCK" : "RETIRAR"}
        </button>
      </div>
    </article>
  );
}
