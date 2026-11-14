"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { UserPlus } from "lucide-react";
import { registrarse } from "@/app/auth/acciones";
import { BotonEnviar } from "@/components/ui/BotonEnviar";
import { MensajeFormulario } from "@/components/ui/Alerta";
import { ESTADO_INICIAL } from "@/lib/tipos";
import { DOMINIO_REGISTRO } from "@/lib/dominio/validacion";

export function FormularioRegistro() {
  const [estado, accion] = useActionState(registrarse, ESTADO_INICIAL);
  // Controlados para que no se borren si el servidor devuelve un error.
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");

  return (
    <form action={accion} className="mt-6 space-y-4">
      <div>
        <label htmlFor="reg-nombre" className="etiqueta">
          Nombre completo
        </label>
        <input id="reg-nombre" name="nombre" type="text" autoComplete="name" value={nombre} onChange={(e) => setNombre(e.target.value)} required minLength={2} maxLength={150} className="campo" />
      </div>
      <div>
        <label htmlFor="reg-correo" className="etiqueta">
          Correo electrónico
        </label>
        <input
          id="reg-correo"
          name="correo"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
          required
          className="campo"
          placeholder={`nombre@${DOMINIO_REGISTRO}`}
        />
        <p className="ayuda">Use su correo de trabajo @{DOMINIO_REGISTRO}.</p>
      </div>
      <div>
        <label htmlFor="reg-clave" className="etiqueta">
          Contraseña
        </label>
        <input id="reg-clave" name="clave" type="password" autoComplete="new-password" required minLength={8} className="campo" />
        <p className="ayuda">Mínimo 8 caracteres con letras y números.</p>
      </div>
      <div>
        <label htmlFor="reg-confirmacion" className="etiqueta">
          Repetir contraseña
        </label>
        <input id="reg-confirmacion" name="confirmacion" type="password" autoComplete="new-password" required minLength={8} className="campo" />
      </div>
      <MensajeFormulario estado={estado} />
      <BotonEnviar className="w-full" textoEnviando="Creando cuenta…">
        <UserPlus className="size-5" aria-hidden="true" /> Crear cuenta
      </BotonEnviar>
      <p className="pt-2 text-center text-sm text-tinta-suave">
        ¿Ya tiene cuenta?{" "}
        <Link href="/login" className="font-semibold text-marca-600 underline-offset-2 hover:underline">
          Iniciar sesión
        </Link>
      </p>
    </form>
  );
}
