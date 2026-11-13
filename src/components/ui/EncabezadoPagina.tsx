import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function EncabezadoPagina({
  titulo,
  descripcion,
  volver,
  acciones,
}: {
  titulo: string;
  descripcion?: React.ReactNode;
  volver?: string;
  acciones?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="flex min-w-0 items-start gap-2">
        {volver && (
          <Link href={volver} className="boton-icono -ml-2 shrink-0" aria-label="Volver">
            <ArrowLeft className="size-6" />
          </Link>
        )}
        <div className="min-w-0">
          <h1 className="titulo-pagina break-words">{titulo}</h1>
          {descripcion && <div className="mt-1 text-tinta-suave">{descripcion}</div>}
        </div>
      </div>
      {acciones && <div className="flex flex-wrap gap-2">{acciones}</div>}
    </div>
  );
}
