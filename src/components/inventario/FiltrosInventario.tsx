"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LoaderCircle, Search, SlidersHorizontal, X } from "lucide-react";
import { CAMPOS_BUSQUEDA, hayFiltrosActivos, serializarFiltros, type CampoBusqueda, type FiltrosInventario } from "@/lib/filtros";
import { ESTADOS_STOCK, ETIQUETA_ESTADO, type EstadoStock } from "@/lib/dominio/stock";
import type { AlmacenConUbicaciones } from "@/lib/consultas";

/**
 * Búsqueda y filtros. El estado vive en la URL (compartible, funciona con
 * "atrás") y cada cambio vuelve a consultar la base de datos en el servidor.
 */
export function FiltrosInventarioPanel({
  filtros,
  almacenes,
  totalResultados,
}: {
  filtros: FiltrosInventario;
  almacenes: AlmacenConUbicaciones[];
  totalResultados: number;
}) {
  const router = useRouter();
  const ruta = usePathname();
  const [cargando, iniciarTransicion] = useTransition();
  const [texto, setTexto] = useState(filtros.q);
  const [verFiltros, setVerFiltros] = useState(Boolean(filtros.almacen || filtros.ubicacion || filtros.estado));
  const ultimoTexto = useRef(filtros.q);

  const navegar = (cambios: Partial<FiltrosInventario>) => {
    const siguiente = { ...filtros, q: texto.trim(), ...cambios };
    if (cambios.almacen !== undefined && cambios.almacen !== filtros.almacen) siguiente.ubicacion = null;
    iniciarTransicion(() => router.replace(`${ruta}${serializarFiltros(siguiente)}`, { scroll: false }));
  };

  // Búsqueda mientras se escribe (con espera de 350 ms)
  useEffect(() => {
    const t = texto.trim();
    if (t === ultimoTexto.current) return;
    const id = setTimeout(() => {
      ultimoTexto.current = t;
      navegar({ q: t });
    }, 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texto]);

  const ubicaciones = almacenes.find((a) => a.id === filtros.almacen)?.ubicaciones ?? [];
  const activos = hayFiltrosActivos(filtros);
  const cantidadFiltros = [filtros.almacen, filtros.ubicacion, filtros.estado].filter(Boolean).length;

  return (
    <section className="tarjeta space-y-3 p-3 sm:p-4" aria-label="Búsqueda y filtros">
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-gray-400" aria-hidden="true" />
          <input
            type="search"
            inputMode="search"
            enterKeyHint="search"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                ultimoTexto.current = texto.trim();
                navegar({ q: texto.trim() });
              }
            }}
            placeholder="Buscar por código SAP, elemento o descripción"
            aria-label="Buscar"
            className="campo pl-11 pr-10"
          />
          {cargando ? (
            <LoaderCircle className="absolute right-3.5 top-1/2 size-5 -translate-y-1/2 animate-spin text-marca-500" aria-label="Buscando" />
          ) : (
            texto && (
              <button
                type="button"
                onClick={() => {
                  setTexto("");
                  ultimoTexto.current = "";
                  navegar({ q: "" });
                }}
                className="absolute right-1 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full text-gray-400 hover:text-tinta"
                aria-label="Borrar búsqueda"
              >
                <X className="size-5" />
              </button>
            )
          )}
        </div>
        <button
          type="button"
          onClick={() => setVerFiltros((v) => !v)}
          aria-expanded={verFiltros}
          className={`boton-secundario relative shrink-0 px-3.5 ${verFiltros ? "border-marca-500 text-marca-600" : ""}`}
        >
          <SlidersHorizontal className="size-5" aria-hidden="true" />
          <span className="hidden sm:inline">Filtros</span>
          {cantidadFiltros > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-marca-500 text-xs text-white">
              {cantidadFiltros}
            </span>
          )}
        </button>
      </div>

      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5" role="radiogroup" aria-label="Buscar en">
        {CAMPOS_BUSQUEDA.map((c) => (
          <button
            key={c.valor}
            type="button"
            role="radio"
            aria-checked={filtros.campo === c.valor}
            onClick={() => navegar({ campo: c.valor as CampoBusqueda })}
            className={`h-9 shrink-0 rounded-full px-3.5 text-sm font-semibold ring-1 ring-inset transition ${
              filtros.campo === c.valor ? "bg-marca-500 text-white ring-marca-500" : "bg-white text-tinta-suave ring-borde hover:bg-gray-50"
            }`}
          >
            {c.texto}
          </button>
        ))}
      </div>

      {verFiltros && (
        <div className="grid gap-3 border-t border-borde pt-3 sm:grid-cols-3">
          <div>
            <label htmlFor="f-almacen" className="etiqueta">
              Almacén
            </label>
            <select id="f-almacen" className="campo" value={filtros.almacen ?? ""} onChange={(e) => navegar({ almacen: e.target.value || null })}>
              <option value="">Todos los almacenes</option>
              {almacenes.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="f-ubicacion" className="etiqueta">
              Ubicación
            </label>
            <select
              id="f-ubicacion"
              className="campo"
              value={filtros.ubicacion ?? ""}
              disabled={!filtros.almacen}
              onChange={(e) => navegar({ ubicacion: e.target.value || null })}
            >
              <option value="">{filtros.almacen ? "Todas las ubicaciones" : "Elija un almacén primero"}</option>
              {ubicaciones.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.codigo_ubicacion}
                  {u.descripcion ? ` — ${u.descripcion}` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="f-estado" className="etiqueta">
              Estado
            </label>
            <select
              id="f-estado"
              className="campo"
              value={filtros.estado ?? ""}
              onChange={(e) => navegar({ estado: (e.target.value || null) as EstadoStock | null })}
            >
              <option value="">Todos los estados</option>
              {ESTADOS_STOCK.map((e) => (
                <option key={e} value={e}>
                  {ETIQUETA_ESTADO[e]}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between text-sm">
        <span className="text-tinta-suave" aria-live="polite">
          {totalResultados} {totalResultados === 1 ? "resultado" : "resultados"}
        </span>
        {activos && (
          <button
            type="button"
            className="font-semibold text-marca-600 hover:underline"
            onClick={() => {
              setTexto("");
              ultimoTexto.current = "";
              iniciarTransicion(() => router.replace(ruta, { scroll: false }));
            }}
          >
            Limpiar filtros
          </button>
        )}
      </div>
    </section>
  );
}
