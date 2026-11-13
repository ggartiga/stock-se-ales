"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

/**
 * Diálogo modal accesible basado en <dialog>. En móvil se muestra como hoja
 * inferior (bottom sheet) y en pantallas grandes centrado.
 */
export function Dialogo({
  abierto,
  alCerrar,
  titulo,
  children,
  bloquearCierre = false,
}: {
  abierto: boolean;
  alCerrar: () => void;
  titulo: string;
  children: React.ReactNode;
  bloquearCierre?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (abierto && !d.open) d.showModal();
    if (!abierto && d.open) d.close();
  }, [abierto]);

  return (
    <dialog
      ref={ref}
      aria-label={titulo}
      onCancel={(e) => {
        e.preventDefault();
        if (!bloquearCierre) alCerrar();
      }}
      onClick={(e) => {
        if (e.target === ref.current && !bloquearCierre) alCerrar();
      }}
      className="m-0 mt-auto w-full max-w-none rounded-t-3xl bg-white p-0 text-tinta shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-[2px]
        sm:m-auto sm:max-w-lg sm:rounded-3xl"
    >
      {abierto && (
        <div className="max-h-[90dvh] overflow-y-auto px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 sm:p-6">
          <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-gray-200 sm:hidden" aria-hidden="true" />
          <div className="mb-4 flex items-start justify-between gap-3">
            <h2 className="text-xl font-extrabold leading-tight">{titulo}</h2>
            <button
              type="button"
              className="boton-icono -mr-2 -mt-2 shrink-0"
              onClick={alCerrar}
              disabled={bloquearCierre}
              aria-label="Cerrar"
            >
              <X className="size-6" />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}
