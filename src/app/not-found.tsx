import Link from "next/link";

export default function NoEncontrado() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="tarjeta max-w-md p-8 text-center">
        <p className="text-5xl font-black text-marca-500">404</p>
        <h1 className="mt-2 text-xl font-extrabold">Página no encontrada</h1>
        <p className="mt-2 text-tinta-suave">El recurso solicitado no existe o fue eliminado.</p>
        <Link href="/inventario" className="boton-primario mt-6 w-full">
          Volver al inventario
        </Link>
      </div>
    </main>
  );
}
