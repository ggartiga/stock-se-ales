"use client";

import { Printer } from "lucide-react";

export function BotonImprimir() {
  return (
    <button type="button" className="boton-primario" onClick={() => window.print()}>
      <Printer className="size-5" aria-hidden="true" /> Imprimir
    </button>
  );
}
