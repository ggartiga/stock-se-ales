/**
 * Fechas en la zona horaria de operación (Chile continental, con horario de
 * verano). La base de datos guarda timestamptz (UTC); aquí se convierten los
 * filtros "desde/hasta" (días locales) a instantes exactos.
 */
export const ZONA_HORARIA = "America/Santiago";

const FECHA_ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

function partesLocales(instante: Date, zona: string) {
  const formato = new Intl.DateTimeFormat("en-US", {
    timeZone: zona,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const p: Record<string, number> = {};
  for (const parte of formato.formatToParts(instante)) {
    if (parte.type !== "literal") p[parte.type] = Number(parte.value);
  }
  return { anio: p.year, mes: p.month, dia: p.day, hora: p.hour, minuto: p.minute, segundo: p.second };
}

/** Diferencia (minutos) entre la hora local de la zona y UTC en un instante. */
function desfaseMinutos(instante: Date, zona: string): number {
  const p = partesLocales(instante, zona);
  const comoUtc = Date.UTC(p.anio, p.mes - 1, p.dia, p.hora, p.minuto, p.segundo);
  return Math.round((comoUtc - Math.floor(instante.getTime() / 1000) * 1000) / 60000);
}

export function esFechaIso(valor: unknown): valor is string {
  if (typeof valor !== "string") return false;
  const m = FECHA_ISO.exec(valor);
  if (!m) return false;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.getUTCFullYear() === Number(m[1]) && d.getUTCMonth() === Number(m[2]) - 1 && d.getUTCDate() === Number(m[3]);
}

/**
 * Primer instante del día local `fecha` (YYYY-MM-DD) en la zona indicada.
 * Considera los días en que la medianoche no existe por cambio de hora.
 */
export function inicioDelDia(fecha: string, zona: string = ZONA_HORARIA): Date {
  const m = FECHA_ISO.exec(fecha);
  if (!m || !esFechaIso(fecha)) throw new Error(`Fecha inválida: ${fecha}`);
  const base = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));

  const candidatos = new Set<number>();
  const d1 = desfaseMinutos(new Date(base), zona);
  const t1 = base - d1 * 60000;
  candidatos.add(t1);
  candidatos.add(base - desfaseMinutos(new Date(t1), zona) * 60000);
  // Margen para transiciones: probar también ±1 h alrededor.
  candidatos.add(t1 - 3600000);
  candidatos.add(t1 + 3600000);

  const validos = [...candidatos]
    .filter((t) => {
      const p = partesLocales(new Date(t), zona);
      return p.anio === Number(m[1]) && p.mes === Number(m[2]) && p.dia === Number(m[3]);
    })
    .sort((a, b) => a - b);

  if (validos.length === 0) throw new Error(`No se pudo calcular el inicio del día ${fecha}`);
  // El primer instante del día es el menor candidato válido cuyo instante anterior pertenece al día previo.
  return new Date(validos[0]);
}

function sumarDias(fecha: string, dias: number): string {
  const m = FECHA_ISO.exec(fecha)!;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + dias));
  return d.toISOString().slice(0, 10);
}

/**
 * Rango [desde, hasta) en ISO-8601 para filtrar `fecha_hora`.
 * `hasta` es inclusivo como día: se usa el inicio del día siguiente como límite exclusivo.
 */
export function rangoDeFechas(
  desde: string | null | undefined,
  hasta: string | null | undefined,
  zona: string = ZONA_HORARIA,
): { desde: string | null; hasta: string | null; error: string | null } {
  const d = desde && esFechaIso(desde) ? desde : null;
  const h = hasta && esFechaIso(hasta) ? hasta : null;
  if ((desde && !d) || (hasta && !h)) return { desde: null, hasta: null, error: "Fecha inválida." };
  if (d && h && d > h) return { desde: null, hasta: null, error: "La fecha inicial no puede ser posterior a la final." };
  return {
    desde: d ? inicioDelDia(d, zona).toISOString() : null,
    hasta: h ? inicioDelDia(sumarDias(h, 1), zona).toISOString() : null,
    error: null,
  };
}

/** Fecha local de hoy (YYYY-MM-DD) en la zona indicada. */
export function hoyEnZona(zona: string = ZONA_HORARIA, ahora: Date = new Date()): string {
  const p = partesLocales(ahora, zona);
  return `${p.anio}-${String(p.mes).padStart(2, "0")}-${String(p.dia).padStart(2, "0")}`;
}

export function formatearFechaHora(iso: string, zona: string = ZONA_HORARIA): string {
  return new Intl.DateTimeFormat("es-CL", {
    timeZone: zona,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));
}
