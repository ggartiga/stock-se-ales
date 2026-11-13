"use client";

import { useFormStatus } from "react-dom";
import { LoaderCircle } from "lucide-react";

/**
 * Botón de envío que se deshabilita mientras la acción está en curso
 * (evita envíos duplicados por pulsaciones repetidas).
 */
export function BotonEnviar({
  children,
  textoEnviando = "Guardando…",
  variante = "primario",
  className = "",
  ...resto
}: {
  children: React.ReactNode;
  textoEnviando?: string;
  variante?: "primario" | "secundario" | "peligro";
  className?: string;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "type" | "children">) {
  const { pending } = useFormStatus();
  const clase = variante === "primario" ? "boton-primario" : variante === "peligro" ? "boton-peligro" : "boton-secundario";
  return (
    <button type="submit" className={`${clase} ${className}`} disabled={pending || resto.disabled} aria-busy={pending} {...resto}>
      {pending ? (
        <>
          <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
          {textoEnviando}
        </>
      ) : (
        children
      )}
    </button>
  );
}
