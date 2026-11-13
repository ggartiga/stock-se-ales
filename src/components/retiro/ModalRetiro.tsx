"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CircleCheck, LoaderCircle, MapPin, Minus, PackageMinus, Plus, TriangleAlert, Warehouse } from "lucide-react";
import { Dialogo } from "@/components/ui/Dialogo";
import { InsigniaEstado } from "@/components/ui/InsigniaEstado";
import { crearClienteNavegador } from "@/lib/supabase/navegador";
import { validarCantidadRetiro } from "@/lib/dominio/validacion";
import { codigoDeError, mensajeDeError } from "@/lib/dominio/errores";
import { formatearFechaHora } from "@/lib/dominio/fechas";
import { registrarError } from "@/lib/registro";
import { nuevoUuid } from "@/lib/uuid";
import type { ItemInventario, ResultadoMovimiento } from "@/lib/tipos";

type Paso = "formulario" | "confirmar" | "enviando" | "exito";

/**
 * Formulario de RETIRO.
 * 1) El trabajador indica la cantidad (validación inmediata).
 * 2) Confirma explícitamente.
 * 3) Se llama a la RPC registrar_retiro: bloqueo de fila + validación +
 *    descuento + movimiento en UNA transacción de PostgreSQL.
 * Protección contra dobles retiros:
 *  - el botón se bloquea mientras se envía (estado + ref síncrona);
 *  - cada operación lleva un id de solicitud: si la red falla y se reintenta,
 *    el servidor reconoce la solicitud y no descuenta dos veces.
 */
