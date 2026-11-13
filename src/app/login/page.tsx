import type { Metadata } from "next";
import { Logo } from "@/components/ui/Logo";
import { FormularioIngreso } from "./FormularioIngreso";
import { rutaInternaSegura } from "@/lib/dominio/permisos";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default async function PaginaLogin({
  searchParams,
}: {
  searchParams: Promise<{ siguiente?: string; error?: string }>;
}) {
  const params = await searchParams;
  const siguiente = rutaInternaSegura(params.siguiente);
  const errorEnlace = params.error === "enlace" ? "El enlace no es válido o expiró. Solicite uno nuevo." : null;

  return (
    <main className="flex min-h-dvh flex-col bg-white md:flex-row">
      <section className="relative flex flex-col justify-end overflow-hidden bg-marca-500 px-6 pb-8 pt-[max(2.5rem,env(safe-area-inset-top))] text-white md:w-1/2 md:justify-center md:p-14">
        <div className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-white/10" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-24 -left-10 size-72 rounded-full bg-black/5" aria-hidden="true" />
        <div className="relative">
          <div className="mb-6 inline-flex rounded-2xl bg-white p-1.5 shadow-lg">
            <Logo className="size-14" />
          </div>
          <h1 className="text-4xl font-black tracking-tight md:text-5xl">STOCK SEÑALES</h1>
          <p className="mt-2 max-w-sm text-lg font-medium text-white/90">
            Gestión y control de inventario de repuestos, componentes y equipos del área de Señales.
          </p>
        </div>
      </section>

      <section className="flex flex-1 items-start justify-center px-6 py-8 md:items-center md:py-14">
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-extrabold">Iniciar sesión</h2>
          <p className="mt-1 text-tinta-suave">Ingrese con su cuenta de trabajador.</p>
          <FormularioIngreso siguiente={siguiente} errorEnlace={errorEnlace} />
        </div>
      </section>
    </main>
  );
}
