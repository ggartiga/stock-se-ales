"use client";

import { useActionState, useEffect, useRef } from "react";
import { cambiarContrasena } from "@/app/auth/acciones";
import { BotonEnviar } from "@/components/ui/BotonEnviar";
import { MensajeFormulario } from "@/components/ui/Alerta";
import { ESTADO_INICIAL } from "@/lib/tipos";

export function FormularioContrasena() {
  const [estado, accion] = useActionState(cambiarContrasena, ESTADO_INICIAL);
  const formulario = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (estado.ok) formulario.current?.reset();
  }, [estado.marca, estado.ok]);

  return (
    <form ref={formulario} action={accion} className="mt-4 space-y-4">
      <div>
        <label htmlFor="clave" className="etiqueta">
          Nueva contraseña
        </label>
        <input id="clave" name="clave" type="password" autoComplete="new-password" minLength={8} required className="campo" />
        <p className="ayuda">Mínimo 8 caracteres, combinando letras y números.</p>
      </div>
      <div>
        <label htmlFor="confirmacion" className="etiqueta">
          Repetir contraseña
        </label>
        <input id="confirmacion" name="confirmacion" type="password" autoComplete="new-password" required className="campo" />
      </div>
      <MensajeFormulario estado={estado} />
      <BotonEnviar className="w-full sm:w-auto">Guardar contraseña</BotonEnviar>
    </form>
  );
}
