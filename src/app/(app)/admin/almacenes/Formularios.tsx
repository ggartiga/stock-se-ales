"use client";

import { useActionState, useEffect, useRef } from "react";
import { Plus } from "lucide-react";
import { actualizarAlmacen, actualizarUbicacion, crearAlmacen, crearUbicacion } from "./acciones";
import { BotonEnviar } from "@/components/ui/BotonEnviar";
import { MensajeFormulario } from "@/components/ui/Alerta";
import { ESTADO_INICIAL, type Almacen, type EstadoFormulario, type Ubicacion } from "@/lib/tipos";

function useLimpiarAlExito(estado: EstadoFormulario) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (estado.ok) ref.current?.reset();
  }, [estado.marca, estado.ok]);
  return ref;
}

function SelectorEstado({ id, valor }: { id: string; valor: "activo" | "inactivo" }) {
  return (
    <div>
      <label htmlFor={id} className="etiqueta">
        Estado
      </label>
      <select id={id} name="estado" defaultValue={valor} className="campo">
        <option value="activo">Activo</option>
        <option value="inactivo">Inactivo</option>
      </select>
    </div>
  );
}

export function FormularioNuevoAlmacen() {
  const [estado, accion] = useActionState(crearAlmacen, ESTADO_INICIAL);
  const ref = useLimpiarAlExito(estado);
  return (
    <form ref={ref} action={accion} className="mt-4 grid gap-4 sm:grid-cols-[1fr_12rem_auto] sm:items-end">
      <div>
        <label htmlFor="na-nombre" className="etiqueta">
          Nombre
        </label>
        <input id="na-nombre" name="nombre" required maxLength={100} placeholder="Almacén LF" className="campo" />
      </div>
      <div>
        <label htmlFor="na-codigo" className="etiqueta">
          Código
        </label>
        <input id="na-codigo" name="codigo" required maxLength={20} placeholder="LF" autoCapitalize="characters" className="campo font-mono uppercase" />
      </div>
      <BotonEnviar>
        <Plus className="size-5" aria-hidden="true" /> Crear
      </BotonEnviar>
      <div className="sm:col-span-3">
        <MensajeFormulario estado={estado} />
      </div>
    </form>
  );
}

export function FormularioAlmacen({ almacen }: { almacen: Almacen }) {
  const [estado, accion] = useActionState(actualizarAlmacen, ESTADO_INICIAL);
  return (
    <form action={accion} className="grid gap-3 sm:grid-cols-[1fr_10rem_10rem_auto] sm:items-end">
      <input type="hidden" name="id" value={almacen.id} />
      <div>
        <label htmlFor={`a-n-${almacen.id}`} className="etiqueta">
          Nombre
        </label>
        <input id={`a-n-${almacen.id}`} name="nombre" defaultValue={almacen.nombre} required className="campo" />
      </div>
      <div>
        <label htmlFor={`a-c-${almacen.id}`} className="etiqueta">
          Código
        </label>
        <input id={`a-c-${almacen.id}`} name="codigo" defaultValue={almacen.codigo} required className="campo font-mono uppercase" />
      </div>
      <SelectorEstado id={`a-e-${almacen.id}`} valor={almacen.estado} />
      <BotonEnviar variante="secundario">Guardar</BotonEnviar>
      <div className="sm:col-span-4">
        <MensajeFormulario estado={estado} />
      </div>
    </form>
  );
}

export function FormularioUbicacion({ ubicacion }: { ubicacion: Ubicacion }) {
  const [estado, accion] = useActionState(actualizarUbicacion, ESTADO_INICIAL);
  return (
    <form action={accion} className="grid gap-3 sm:grid-cols-[8rem_1fr_9rem_auto] sm:items-end">
      <input type="hidden" name="id" value={ubicacion.id} />
      <div>
        <label htmlFor={`u-c-${ubicacion.id}`} className="etiqueta">
          Código
        </label>
        <input id={`u-c-${ubicacion.id}`} name="codigo_ubicacion" defaultValue={ubicacion.codigo_ubicacion} required className="campo font-mono uppercase" />
      </div>
      <div>
        <label htmlFor={`u-d-${ubicacion.id}`} className="etiqueta">
          Descripción
        </label>
        <input id={`u-d-${ubicacion.id}`} name="descripcion" defaultValue={ubicacion.descripcion ?? ""} maxLength={300} className="campo" />
      </div>
      <SelectorEstado id={`u-e-${ubicacion.id}`} valor={ubicacion.estado} />
      <BotonEnviar variante="secundario">Guardar</BotonEnviar>
      <div className="sm:col-span-4">
        <MensajeFormulario estado={estado} />
      </div>
    </form>
  );
}

export function FormularioNuevaUbicacion({ almacenId }: { almacenId: string }) {
  const [estado, accion] = useActionState(crearUbicacion, ESTADO_INICIAL);
  const ref = useLimpiarAlExito(estado);
  return (
    <form ref={ref} action={accion} className="mt-3 grid gap-3 sm:grid-cols-[8rem_1fr_auto] sm:items-end">
      <input type="hidden" name="almacen_id" value={almacenId} />
      <div>
        <label htmlFor={`nu-c-${almacenId}`} className="etiqueta">
          Código
        </label>
        <input id={`nu-c-${almacenId}`} name="codigo_ubicacion" required maxLength={20} placeholder="A1" autoCapitalize="characters" className="campo font-mono uppercase" />
      </div>
      <div>
        <label htmlFor={`nu-d-${almacenId}`} className="etiqueta">
          Descripción <span className="font-normal text-tinta-suave">(opcional)</span>
        </label>
        <input id={`nu-d-${almacenId}`} name="descripcion" maxLength={300} placeholder="Rack A, nivel 1" className="campo" />
      </div>
      <BotonEnviar>
        <Plus className="size-5" aria-hidden="true" /> Agregar
      </BotonEnviar>
      <div className="sm:col-span-3">
        <MensajeFormulario estado={estado} />
      </div>
    </form>
  );
}
