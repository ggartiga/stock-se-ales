"use client";

import { useActionState, useState } from "react";
import { Dialogo } from "@/components/ui/Dialogo";
import { BotonEnviar } from "@/components/ui/BotonEnviar";
import { MensajeFormulario } from "@/components/ui/Alerta";
import { ESTADO_INICIAL, type EstadoFormulario } from "@/lib/tipos";

type Accion = (previo: EstadoFormulario, datos: FormData) => Promise<EstadoFormulario>;

/**
 * Botón que abre un diálogo de confirmación antes de ejecutar una acción
 * sensible (eliminar). Con `palabraClave` exige escribirla para confirmar.
 */
export function AccionConfirmada({
  accion,
  campos,
  textoBoton,
  titulo,
  descripcion,
  textoConfirmar = "Confirmar",
  palabraClave,
  variante = "peligro",
  icono,
}: {
  accion: Accion;
  campos: Record<string, string>;
  textoBoton: string;
  titulo: string;
  descripcion: React.ReactNode;
  textoConfirmar?: string;
  palabraClave?: string;
  variante?: "peligro" | "secundario";
  icono?: React.ReactNode;
}) {
  const [abierto, setAbierto] = useState(false);
  const [estado, ejecutar] = useActionState(accion, ESTADO_INICIAL);
  const [texto, setTexto] = useState("");

  return (
    <>
      <button type="button" className={variante === "peligro" ? "boton-peligro" : "boton-secundario"} onClick={() => setAbierto(true)}>
        {icono}
        {textoBoton}
      </button>
      <Dialogo abierto={abierto} alCerrar={() => setAbierto(false)} titulo={titulo}>
        <form action={ejecutar} className="space-y-4">
          {Object.entries(campos).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
          <div className="text-tinta-suave">{descripcion}</div>
          {palabraClave && (
            <div>
              <label htmlFor="palabra-clave" className="etiqueta">
                Escriba <strong className="font-mono">{palabraClave}</strong> para confirmar
              </label>
              <input
                id="palabra-clave"
                name="confirmacion"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                autoComplete="off"
                autoCapitalize="characters"
                className="campo font-mono"
              />
            </div>
          )}
          <MensajeFormulario estado={estado} />
          <div className="grid gap-2 sm:grid-cols-2">
            <button type="button" className="boton-secundario" onClick={() => setAbierto(false)}>
              Cancelar
            </button>
            <BotonEnviar variante={variante} disabled={Boolean(palabraClave) && texto !== palabraClave} textoEnviando="Procesando…">
              {textoConfirmar}
            </BotonEnviar>
          </div>
        </form>
      </Dialogo>
    </>
  );
}
