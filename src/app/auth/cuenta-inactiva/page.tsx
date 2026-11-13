import { Lock } from "lucide-react";
import { cerrarSesion } from "@/app/auth/acciones";

export const metadata = { title: "Cuenta sin acceso" };

export default function PaginaCuentaInactiva() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="tarjeta max-w-md p-8 text-center">
        <Lock className="mx-auto size-12 text-marca-500" aria-hidden="true" />
        <h1 className="mt-4 text-2xl font-extrabold">Cuenta sin acceso</h1>
        <p className="mt-2 text-tinta-suave">
          Su cuenta está desactivada o aún no tiene un perfil asignado. Contacte al administrador de STOCK SEÑALES.
        </p>
        <form action={cerrarSesion} className="mt-6">
          <button type="submit" className="boton-primario w-full">
            Cerrar sesión
          </button>
        </form>
      </div>
    </main>
  );
}
