import Link from "next/link";
import type { ResumenStock } from "@/lib/dominio/stock";
import { serializarFiltros, type FiltrosInventario } from "@/lib/filtros";

/** Panel de indicadores. Cada tarjeta filtra por su estado. */
export function ResumenEstados({ resumen, filtros, base }: { resumen: ResumenStock; filtros: FiltrosInventario; base: string }) {
  const tarjetas = [
    { clave: null, titulo: "Registros", valor: resumen.total, clase: "text-tinta", barra: "bg-gray-300" },
    { clave: "disponible" as const, titulo: "Disponible", valor: resumen.disponible, clase: "text-emerald-700", barra: "bg-emerald-500" },
    { clave: "stock_bajo" as const, titulo: "Stock bajo", valor: resumen.stock_bajo, clase: "text-orange-600", barra: "bg-orange-500" },
    { clave: "sin_stock" as const, titulo: "Sin stock", valor: resumen.sin_stock, clase: "text-red-600", barra: "bg-red-500" },
  ];
  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-3">
      {tarjetas.map((t) => {
        const activo = filtros.estado === t.clave;
        return (
          <Link
            key={t.titulo}
            href={`${base}${serializarFiltros({ ...filtros, estado: t.clave })}`}
            scroll={false}
            className={`tarjeta relative overflow-hidden px-2 py-2.5 text-center transition hover:shadow-md sm:px-4 sm:py-3 sm:text-left ${
              activo ? "ring-2 ring-marca-500" : ""
            }`}
            aria-current={activo ? "true" : undefined}
          >
            <span className={`absolute inset-x-0 top-0 h-1 ${t.barra}`} aria-hidden="true" />
            <span className={`block text-2xl font-black tabular-nums sm:text-3xl ${t.clase}`}>{t.valor}</span>
            <span className="block text-[11px] font-semibold leading-tight text-tinta-suave sm:text-sm">{t.titulo}</span>
          </Link>
        );
      })}
    </div>
  );
}
