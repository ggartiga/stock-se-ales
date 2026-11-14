import Link from "next/link";
import { MapPin, Printer, QrCode, Trash2, Warehouse } from "lucide-react";
import { requerirRol } from "@/lib/sesion";
import { ROLES_GESTION_INVENTARIO } from "@/lib/dominio/permisos";
import { listarAlmacenes } from "@/lib/consultas";
import { codigoCortoQR } from "@/lib/dominio/qr";
import { EncabezadoPagina } from "@/components/ui/EncabezadoPagina";
import { AccionConfirmada } from "@/components/admin/AccionConfirmada";
import { eliminarAlmacen, eliminarUbicacion } from "./acciones";
import { FormularioAlmacen, FormularioNuevaUbicacion, FormularioNuevoAlmacen, FormularioUbicacion } from "./Formularios";

export const metadata = { title: "Almacenes y ubicaciones" };

export default async function PaginaAlmacenes() {
  await requerirRol(ROLES_GESTION_INVENTARIO);
  const almacenes = await listarAlmacenes();

  return (
    <div className="space-y-5">
      <EncabezadoPagina
        titulo="Almacenes y ubicaciones"
        volver="/mas-acciones"
        descripcion="Cada ubicación (rack) tiene un código QR único para identificarla al escanear."
        acciones={
          <Link href="/admin/almacenes/qr" className="boton-secundario">
            <Printer className="size-5" aria-hidden="true" /> Imprimir todos los QR
          </Link>
        }
      />

      <section className="tarjeta p-5">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Warehouse className="size-5 text-marca-500" aria-hidden="true" /> Nuevo almacén
        </h2>
        <FormularioNuevoAlmacen />
      </section>

      {almacenes.map((a) => (
        <section key={a.id} className="tarjeta overflow-hidden">
          <div className="border-b border-borde bg-marca-50/60 p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-xl font-extrabold">
                <Warehouse className="size-6 text-marca-500" aria-hidden="true" />
                {a.nombre}
                {a.estado === "inactivo" && <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-bold uppercase text-gray-600">Inactivo</span>}
                {a.es_prueba && <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-bold uppercase text-gray-600">Prueba</span>}
              </h2>
              <div className="flex flex-wrap gap-2">
                <Link href={`/admin/almacenes/qr?almacen=${a.id}`} className="boton-secundario min-h-10 px-3 text-sm">
                  <Printer className="size-4" aria-hidden="true" /> QR del almacén
                </Link>
                {a.ubicaciones.length === 0 && (
                  <AccionConfirmada
                    accion={eliminarAlmacen}
                    campos={{ id: a.id }}
                    textoBoton="Eliminar"
                    icono={<Trash2 className="size-4" aria-hidden="true" />}
                    titulo={`Eliminar ${a.nombre}`}
                    descripcion="El almacén no tiene ubicaciones. Esta acción no se puede deshacer."
                    textoConfirmar="Eliminar"
                  />
                )}
              </div>
            </div>
            <FormularioAlmacen almacen={a} />
          </div>

          <div className="p-5">
            <h3 className="mb-3 flex items-center gap-2 font-bold">
              <MapPin className="size-5 text-marca-500" aria-hidden="true" /> Ubicaciones ({a.ubicaciones.length})
            </h3>
            <ul className="space-y-3">
              {a.ubicaciones.map((u) => (
                <li key={u.id} className={`rounded-xl border border-borde p-3 ${u.estado === "inactivo" ? "bg-gray-50" : ""}`}>
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="flex items-center gap-2 text-lg font-black">
                      {u.codigo_ubicacion}
                      <span className="inline-flex items-center gap-1 rounded bg-fondo px-1.5 py-0.5 font-mono text-xs font-semibold text-tinta-suave">
                        <QrCode className="size-3.5" aria-hidden="true" />
                        {codigoCortoQR(u.identificador_qr)}
                      </span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/escanear?u=${u.identificador_qr}`} className="boton-fantasma min-h-10 text-sm">
                        Ver productos
                      </Link>
                      <Link href={`/admin/almacenes/qr?ubicacion=${u.id}`} className="boton-secundario min-h-10 px-3 text-sm">
                        <Printer className="size-4" aria-hidden="true" /> QR
                      </Link>
                      <AccionConfirmada
                        accion={eliminarUbicacion}
                        campos={{ id: u.id }}
                        variante="secundario"
                        textoBoton="Eliminar"
                        titulo={`Eliminar ubicación ${u.codigo_ubicacion}`}
                        descripcion="Sólo es posible si no tiene productos ni movimientos. El QR impreso dejará de funcionar."
                        textoConfirmar="Eliminar"
                      />
                    </div>
                  </div>
                  <FormularioUbicacion ubicacion={u} />
                </li>
              ))}
            </ul>
            <div className="mt-4 border-t border-borde pt-4">
              <h4 className="font-semibold">Agregar ubicación a {a.nombre}</h4>
              <FormularioNuevaUbicacion almacenId={a.id} />
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
