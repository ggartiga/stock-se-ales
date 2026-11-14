"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { KeyRound, LogIn, Mail } from "lucide-react";
import { iniciarSesion, solicitarRecuperacion } from "@/app/auth/acciones";
import { BotonEnviar } from "@/components/ui/BotonEnviar";
import { Alerta, MensajeFormulario } from "@/components/ui/Alerta";
import { ESTADO_INICIAL } from "@/lib/tipos";

export function FormularioIngreso({ siguiente, errorEnlace }: { siguiente: string; errorEnlace: string | null }) {
  const [modo, setModo] = useState<"ingreso" | "recuperar">("ingreso");
  const [estadoIngreso, accionIngreso] = useActionState(iniciarSesion, ESTADO_INICIAL);
  const [estadoRecuperar, accionRecuperar] = useActionState(solicitarRecuperacion, ESTADO_INICIAL);

  if (modo === "recuperar") {
    return (
      <form action={accionRecuperar} className="mt-6 space-y-4">
        <p className="text-sm text-tinta-suave">Le enviaremos un enlace para crear una nueva contraseña.</p>
        <div>
          <label htmlFor="correo-rec" className="etiqueta">
            Correo electrónico
          </label>
          <input id="correo-rec" name="correo" type="email" autoComplete="email" required className="campo" />
        </div>
        <MensajeFormulario estado={estadoRecuperar} />
        <BotonEnviar className="w-full" textoEnviando="Enviando…">
          <Mail className="size-5" aria-hidden="true" /> Enviar enlace
        </BotonEnviar>
        <button type="button" className="boton-fantasma w-full" onClick={() => setModo("ingreso")}>
          Volver a iniciar sesión
        </button>
      </form>
    );
  }

  return (
    <form action={accionIngreso} className="mt-6 space-y-4">
      <input type="hidden" name="siguiente" value={siguiente} />
      {errorEnlace && <Alerta tipo="error">{errorEnlace}</Alerta>}
      <div>
        <label htmlFor="correo" className="etiqueta">
          Correo electrónico
        </label>
        <input
          id="correo"
          name="correo"
          type="email"
          inputMode="email"
          autoComplete="username"
          autoCapitalize="none"
          required
          className="campo"
          placeholder="nombre@empresa.cl"
        />
      </div>
      <div>
        <label htmlFor="clave" className="etiqueta">
          Contraseña
        </label>
        <input id="clave" name="clave" type="password" autoComplete="current-password" required className="campo" />
      </div>
      <MensajeFormulario estado={estadoIngreso} />
      <BotonEnviar className="w-full" textoEnviando="Ingresando…">
        <LogIn className="size-5" aria-hidden="true" /> Ingresar
      </BotonEnviar>
      <button type="button" className="boton-fantasma w-full" onClick={() => setModo("recuperar")}>
        <KeyRound className="size-4" aria-hidden="true" /> ¿Olvidó su contraseña?
      </button>
      <p className="pt-2 text-center text-sm text-tinta-suave">
        ¿No tiene cuenta?{" "}
        <Link href="/registro" className="font-semibold text-marca-600 underline-offset-2 hover:underline">
          Crear cuenta
        </Link>
      </p>
    </form>
  );
}
