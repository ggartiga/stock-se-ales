import Link from "next/link";
import { ChevronRight, Clock, Lock } from "lucide-react";
import { requerirPerfil } from "@/lib/sesion";
import { MAS_ACCIONES, accesoOpcion } from "@/lib/navegacion";
import { IconoOpcion } from "@/components/ui/Icono";
import { ETIQUETA_ROL } from "@/lib/dominio/permisos";

export const metadata = { title: "Más acciones" };

/**
 * Funciones adicionales. Las que aún no están desarrolladas se muestran como
 * "Próximamente" (sin enlace) y las administrativas se restringen por rol.
 */
export default async function PaginaMasAcciones() {
  const perfil = await requerirPerfil();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="titulo-pagina">Más acciones</h1>
        <p className="mt-1 text-tinta-suave">Su rol: {ETIQUETA_ROL[perfil.rol]}</p>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {MAS_ACCIONES.map((o) => {
          const acceso = accesoOpcion(o, perfil.rol);
          const contenido = (
            <>
              <span
                className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${
                  acceso === "permitido" ? "bg-marca-500 text-white" : "bg-gray-100 text-gray-400"
                }`}
              >
                <IconoOpcion nombre={o.icono} className="size-6" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold">{o.titulo}</span>
                <span className="block text-sm text-tinta-suave">{o.descripcion}</span>
              </span>
              {acceso === "permitido" && <ChevronRight className="size-5 text-gray-400" aria-hidden="true" />}
              {acceso === "pendiente" && (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-500">
                  <Clock className="size-3.5" aria-hidden="true" /> Próximamente
                </span>
              )}
              {acceso === "restringido" && (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-500">
                  <Lock className="size-3.5" aria-hidden="true" /> Restringido
                </span>
              )}
            </>
          );
          return (
            <li key={o.id}>
              {acceso === "permitido" ? (
                <Link href={o.href!} className="tarjeta flex min-h-20 items-center gap-3 p-4 transition hover:border-marca-300 hover:shadow-md">
                  {contenido}
                </Link>
              ) : (
                <div className="tarjeta flex min-h-20 items-center gap-3 p-4 opacity-75" aria-disabled="true">
                  {contenido}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
