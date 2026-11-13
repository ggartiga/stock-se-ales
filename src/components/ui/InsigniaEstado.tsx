import { CircleCheck, CircleX, TriangleAlert } from "lucide-react";
import { ETIQUETA_ESTADO, type EstadoStock } from "@/lib/dominio/stock";

const ESTILOS: Record<EstadoStock, { clase: string; Icono: typeof CircleCheck }> = {
  disponible: { clase: "bg-emerald-50 text-emerald-700 ring-emerald-200", Icono: CircleCheck },
  stock_bajo: { clase: "bg-orange-50 text-orange-700 ring-orange-300", Icono: TriangleAlert },
  sin_stock: { clase: "bg-red-50 text-red-700 ring-red-200", Icono: CircleX },
};

/** Estado del stock con color + icono + texto (no depende sólo del color). */
export function InsigniaEstado({ estado, grande = false }: { estado: EstadoStock; grande?: boolean }) {
  const { clase, Icono } = ESTILOS[estado];
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full font-semibold ring-1 ring-inset ${clase} ${
        grande ? "px-3 py-1.5 text-sm" : "px-2.5 py-1 text-xs"
      }`}
    >
      <Icono className={grande ? "size-4" : "size-3.5"} aria-hidden="true" />
      {ETIQUETA_ESTADO[estado]}
    </span>
  );
}

export const COLOR_NUMERO_ESTADO: Record<EstadoStock, string> = {
  disponible: "text-emerald-700",
  stock_bajo: "text-orange-600",
  sin_stock: "text-red-600",
};
