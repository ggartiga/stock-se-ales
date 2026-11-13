"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronRight, CircleUser, EllipsisVertical, LogOut } from "lucide-react";
import { MENU_PRINCIPAL } from "@/lib/navegacion";
import { IconoOpcion } from "@/components/ui/Icono";
import { ETIQUETA_ROL, type Rol } from "@/lib/dominio/permisos";
import { cerrarSesion } from "@/app/auth/acciones";

/** Menú desplegable de tres puntos verticales. */
export function MenuPrincipal({ nombre, correo, rol }: { nombre: string; correo: string; rol: Rol }) {
  const [abierto, setAbierto] = useState(false);
  const contenedor = useRef<HTMLDivElement>(null);
  const ruta = usePathname();

  useEffect(() => setAbierto(false), [ruta]);

  useEffect(() => {
    if (!abierto) return;
    const alPulsarFuera = (e: PointerEvent) => {
      if (contenedor.current && !contenedor.current.contains(e.target as Node)) setAbierto(false);
    };
    const alTeclear = (e: KeyboardEvent) => e.key === "Escape" && setAbierto(false);
    document.addEventListener("pointerdown", alPulsarFuera);
    document.addEventListener("keydown", alTeclear);
    return () => {
      document.removeEventListener("pointerdown", alPulsarFuera);
      document.removeEventListener("keydown", alTeclear);
    };
  }, [abierto]);

  return (
    <div className="relative" ref={contenedor}>
      <button
        type="button"
        className="boton-icono"
        aria-label="Abrir menú"
        aria-haspopup="menu"
        aria-expanded={abierto}
        onClick={() => setAbierto((v) => !v)}
      >
        <EllipsisVertical className="size-6" />
      </button>

      {abierto && (
        <div
          role="menu"
          className="absolute right-0 top-14 z-50 w-[min(20rem,calc(100vw-1.5rem))] origin-top-right overflow-hidden rounded-2xl border border-borde bg-white shadow-xl"
        >
          <div className="flex items-center gap-3 border-b border-borde bg-marca-50 px-4 py-3">
            <CircleUser className="size-9 shrink-0 text-marca-500" aria-hidden="true" />
            <div className="min-w-0">
              <p className="truncate font-bold">{nombre}</p>
              <p className="truncate text-sm text-tinta-suave">{correo}</p>
              <p className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-marca-700">{ETIQUETA_ROL[rol]}</p>
            </div>
          </div>
          <nav className="py-1">
            {MENU_PRINCIPAL.map((o) => {
              const activo = ruta === o.href || (o.href !== null && ruta.startsWith(`${o.href}/`));
              return (
                <Link
                  key={o.id}
                  role="menuitem"
                  href={o.href!}
                  className={`flex min-h-14 items-center gap-3 px-4 text-base font-semibold hover:bg-gray-50 ${
                    activo ? "text-marca-600" : "text-tinta"
                  }`}
                >
                  <IconoOpcion nombre={o.icono} className="size-5 shrink-0" />
                  <span className="flex-1">{o.titulo}</span>
                  <ChevronRight className="size-4 text-gray-400" aria-hidden="true" />
                </Link>
              );
            })}
            <Link role="menuitem" href="/cuenta" className="flex min-h-14 items-center gap-3 px-4 text-base font-semibold hover:bg-gray-50">
              <CircleUser className="size-5 shrink-0" aria-hidden="true" />
              <span className="flex-1">Mi cuenta</span>
              <ChevronRight className="size-4 text-gray-400" aria-hidden="true" />
            </Link>
          </nav>
          <form action={cerrarSesion} className="border-t border-borde">
            <button
              type="submit"
              role="menuitem"
              className="flex min-h-14 w-full items-center gap-3 px-4 text-left text-base font-semibold text-red-700 hover:bg-red-50"
            >
              <LogOut className="size-5" aria-hidden="true" />
              Cerrar sesión
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
