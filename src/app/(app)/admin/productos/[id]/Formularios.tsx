"use client";

import { useActionState } from "react";
import { Plus, Save } from "lucide-react";
import { actualizarMinimo, actualizarProducto, asignarUbicacion } from "../acciones";
import { BotonEnviar } from "@/components/ui/BotonEnviar";
import { MensajeFormulario } from "@/components/ui/Alerta";
import { SelectorUbicacion } from "@/components/admin/SelectorUbicacion";
import { ESTADO_INICIAL, type Producto } from "@/lib/tipos";
import type { AlmacenConUbicaciones } from "@/lib/consultas";

export function FormularioEditarProducto({ producto }: { producto: Producto }) {
  const [estado, accion] = useActionState(actualizarProducto, ESTADO_INICIAL);
  return (
    <form action={accion} className="mt-4 grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="id" value={producto.id} />
      <div>
        <label htmlFor="ep-sap" className="etiqueta">
          Código SAP
        </label>
        <input id="ep-sap" name="codigo_sap" defaultValue={producto.codigo_sap} required maxLength={30} className="campo font-mono" />
      </div>
      <div>
        <label htmlFor="ep-elemento" className="etiqueta">
          Elemento
        </label>
        <input id="ep-elemento" name="elemento" defaultValue={producto.elemento} required maxLength={150} className="campo" />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="ep-desc" className="etiqueta">
          Descripción
        </label>
        <textarea id="ep-desc" name="descripcion" defaultValue={producto.descripcion ?? ""} rows={3} maxLength={1000} className="campo py-3" />
      </div>
      <div className="space-y-3 sm:col-span-2">
        <MensajeFormulario estado={estado} />
        <BotonEnviar className="w-full sm:w-auto">
          <Save className="size-5" aria-hidden="true" /> Guardar cambios
        </BotonEnviar>
      </div>
    </form>
  );
}

export function FormularioMinimo({ inventarioId, minima }: { inventarioId: string; minima: number }) {
  const [estado, accion] = useActionState(actualizarMinimo, ESTADO_INICIAL);
  return (
    <form action={accion} className="flex flex-1 flex-wrap items-end gap-2">
      <input type="hidden" name="inventario_id" value={inventarioId} />
      <div className="w-32">
        <label htmlFor={`min-${inventarioId}`} className="etiqueta">
          Mínimo
        </label>
        <input id={`min-${inventarioId}`} name="cantidad_minima" type="number" inputMode="numeric" min={0} step={1} defaultValue={minima} className="campo" />
      </div>
      <BotonEnviar variante="secundario">Guardar</BotonEnviar>
      {estado.mensaje && <p className={`w-full text-sm font-medium ${estado.ok ? "text-emerald-700" : "text-red-700"}`}>{estado.mensaje}</p>}
    </form>
  );
}

export function FormularioAsignar({
  productoId,
  almacenes,
  excluir,
  solicitudId,
}: {
  productoId: string;
  almacenes: AlmacenConUbicaciones[];
  excluir: string[];
  solicitudId: string;
}) {
  const [estado, accion] = useActionState(asignarUbicacion, ESTADO_INICIAL);
  return (
    <form action={accion} className="mt-3 grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="producto_id" value={productoId} />
      <input type="hidden" name="solicitud_id" value={solicitudId} />
      <SelectorUbicacion almacenes={almacenes} prefijo="as" excluirUbicaciones={excluir} />
      <div>
        <label htmlFor="as-inicial" className="etiqueta">
          Stock inicial
        </label>
        <input id="as-inicial" name="cantidad_inicial" type="number" inputMode="numeric" min={0} step={1} defaultValue={0} className="campo" />
      </div>
      <div>
        <label htmlFor="as-minimo" className="etiqueta">
          Cantidad mínima
        </label>
        <input id="as-minimo" name="cantidad_minima" type="number" inputMode="numeric" min={0} step={1} defaultValue={0} className="campo" />
      </div>
      <div className="space-y-3 sm:col-span-2">
        <MensajeFormulario estado={estado} />
        <BotonEnviar variante="secundario" className="w-full sm:w-auto">
          <Plus className="size-5" aria-hidden="true" /> Agregar ubicación
        </BotonEnviar>
      </div>
    </form>
  );
}
