"use client";

import { useState } from "react";
import type { AlmacenConUbicaciones } from "@/lib/consultas";

/** Selects dependientes Almacén → Ubicación. Envía el campo `ubicacion_id`. */
export function SelectorUbicacion({
  almacenes,
  prefijo,
  excluirUbicaciones = [],
}: {
  almacenes: AlmacenConUbicaciones[];
  prefijo: string;
  excluirUbicaciones?: string[];
}) {
  const [almacenId, setAlmacenId] = useState(almacenes.length === 1 ? almacenes[0].id : "");
  const ubicaciones = (almacenes.find((a) => a.id === almacenId)?.ubicaciones ?? []).filter((u) => !excluirUbicaciones.includes(u.id));

  return (
    <>
      <div>
        <label htmlFor={`${prefijo}-almacen`} className="etiqueta">
          Almacén
        </label>
        <select id={`${prefijo}-almacen`} className="campo" value={almacenId} onChange={(e) => setAlmacenId(e.target.value)} required>
          <option value="">Seleccione…</option>
          {almacenes.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nombre}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor={`${prefijo}-ubicacion`} className="etiqueta">
          Ubicación
        </label>
        <select id={`${prefijo}-ubicacion`} name="ubicacion_id" className="campo" required disabled={!almacenId} defaultValue="" key={almacenId}>
          <option value="">{almacenId ? (ubicaciones.length ? "Seleccione…" : "Sin ubicaciones disponibles") : "Elija un almacén primero"}</option>
          {ubicaciones.map((u) => (
            <option key={u.id} value={u.id}>
              {u.codigo_ubicacion}
              {u.descripcion ? ` — ${u.descripcion}` : ""}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}
