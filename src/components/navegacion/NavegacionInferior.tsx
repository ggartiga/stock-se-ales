"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Boxes, History, LayoutGrid, ScanLine } from "lucide-react";

const ITEMS = [
  { href: "/inventario", texto: "Inventario", Icono: Boxes },
  { href: "/escanear", texto: "Escanear", Icono: ScanLine, destacado: true },
  { href: "/historial", texto: "Historial", Icono: History },
  { href: "/mas-acciones", texto: "Más", Icono: LayoutGrid },
];

/** Barra inferior para teléfonos: accesos grandes al alcance del pulgar. */
export function NavegacionInferior() {
  const ruta = usePathname();
  return (
    <nav
      aria-label="Navegación principal"
      className="no-imprimir fixed inset-x-0 bottom-0 z-40 border-t border-borde bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-4">
        {ITEMS.map(({ href, texto, Icono, destacado }) => {
          const activo = ruta === href || ruta.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={activo ? "page" : undefined}
                className={`flex h-16 flex-col items-center justify-center gap-0.5 text-xs font-semibold ${
                  activo ? "text-marca-600" : "text-tinta-suave"
                }`}
              >
                {destacado ? (
                  <span className="-mt-6 flex size-14 items-center justify-center rounded-full bg-marca-500 text-white shadow-lg ring-4 ring-white">
                    <Icono className="size-7" aria-hidden="true" />
                  </span>
                ) : (
                  <Icono className="size-6" aria-hidden="true" />
                )}
                <span>{texto}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
