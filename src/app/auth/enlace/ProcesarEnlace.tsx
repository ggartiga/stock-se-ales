"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { crearClienteNavegador } from "@/lib/supabase/navegador";
import { Alerta } from "@/components/ui/Alerta";
import { registrarError } from "@/lib/registro";

const DESTINO = "/cuenta?definir=1";

export function ProcesarEnlace() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    // Se quita el fragmento de la barra de direcciones para no dejar los tokens a la vista.
    window.history.replaceState(null, "", window.location.pathname);

    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");

    if (!accessToken || !refreshToken) {
      const codigo = params.get("error_code");
      setError(
        codigo === "otp_expired"
          ? "El enlace expiró o ya fue usado. Solicite uno nuevo."
          : "El enlace no es válido. Solicite uno nuevo.",
      );
      return;
    }

    crearClienteNavegador()
      .auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error: e }) => {
        if (e) {
          registrarError("auth.enlace.setSession", { message: e.message, code: e.code });
          setError("El enlace no es válido o expiró. Solicite uno nuevo.");
          return;
        }
        // Recarga completa para que el servidor lea la sesión recién guardada en cookies.
        window.location.replace(DESTINO);
      });
  }, []);

  if (!error) {
    return <p className="mt-6 text-tinta-suave">Verificando…</p>;
  }
  return (
    <div className="mt-6 space-y-4">
      <Alerta tipo="error">{error}</Alerta>
      <Link href="/login" className="boton-fantasma w-full">
        Volver a iniciar sesión
      </Link>
    </div>
  );
}
