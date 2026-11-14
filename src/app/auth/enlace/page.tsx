import type { Metadata } from "next";
import { PantallaAcceso } from "@/components/ui/PantallaAcceso";
import { ProcesarEnlace } from "./ProcesarEnlace";

export const metadata: Metadata = { title: "Verificando enlace" };

/**
 * Destino de los enlaces de recuperación e invitación enviados con la
 * plantilla predeterminada de Supabase. Supabase entrega la sesión en el
 * fragmento de la URL (#access_token=…), que sólo puede leer el navegador.
 * A diferencia del flujo PKCE, funciona aunque el enlace se abra en otro
 * navegador o dispositivo distinto del que lo solicitó.
 */
export default function PaginaEnlace() {
  return (
    <PantallaAcceso titulo="Verificando enlace" subtitulo="Un momento, por favor…">
      <ProcesarEnlace />
    </PantallaAcceso>
  );
}
