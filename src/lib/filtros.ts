import { esEstadoStock, type EstadoStock } from "./dominio/stock";
import { esUuid } from "./dominio/validacion";
import { esFechaIso } from "./dominio/fechas";

export type CampoBusqueda = "todo" | "sap" | "elemento" | "descripcion";
export const CAMPOS_BUSQUEDA: { valor: CampoBusqueda; texto: string }[] = [
  { valor: "todo", texto: "Todo" },
  { valor: "sap", texto: "Código SAP" },
  { valor: "elemento", texto: "Elemento" },
  { valor: "descripcion", texto: "Descripción" },
];

export interface FiltrosInventario {
  q: string;
  campo: CampoBusqueda;
  almacen: string | null;
  ubicacion: string | null;
  estado: EstadoStock | null;
}

type Parametros = Record<string, string | string[] | undefined>;

const uno = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

/** Normaliza y valida los filtros recibidos por URL (nunca se confía en ellos). */
export function parsearFiltrosInventario(p: Parametros): FiltrosInventario {
  const campo = uno(p.campo) as CampoBusqueda;
  const estado = uno(p.estado);
  const almacen = uno(p.almacen);
  const ubicacion = uno(p.ubicacion);
  return {
    q: uno(p.q).trim().slice(0, 100),
    campo: CAMPOS_BUSQUEDA.some((c) => c.valor === campo) ? campo : "todo",
    almacen: esUuid(almacen) ? almacen : null,
    ubicacion: esUuid(ubicacion) ? ubicacion : null,
    estado: esEstadoStock(estado) ? estado : null,
  };
}

/** Construye la query string de los filtros (omite valores por defecto). */
export function serializarFiltros(f: Partial<FiltrosInventario>): string {
  const sp = new URLSearchParams();
  if (f.q) sp.set("q", f.q);
  if (f.campo && f.campo !== "todo") sp.set("campo", f.campo);
  if (f.almacen) sp.set("almacen", f.almacen);
  if (f.ubicacion) sp.set("ubicacion", f.ubicacion);
  if (f.estado) sp.set("estado", f.estado);
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export function hayFiltrosActivos(f: FiltrosInventario): boolean {
  return Boolean(f.q || f.almacen || f.ubicacion || f.estado);
}

// ------------------------------------------------------------------
// Historial
// ------------------------------------------------------------------
export const TAMANO_PAGINA_HISTORIAL = 30;

export interface FiltrosHistorial {
  desde: string | null;
  hasta: string | null;
  tipo: "RETIRO" | "INGRESO" | "AJUSTE" | null;
  q: string;
  pagina: number;
}

export function parsearFiltrosHistorial(p: Parametros): FiltrosHistorial {
  const desde = uno(p.desde);
  const hasta = uno(p.hasta);
  const tipo = uno(p.tipo);
  const pagina = Number.parseInt(uno(p.pagina), 10);
  return {
    desde: esFechaIso(desde) ? desde : null,
    hasta: esFechaIso(hasta) ? hasta : null,
    tipo: tipo === "RETIRO" || tipo === "INGRESO" || tipo === "AJUSTE" ? tipo : null,
    q: uno(p.q).trim().slice(0, 100),
    pagina: Number.isFinite(pagina) && pagina > 0 && pagina < 10000 ? pagina : 1,
  };
}

export function serializarFiltrosHistorial(f: Partial<FiltrosHistorial>): string {
  const sp = new URLSearchParams();
  if (f.desde) sp.set("desde", f.desde);
  if (f.hasta) sp.set("hasta", f.hasta);
  if (f.tipo) sp.set("tipo", f.tipo);
  if (f.q) sp.set("q", f.q);
  if (f.pagina && f.pagina > 1) sp.set("pagina", String(f.pagina));
  const s = sp.toString();
  return s ? `?${s}` : "";
}

/**
 * Escapa un texto para usarlo dentro de un filtro `or()` de PostgREST con ilike:
 * se eliminan los caracteres con significado sintáctico (coma, paréntesis,
 * comillas, barra invertida) y se escapan los comodines % y _.
 */
export function textoSeguroParaIlike(texto: string): string {
  return texto
    .replace(/[,()"'\\:]/g, " ")
    .replace(/[%_*]/g, (c) => (c === "*" ? " " : `\\${c}`))
    .trim();
}