export function ModalRetiro({
  item,
  alCerrar,
  volverA,
}: {
  item: ItemInventario | null;
  alCerrar: () => void;
  /** Ruta a la que volver tras un retiro exitoso (por defecto: se queda en la lista actual). */
  volverA?: string;
}) {
  const router = useRouter();
  const [paso, setPaso] = useState<Paso>("formulario");
  const [cantidad, setCantidad] = useState("1");
  const [observacion, setObservacion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoMovimiento | null>(null);
  // El componente se monta de nuevo para cada producto (key en ListaInventario):
  // cada apertura parte limpia y con un id de solicitud nuevo.
  const [solicitudInicial] = useState(nuevoUuid);
  const solicitudId = useRef<string>(solicitudInicial);
  const enviando = useRef(false);

  // Si el usuario cambia la operación, es una solicitud nueva.
  const cambiarCantidad = (valor: string) => {
    setCantidad(valor.replace(/[^\d]/g, "").slice(0, 7));
    setError(null);
    solicitudId.current = nuevoUuid();
  };

  const cerrar = () => {
    if (paso === "enviando") return;
    const huboExito = paso === "exito";
    alCerrar();
    if (huboExito) {
      if (volverA) router.push(volverA);
      else router.refresh();
    }
  };

  // Tras un retiro exitoso se vuelve automáticamente al inventario.
  useEffect(() => {
    if (paso !== "exito") return;
    const t = setTimeout(cerrar, 2500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paso]);

  if (!item) return <Dialogo abierto={false} alCerrar={alCerrar} titulo="Retirar producto">{null}</Dialogo>;

  const stock = item.cantidad_actual;
  const validacion = validarCantidadRetiro(cantidad, stock);
  const n = validacion.ok ? validacion.valor : Number(cantidad) || 0;

  const continuar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validacion.ok) {
      setError(validacion.error);
      return;
    }
    setError(null);
    setPaso("confirmar");
  };

  const confirmar = async () => {
    if (enviando.current) return; // bloqueo síncrono ante dobles toques
    const v = validarCantidadRetiro(cantidad, stock);
    if (!v.ok) {
      setError(v.error);
      setPaso("formulario");
      return;
    }
    enviando.current = true;
    setPaso("enviando");
    setError(null);
    try {
      const supabase = crearClienteNavegador();
      const { data, error: errorRpc } = await supabase.rpc("registrar_retiro", {
        p_inventario_id: item.inventario_id,
        p_cantidad: v.valor,
        p_solicitud_id: solicitudId.current,
        p_observacion: observacion.trim() || null,
      });
      if (errorRpc) {
        registrarError("retiro.rpc", errorRpc, { inventario_id: item.inventario_id });
        setError(mensajeDeError(errorRpc));
        setPaso("formulario");
        // El stock pudo cambiar por otro retiro simultáneo: refrescar datos.
        if (codigoDeError(errorRpc) === "STOCK_INSUFICIENTE") {
          solicitudId.current = nuevoUuid();
          router.refresh();
        }
        return;
      }
      setResultado(data as ResultadoMovimiento);
      setPaso("exito");
      router.refresh();
    } catch (e) {
      // Error de red: se conserva el MISMO id de solicitud para reintentar sin duplicar.
      registrarError("retiro.red", e);
      setError(mensajeDeError(e as Error));
      setPaso("confirmar");
    } finally {
      enviando.current = false;
    }
  };

  return (
    <Dialogo abierto={Boolean(item)} alCerrar={cerrar} titulo={paso === "exito" ? "Retiro registrado" : "Retirar producto"} bloquearCierre={paso === "enviando"}>
      {/* Resumen del producto (siempre visible) */}
      <div className="rounded-2xl bg-fondo p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-lg font-bold leading-snug">{item.elemento}</p>
            <p className="font-mono text-sm text-tinta-suave">SAP {item.codigo_sap}</p>
          </div>
          {paso !== "exito" && <InsigniaEstado estado={item.estado_stock} />}
        </div>
        <p className="mt-2 flex flex-wrap gap-x-3 text-sm font-medium">
          <span className="inline-flex items-center gap-1">
            <Warehouse className="size-4 text-marca-500" aria-hidden="true" />
            {item.almacen_nombre}
          </span>
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-4 text-marca-500" aria-hidden="true" />
            Ubicación {item.codigo_ubicacion}
          </span>
        </p>
        {paso !== "exito" && (
          <p className="mt-2 text-sm">
            Stock actual: <strong className="text-base tabular-nums">{stock}</strong>
          </p>
        )}
      </div>

      {paso === "formulario" && (
        <form onSubmit={continuar} className="mt-4 space-y-4" noValidate>
          <div>
            <label htmlFor="cantidad-retiro" className="etiqueta">
              Cantidad a retirar
            </label>
            <div className="flex items-stretch gap-2">
              <button
                type="button"
                className="boton-secundario size-14 shrink-0 px-0"
                onClick={() => cambiarCantidad(String(Math.max(1, n - 1)))}
                disabled={n <= 1}
                aria-label="Disminuir cantidad"
              >
                <Minus className="size-6" />
              </button>
              <input
                id="cantidad-retiro"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                value={cantidad}
                onChange={(e) => cambiarCantidad(e.target.value)}
                aria-invalid={!validacion.ok}
                aria-describedby="ayuda-cantidad"
                className="campo h-14 text-center text-2xl font-black tabular-nums"
              />
              <button
                type="button"
                className="boton-secundario size-14 shrink-0 px-0"
                onClick={() => cambiarCantidad(String(Math.min(stock, n + 1)))}
                disabled={n >= stock}
                aria-label="Aumentar cantidad"
              >
                <Plus className="size-6" />
              </button>
            </div>
            <p id="ayuda-cantidad" className="ayuda">
              Máximo {stock} {stock === 1 ? "unidad" : "unidades"}.
            </p>
          </div>
          <div>
            <label htmlFor="obs-retiro" className="etiqueta">
              Observación <span className="font-normal text-tinta-suave">(opcional: OT, motivo, destino)</span>
            </label>
            <textarea
              id="obs-retiro"
              value={observacion}
              onChange={(e) => {
                setObservacion(e.target.value.slice(0, 500));
                solicitudId.current = nuevoUuid();
              }}
              rows={2}
              maxLength={500}
              className="campo py-3"
            />
          </div>
          {error && (
            <div className="alerta-error" role="alert">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {error}
            </div>
          )}
          <button type="submit" className="boton-primario h-14 w-full text-lg" disabled={stock <= 0}>
            Continuar
            <ArrowRight className="size-5" aria-hidden="true" />
          </button>
        </form>
      )}

      {(paso === "confirmar" || paso === "enviando") && (
        <div className="mt-4 space-y-4">
          <div className="rounded-2xl border-2 border-marca-200 bg-marca-50 p-4 text-center">
            <p className="text-sm font-semibold text-marca-800">¿Confirma el retiro?</p>
            <p className="mt-1 text-4xl font-black tabular-nums text-marca-600">
              {n} <span className="text-lg font-bold">{n === 1 ? "unidad" : "unidades"}</span>
            </p>
            <p className="mt-2 text-sm text-tinta-suave">
              Stock: <strong className="tabular-nums text-tinta">{stock}</strong> → <strong className="tabular-nums text-tinta">{stock - n}</strong>
            </p>
            {observacion.trim() && <p className="mt-2 break-words text-sm italic text-tinta-suave">“{observacion.trim()}”</p>}
          </div>
          {error && (
            <div className="alerta-error" role="alert">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {error}
            </div>
          )}
          <button type="button" className="boton-primario h-16 w-full text-lg tracking-wide" onClick={confirmar} disabled={paso === "enviando"} aria-busy={paso === "enviando"}>
            {paso === "enviando" ? (
              <>
                <LoaderCircle className="size-6 animate-spin" aria-hidden="true" /> Registrando…
              </>
            ) : (
              <>
                <PackageMinus className="size-6" aria-hidden="true" /> CONFIRMAR RETIRO
              </>
            )}
          </button>
          <button type="button" className="boton-secundario w-full" onClick={() => setPaso("formulario")} disabled={paso === "enviando"}>
            Modificar cantidad
          </button>
        </div>
      )}

      {paso === "exito" && resultado && (
        <div className="mt-4 space-y-4 text-center">
          <CircleCheck className="mx-auto size-16 text-emerald-600" aria-hidden="true" />
          <div>
            <p className="text-lg font-bold">
              Se retiraron {resultado.cantidad} {resultado.cantidad === 1 ? "unidad" : "unidades"}
            </p>
            <p className="mt-1 text-tinta-suave">
              Stock anterior <strong className="tabular-nums text-tinta">{resultado.stock_anterior}</strong> → stock nuevo{" "}
              <strong className="tabular-nums text-tinta">{resultado.stock_nuevo}</strong>
            </p>
            <p className="mt-1 text-sm text-tinta-suave">{formatearFechaHora(resultado.fecha_hora)}</p>
            {resultado.repetida && <p className="mt-2 text-sm text-marca-700">La solicitud ya se había registrado; no se descontó dos veces.</p>}
          </div>
          <button type="button" className="boton-primario h-14 w-full" onClick={cerrar}>
            Volver al inventario
          </button>
        </div>
      )}
    </Dialogo>
  );
}
