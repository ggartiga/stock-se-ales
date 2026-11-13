"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";
import { registrarError } from "@/lib/registro";

/** Límite de errores global: registra el error y ofrece reintentar. */
export default function ErrorGlobal({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    registrarError("ui.limite-errores", error, { digest: error.digest });
  }, [error]);

  return (
    <main className="flex min-h-[60dvh] items-center justify-center p-6">
      <div className="tarjeta max-w-md p-8 text-center">
        <TriangleAlert className="mx-auto size-12 text-marca-500" aria-hidden="true" />
        <h1 className="mt-4 text-xl font-extrabold">No se pudo cargar esta sección</h1>
        <p className="mt-2 text-tinta-suave">Revise su conexión e intente nuevamente.</p>
        {error.digest && <p className="mt-2 font-mono text-xs text-gray-400">Ref.: {error.digest}</p>}
        <button type="button" onClick={reset} className="boton-primario mt-6 w-full">
          Reintentar
        </button>
      </div>
    </main>
  );
}
