"use client";

import { useState } from "react";
import { PackageSearch } from "lucide-react";
import { TarjetaProducto } from "./TarjetaProducto";
import { ModalRetiro } from "@/components/retiro/ModalRetiro";
import type { ItemInventario } from "@/lib/tipos";

/** Grilla de tarjetas + formulario de retiro. */
export function ListaInventario({
  items,
  mostrarUbicacion = true,
  mensajeVacio = "No se encontraron productos con los filtros aplicados.",
  volverA,
}: {
  items: ItemInventario[];
  mostrarUbicacion?: boolean;
  mensajeVacio?: string;
  /** Ruta a la que volver después de un retiro exitoso. */
  volverA?: string;
}) {
  // Se guarda el último objeto conocido, pero se muestra la versión más reciente
  // de la lista (tras refrescar, el stock mostrado en el formulario se actualiza).
  const [seleccionado, setSeleccionado] = useState<ItemInventario | null>(null);
  const actual = seleccionado ? (items.find((i) => i.inventario_id === seleccionado.inventario_id) ?? seleccionado) : null;

  return (
    <>
      {items.length === 0 ? (
        <div className="tarjeta flex flex-col items-center gap-2 px-6 py-12 text-center">
          <PackageSearch className="size-12 text-gray-300" aria-hidden="true" />
          <p className="font-semibold text-tinta-suave">{mensajeVacio}</p>
        </div>
      ) : (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <TarjetaProducto key={item.inventario_id} item={item} alRetirar={setSeleccionado} mostrarUbicacion={mostrarUbicacion} />
        ))}
      </div>
      )}
      <ModalRetiro item={actual} alCerrar={() => setSeleccionado(null)} volverA={volverA} />
    </>
  );
}
