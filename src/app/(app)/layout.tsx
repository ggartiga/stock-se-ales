import Link from "next/link";
import { Boxes, History, ScanLine } from "lucide-react";
import { requerirPerfil } from "@/lib/sesion";
import { Logo, MarcaTexto } from "@/components/ui/Logo";
import { MenuPrincipal } from "@/components/navegacion/MenuPrincipal";
import { NavegacionInferior } from "@/components/navegacion/NavegacionInferior";

/** Estructura común de las páginas autenticadas. */
export default async function LayoutAplicacion({ children }: { children: React.ReactNode }) {
  const perfil = await requerirPerfil();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="no-imprimir sticky top-0 z-40 border-b border-borde bg-white/95 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-3 sm:px-6">
          <Link href="/inventario" className="flex items-center gap-2.5" aria-label="STOCK SEÑALES — inicio">
            <Logo className="size-10" />
            <MarcaTexto subtitulo={false} />
          </Link>

          <nav className="ml-6 hidden items-center gap-1 md:flex" aria-label="Secciones">
            <EnlaceEscritorio href="/inventario" Icono={Boxes} texto="Inventario" />
            <EnlaceEscritorio href="/escanear" Icono={ScanLine} texto="Escanear QR" />
            <EnlaceEscritorio href="/historial" Icono={History} texto="Historial" />
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <span className="hidden max-w-48 truncate text-sm font-medium text-tinta-suave lg:block">{perfil.nombre_completo}</span>
            <MenuPrincipal nombre={perfil.nombre_completo} correo={perfil.correo} rol={perfil.rol} />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-3 pb-28 pt-4 sm:px-6 md:pb-10">{children}</main>

      <NavegacionInferior />
    </div>
  );
}

function EnlaceEscritorio({ href, Icono, texto }: { href: string; Icono: typeof Boxes; texto: string }) {
  return (
    <Link href={href} className="flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-tinta-suave hover:bg-gray-100 hover:text-tinta">
      <Icono className="size-4" aria-hidden="true" />
      {texto}
    </Link>
  );
}
