import type { Metadata } from "next";
import { PantallaAcceso } from "@/components/ui/PantallaAcceso";
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
    <PantallaAcceso titulo="Iniciar sesión" subtitulo="Ingrese con su cuenta de trabajador.">
      <FormularioIngreso siguiente={siguiente} errorEnlace={errorEnlace} />
    </PantallaAcceso>
  );
}
