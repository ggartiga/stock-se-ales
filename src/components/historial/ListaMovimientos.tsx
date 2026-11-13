import { ArrowDownLeft, ArrowUpRight, History, SlidersHorizontal } from "lucide-react";
import { formatearFechaHora } from "@/lib/dominio/fechas";
import type { Movimiento, TipoMovimiento } from "@/lib/tipos";

const TIPO: Record<TipoMovimiento, { texto: string; clase: string; Icono: typeof ArrowUpRight; signo: string }> = {
  RETIRO: { texto: "RETIRO", clase: "bg-marca-50 text-marca-700 ring-marca-200", Icono: ArrowUpRight, signo: "−" },
  INGRESO: { texto: "INGRESO", clase: "bg-emerald-50 text-emerald-700 ring-emerald-200", Icono: ArrowDownLeft, signo: "+" },
  AJUSTE: { texto: "AJUSTE", clase: "bg-sky-50 text-sky-700 ring-sky-200", Icono: SlidersHorizontal, signo: "±" },
};

function InsigniaTipo({ tipo }: { tipo: TipoMovimiento }) {
  const { texto, clase, Icono } = TIPO[tipo];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${clase}`}>
      <Icono className="size-3.5" aria-hidden="true" />
      {texto}
    </span>
  );
}

/** Historial: tarjetas en teléfonos y tabla en pantallas grandes. */
export function ListaMovimientos({ movimientos }: { movimientos: Movimiento[] }) {
  if (movimientos.length === 0) {
    return (
      <div className="tarjeta flex flex-col items-center gap-2 px-6 py-10 text-center">
        <History className="size-10 text-gray-300" aria-hidden="true" />
        <p className="font-semibold text-tinta-suave">No hay movimientos para mostrar.</p>
      </div>
    );
  }

  return (
    <>
      {/* Teléfonos y tablets */}
      <ul className="space-y-3 lg:hidden">
        {movimientos.map((m) => (
          <li key={m.id} className="tarjeta p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-bold leading-snug">{m.elemento}</p>
                <p className="font-mono text-xs text-tinta-suave">SAP {m.codigo_sap}</p>
              </div>
              <InsigniaTipo tipo={m.tipo_movimiento} />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-fondo p-3 text-center">
              <div>
                <p className="text-[11px] font-semibold uppercase text-tinta-suave">Cantidad</p>
                <p className="text-xl font-black tabular-nums">
                  {TIPO[m.tipo_movimiento].signo}
                  {m.cantidad}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase text-tinta-suave">Anterior</p>
                <p className="text-xl font-black tabular-nums text-tinta-suave">{m.stock_anterior}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase text-tinta-suave">Nuevo</p>
                <p className="text-xl font-black tabular-nums">{m.stock_nuevo}</p>
              </div>
            </div>
            <dl className="mt-3 space-y-1 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-tinta-suave">Ubicación</dt>
                <dd className="text-right font-medium">
                  {m.almacen_nombre} · {m.codigo_ubicacion}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-tinta-suave">Trabajador</dt>
                <dd className="min-w-0 text-right font-medium">
                  <span className="block truncate">{m.trabajador}</span>
                  <span className="block truncate text-xs font-normal text-tinta-suave">{m.correo_trabajador}</span>
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-tinta-suave">Fecha y hora</dt>
                <dd className="text-right font-medium tabular-nums">{formatearFechaHora(m.fecha_hora)}</dd>
              </div>
              {m.observacion && <p className="pt-1 text-sm italic text-tinta-suave">“{m.observacion}”</p>}
            </dl>
          </li>
        ))}
      </ul>

      {/* Escritorio */}
      <div className="tarjeta hidden overflow-hidden lg:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-fondo text-xs font-bold uppercase tracking-wide text-tinta-suave">
            <tr>
              <th className="px-4 py-3">Fecha y hora</th>
              <th className="px-4 py-3">Trabajador</th>
              <th className="px-4 py-3">Elemento</th>
              <th className="px-4 py-3">Almacén / Ubicación</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3 text-right">Cant.</th>
              <th className="px-4 py-3 text-right">Anterior</th>
              <th className="px-4 py-3 text-right">Nuevo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-borde">
            {movimientos.map((m) => (
              <tr key={m.id} className="align-top hover:bg-gray-50">
                <td className="whitespace-nowrap px-4 py-3 tabular-nums">{formatearFechaHora(m.fecha_hora)}</td>
                <td className="px-4 py-3">
                  <p className="font-medium">{m.trabajador}</p>
                  <p className="text-xs text-tinta-suave">{m.correo_trabajador}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium">{m.elemento}</p>
                  <p className="font-mono text-xs text-tinta-suave">SAP {m.codigo_sap}</p>
                  {m.observacion && <p className="mt-1 max-w-xs text-xs italic text-tinta-suave">“{m.observacion}”</p>}
                </td>
                <td className="px-4 py-3">
                  {m.almacen_nombre}
                  <span className="text-tinta-suave"> · </span>
                  <strong>{m.codigo_ubicacion}</strong>
                </td>
                <td className="px-4 py-3">
                  <InsigniaTipo tipo={m.tipo_movimiento} />
                </td>
                <td className="px-4 py-3 text-right font-bold tabular-nums">
                  {TIPO[m.tipo_movimiento].signo}
                  {m.cantidad}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-tinta-suave">{m.stock_anterior}</td>
                <td className="px-4 py-3 text-right font-bold tabular-nums">{m.stock_nuevo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
