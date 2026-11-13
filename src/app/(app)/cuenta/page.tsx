import { CircleUser } from "lucide-react";
import { requerirPerfil } from "@/lib/sesion";
import { ETIQUETA_ROL } from "@/lib/dominio/permisos";
import { FormularioContrasena } from "./FormularioContrasena";
import { Alerta } from "@/components/ui/Alerta";

export const metadata = { title: "Mi cuenta" };

export default async function PaginaCuenta({ searchParams }: { searchParams: Promise<{ definir?: string }> }) {
  const perfil = await requerirPerfil();
  const { definir } = await searchParams;

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <h1 className="titulo-pagina">Mi cuenta</h1>

      <section className="tarjeta flex items-center gap-4 p-5">
        <CircleUser className="size-14 shrink-0 text-marca-500" aria-hidden="true" />
        <div className="min-w-0">
          <p className="truncate text-lg font-bold">{perfil.nombre_completo}</p>
          <p className="truncate text-tinta-suave">{perfil.correo}</p>
          <p className="mt-1 inline-block rounded-full bg-marca-50 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-marca-700">
            {ETIQUETA_ROL[perfil.rol]}
          </p>
        </div>
      </section>
      <p className="text-sm text-tinta-suave">
        Su nombre y correo se registran automáticamente en cada movimiento. Si necesita corregirlos, solicítelo al administrador.
      </p>

      <section className="tarjeta p-5">
        <h2 className="text-lg font-bold">{definir ? "Defina su contraseña" : "Cambiar contraseña"}</h2>
        {definir && (
          <div className="mt-3">
            <Alerta tipo="info">Bienvenido/a. Cree una contraseña para sus próximos ingresos.</Alerta>
          </div>
        )}
        <FormularioContrasena />
      </section>
    </div>
  );
}
