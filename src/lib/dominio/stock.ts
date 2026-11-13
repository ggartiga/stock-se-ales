/**
 * Reglas de estado del inventario (idénticas a la vista SQL public.v_inventario).
 *  - Sin stock:  cantidad actual = 0
 *  - Stock bajo: cantidad actual ≤ cantidad mínima (incluye "igual al mínimo")
 *  - Disponible: cantidad actual > cantidad mínima
 */
export type EstadoStock = "disponible" | "stock_bajo" | "sin_stock";

export const ESTADOS_STOCK: readonly EstadoStock[] = ["disponible", "stock_bajo", "sin_stock"] as const;

export const ETIQUETA_ESTADO: Record<EstadoStock, string> = {
  disponible: "Disponible",
  stock_bajo: "Stock bajo",
  sin_stock: "Sin stock",
};

export function calcularEstadoStock(cantidadActual: number, cantidadMinima: number): EstadoStock {
  if (cantidadActual <= 0) return "sin_stock";
  if (cantidadActual <= cantidadMinima) return "stock_bajo";
  return "disponible";
}

export function esEstadoStock(valor: unknown): valor is EstadoStock {
  return typeof valor === "string" && (ESTADOS_STOCK as readonly string[]).includes(valor);
}

export interface ResumenStock {
  total: number;
  disponible: number;
  stock_bajo: number;
  sin_stock: number;
}

export function resumirEstados(items: { estado_stock: EstadoStock }[]): ResumenStock {
  const resumen: ResumenStock = { total: items.length, disponible: 0, stock_bajo: 0, sin_stock: 0 };
  for (const item of items) resumen[item.estado_stock] += 1;
  return resumen;
}
