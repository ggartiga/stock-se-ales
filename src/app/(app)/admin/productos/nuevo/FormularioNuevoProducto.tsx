"use client";

import { useActionState } from "react";
import { Save } from "lucide-react";
import { crearProducto } from "../acciones";
import { BotonEnviar } from "@/components/ui/BotonEnviar";
import { MensajeFormulario } from "@/components/ui/Alerta";
import { SelectorUbicacion } from "@/components/admin/SelectorUbicacion";
import { ESTADO_INICIAL } from "@/lib/tipos";
import type { AlmacenConUbicaciones } from "@/lib/consultas";

export function FormularioNuevoProducto({ almacenes, solicitudId }: { almacenes: AlmacenConUbicaciones[]; solicitudId: string }) {
  const [estado, accion] = useActionState(crearProducto, ESTADO_INICIAL);

  return (
    <form action={accion} className="tarjeta space-y-5 p-5">
      <input type="hidden" name="solicitud_id" value={solicitudId} />
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-lg font-bold">Datos del producto</legend>
        <div>
          <label htmlFor="np-sap" className="etiqueta">
            Código SAP
          </label>
          <input id="np-sap" name="codigo_sap" required maxLength={30} pattern="[A-Za-z0-9._\-]{1,30}" inputMode="text" autoCapitalize="characters" className="campo font-mono" placeholder="10000023262" />
        </div>
        <div>
          <label htmlFor="np-elemento" className="etiqueta">
            Elemento
          </label>
          <input id="np-elemento" name="elemento" required maxLength={150} className="campo" placeholder="Controlador VCC" />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="np-desc" className="etiqueta">
            Descripción <span className="font-normal text-tinta-suave">(opcional)</span>
          </label>
          <textarea id="np-desc" name="descripcion" rows={3} maxLength={1000} className="campo py-3" />
        </div>
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-lg font-bold">Ubicación y stock</legend>
        <SelectorUbicacion almacenes={almacenes} prefijo="np" />
        <div>
          <label htmlFor="np-inicial" className="etiqueta">
            Stock inicial
          </label>
          <input id="np-inicial" name="cantidad_inicial" type="number" inputMode="numeric" min={0} step={1} defaultValue={0} className="campo" />
          <p className="ayuda">Se registra como movimiento de INGRESO “Stock inicial”.</p>
        </div>
        <div>
          <label htmlFor="np-minimo" className="etiqueta">
            Cantidad mínima
          </label>
          <input id="np-minimo" name="cantidad_minima" type="number" inputMode="numeric" min={0} step={1} defaultValue={0} className="campo" />
          <p className="ayuda">Al llegar a este valor el producto pasa a “Stock bajo”.</p>
        </div>
      </fieldset>

      <MensajeFormulario estado={estado} />
      <BotonEnviar className="w-full sm:w-auto">
        <Save className="size-5" aria-hidden="true" /> Crear producto
      </BotonEnviar>
    </form>
  );
}
