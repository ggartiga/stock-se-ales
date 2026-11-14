import { randomUUID } from "node:crypto";
import { requerirRol } from "@/lib/sesion";
import { ROLES_GESTION_INVENTARIO } from "@/lib/dominio/permisos";
import { listarAlmacenes } from "@/lib/consultas";
import { EncabezadoPagina } from "@/components/ui/EncabezadoPagina";
import { Alerta } from "@/components/ui/Alerta";
import { FormularioNuevoProducto } from "./FormularioNuevoProducto";

export const metadata = { title: "Nuevo producto" };

export default async function PaginaNuevoProducto() {
  await requerirRol(ROLES_GESTION_INVENTARIO);
  const almacenes = (await listarAlmacenes({ soloActivos: true })).filter((a) => a.ubicaciones.length > 0);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <EncabezadoPagina titulo="Nuevo producto" volver="/admin/productos" />
      {almacenes.length === 0 ? (
        <Alerta tipo="info">Primero cree al menos un almacén con una ubicación en “Administración de almacenes”.</Alerta>
      ) : (
        // El id de solicitud se genera al mostrar el formulario: un doble envío no duplica el stock inicial.
        <FormularioNuevoProducto almacenes={almacenes} solicitudId={randomUUID()} />
      )}
    </div>
  );
}
