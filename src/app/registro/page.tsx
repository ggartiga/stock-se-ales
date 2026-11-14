import type { Metadata } from "next";
import { PantallaAcceso } from "@/components/ui/PantallaAcceso";
import { FormularioRegistro } from "./FormularioRegistro";

export const metadata: Metadata = { title: "Crear cuenta" };

export default function PaginaRegistro() {
  return (
    <PantallaAcceso titulo="Crear cuenta" subtitulo="Regístrese con su correo de trabajo para ingresar.">
      <FormularioRegistro />
    </PantallaAcceso>
  );
}
