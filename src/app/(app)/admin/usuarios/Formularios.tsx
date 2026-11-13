"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { CircleUser, Send, UserPlus } from "lucide-react";
import { actualizarUsuario, crearUsuario } from "./acciones";
import { BotonEnviar } from "@/components/ui/BotonEnviar";
import { MensajeFormulario } from "@/components/ui/Alerta";
import { ESTADO_INICIAL, type Perfil } from "@/lib/tipos";
import { ETIQUETA_ROL, ROLES } from "@/lib/dominio/permisos";

export function FormularioNuevoUsuario() {
  const [estado, accion] = useActionState(crearUsuario, ESTADO_INICIAL);
  const [modo, setModo] = useState<"invitar" | "temporal">("invitar");
  const formulario = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (estado.ok) formulario.current?.reset();
  }, [estado.marca, estado.ok]);

  return (
    <form ref={formulario} action={accion} className="mt-4 grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label htmlFor="nu-nombre" className="etiqueta">
          Nombre completo
        </label>
        <input id="nu-nombre" name="nombre" required minLength={2} maxLength={150} className="campo" />
      </div>
      <div>
        <label htmlFor="nu-correo" className="etiqueta">
          Correo electrónico
        </label>
        <input id="nu-correo" name="correo" type="email" required autoCapitalize="none" className="campo" />
      </div>
      <div>
        <label htmlFor="nu-rol" className="etiqueta">
          Rol
        </label>
        <select id="nu-rol" name="rol" defaultValue="trabajador" className="campo">
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ETIQUETA_ROL[r]}
            </option>
          ))}
        </select>
      </div>

      <fieldset className="sm:col-span-2">
        <legend className="etiqueta">Forma de alta</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-4 ${modo === "invitar" ? "border-marca-500 bg-marca-50" : "border-borde"}`}>
            <input type="radio" name="modo" value="invitar" checked={modo === "invitar"} onChange={() => setModo("invitar")} className="size-5 accent-marca-500" />
            <span className="text-sm font-semibold">Enviar invitación por correo</span>
          </label>
          <label className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-4 ${modo === "temporal" ? "border-marca-500 bg-marca-50" : "border-borde"}`}>
            <input type="radio" name="modo" value="temporal" checked={modo === "temporal"} onChange={() => setModo("temporal")} className="size-5 accent-marca-500" />
            <span className="text-sm font-semibold">Crear con contraseña temporal</span>
          </label>
        </div>
      </fieldset>

      {modo === "temporal" && (
        <div className="sm:col-span-2">
          <label htmlFor="nu-clave" className="etiqueta">
            Contraseña temporal
          </label>
          <input id="nu-clave" name="clave_temporal" type="text" autoComplete="off" minLength={8} required className="campo font-mono" />
          <p className="ayuda">Mínimo 8 caracteres con letras y números. El trabajador podrá cambiarla en “Mi cuenta”.</p>
        </div>
      )}

      <div className="sm:col-span-2 space-y-3">
        <MensajeFormulario estado={estado} />
        <BotonEnviar className="w-full sm:w-auto" textoEnviando="Creando…">
          {modo === "invitar" ? <Send className="size-5" aria-hidden="true" /> : <UserPlus className="size-5" aria-hidden="true" />}
          {modo === "invitar" ? "Enviar invitación" : "Crear usuario"}
        </BotonEnviar>
      </div>
    </form>
  );
}

export function FilaUsuario({ usuario, esYo }: { usuario: Perfil; esYo: boolean }) {
  const [estado, accion] = useActionState(actualizarUsuario, ESTADO_INICIAL);

  return (
    <form action={accion} className={`tarjeta space-y-3 p-4 ${usuario.activo ? "" : "bg-gray-50 opacity-80"}`}>
      <input type="hidden" name="id" value={usuario.id} />
      <div className="flex items-center gap-3">
        <CircleUser className={`size-10 shrink-0 ${usuario.activo ? "text-marca-500" : "text-gray-400"}`} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">
            {usuario.correo} {esYo && <span className="text-xs font-bold text-marca-600">(usted)</span>}
          </p>
          {!usuario.activo && <p className="text-xs font-bold uppercase text-red-600">Desactivado</p>}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <div>
          <label className="etiqueta" htmlFor={`n-${usuario.id}`}>
            Nombre
          </label>
          <input id={`n-${usuario.id}`} name="nombre" defaultValue={usuario.nombre_completo} required className="campo" />
        </div>
        <div>
          <label className="etiqueta" htmlFor={`r-${usuario.id}`}>
            Rol
          </label>
          <select id={`r-${usuario.id}`} name="rol" defaultValue={usuario.rol} className="campo">
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ETIQUETA_ROL[r]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex min-h-12 cursor-pointer items-center gap-2 text-sm font-semibold">
          <input type="checkbox" name="activo" defaultChecked={usuario.activo} className="size-5 accent-marca-500" />
          Cuenta activa
        </label>
        <BotonEnviar variante="secundario">Guardar</BotonEnviar>
      </div>
      <MensajeFormulario estado={estado} />
    </form>
  );
}
