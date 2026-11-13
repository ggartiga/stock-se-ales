"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Keyboard } from "lucide-react";
import type { AlmacenConUbicaciones } from "@/lib/consultas";

/** Alternativa al escaneo (etiqueta dañada, cámara sin permiso): elegir el rack manualmente. */
export function SelectorManualUbicacion({ almacenes }: { almacenes: AlmacenConUbicaciones[] }) {
  const router = useRouter();
  const [almacenId, setAlmacenId] = useState("");
  const ubicaciones = almacenes.find((a) => a.id === almacenId)?.ubicaciones ?? [];

  return (
    <details className="tarjeta mx-auto max-w-md p-4">
      <summary className="flex min-h-10 cursor-pointer items-center gap-2 font-semibold">
        <Keyboard className="size-5 text-marca-500" aria-hidden="true" />
        Seleccionar ubicación manualmente
      </summary>
      <div className="mt-3 grid gap-3">
        <div>
          <label htmlFor="m-almacen" className="etiqueta">
            Almacén
          </label>
          <select id="m-almacen" className="campo" value={almacenId} onChange={(e) => setAlmacenId(e.target.value)}>
            <option value="">Seleccione…</option>
            {almacenes.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombre}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="m-ubicacion" className="etiqueta">
            Ubicación
          </label>
          <select
            id="m-ubicacion"
            className="campo"
            disabled={!almacenId}
            defaultValue=""
            key={almacenId}
            onChange={(e) => e.target.value && router.push(`/escanear?u=${e.target.value}`)}
          >
            <option value="">{almacenId ? "Seleccione…" : "Elija un almacén primero"}</option>
            {ubicaciones.map((u) => (
              <option key={u.id} value={u.identificador_qr}>
                {u.codigo_ubicacion}
                {u.descripcion ? ` — ${u.descripcion}` : ""}
              </option>
            ))}
          </select>
        </div>
      </div>
    </details>
  );
}
