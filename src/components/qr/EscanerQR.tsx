"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, CameraOff, Flashlight, FlashlightOff, LoaderCircle, TriangleAlert } from "lucide-react";
import { interpretarContenidoQR } from "@/lib/dominio/qr";
import { registrarError } from "@/lib/registro";

// Tipos mínimos de la API BarcodeDetector (aún no incluida en lib.dom de TypeScript)
interface CodigoDetectado {
  rawValue: string;
}
interface DetectorCodigos {
  detect(fuente: CanvasImageSource): Promise<CodigoDetectado[]>;
}
interface ConstructorDetector {
  new (opciones: { formats: string[] }): DetectorCodigos;
  getSupportedFormats?: () => Promise<string[]>;
}
type Decodificador = (datos: Uint8ClampedArray, ancho: number, alto: number, opciones?: { inversionAttempts?: string }) => { data: string } | null;

type Estado = "inactivo" | "iniciando" | "escaneando" | "error";

const INTERVALO_MS = 120;

function mensajeErrorCamara(e: unknown): string {
  const nombre = (e as { name?: string })?.name;
  if (typeof window !== "undefined" && !window.isSecureContext) {
    return "La cámara sólo funciona en una conexión segura (HTTPS). Abra la aplicación desde su dirección https.";
  }
  switch (nombre) {
    case "NotAllowedError":
    case "SecurityError":
      return "No se otorgó permiso para usar la cámara. Habilítelo en la configuración del navegador y vuelva a intentar.";
    case "NotFoundError":
    case "OverconstrainedError":
      return "No se encontró una cámara disponible en este dispositivo.";
    case "NotReadableError":
    case "AbortError":
      return "La cámara está siendo usada por otra aplicación. Ciérrela e intente nuevamente.";
    default:
      return "No se pudo iniciar la cámara. Intente nuevamente o seleccione la ubicación manualmente.";
  }
}

/**
 * Lector de códigos QR con la cámara trasera del teléfono.
 * - Usa BarcodeDetector nativo cuando existe (Android/Chrome) y jsQR como
 *   respaldo (iPhone/Safari, Firefox).
 * - Al reconocer un QR de ubicación válido, detiene la cámara y navega a
 *   /escanear?u=<identificador>, que muestra sólo los productos de ese rack.
 */
export function EscanerQR({ iniciarAutomaticamente = true }: { iniciarAutomaticamente?: boolean }) {
  const router = useRouter();
  const video = useRef<HTMLVideoElement>(null);
  const lienzo = useRef<HTMLCanvasElement | null>(null);
  const flujo = useRef<MediaStream | null>(null);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const detector = useRef<DetectorCodigos | null>(null);
  const decodificador = useRef<Decodificador | null>(null);
  const resuelto = useRef(false);
  // Cada inicio tiene un número; si se detuvo mientras pedía la cámara, el flujo tardío se descarta.
  const generacion = useRef(0);
  const [estado, setEstado] = useState<Estado>("inactivo");
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [linterna, setLinterna] = useState<{ disponible: boolean; encendida: boolean }>({ disponible: false, encendida: false });

  const detener = useCallback(() => {
    generacion.current += 1;
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = null;
    flujo.current?.getTracks().forEach((t) => t.stop());
    flujo.current = null;
    if (video.current) video.current.srcObject = null;
  }, []);

  const procesarTexto = useCallback(
    (texto: string) => {
      const id = interpretarContenidoQR(texto);
      if (!id) {
        setAviso("Este código QR no corresponde a una ubicación de STOCK SEÑALES.");
        return false;
      }
      resuelto.current = true;
      detener();
      setEstado("inactivo");
      if ("vibrate" in navigator) navigator.vibrate?.(80);
      router.push(`/escanear?u=${id}`);
      return true;
    },
    [detener, router],
  );

  const analizarCuadro = useCallback(async () => {
    const v = video.current;
    if (!v || resuelto.current || !flujo.current) return;
    try {
      if (v.readyState >= 2 && v.videoWidth > 0) {
        if (detector.current) {
          const codigos = await detector.current.detect(v);
          if (codigos[0] && procesarTexto(codigos[0].rawValue)) return;
        } else if (decodificador.current) {
          const escala = Math.min(1, 640 / v.videoWidth);
          const ancho = Math.round(v.videoWidth * escala);
          const alto = Math.round(v.videoHeight * escala);
          lienzo.current ??= document.createElement("canvas");
          const c = lienzo.current;
          c.width = ancho;
          c.height = alto;
          const ctx = c.getContext("2d", { willReadFrequently: true });
          if (ctx) {
            ctx.drawImage(v, 0, 0, ancho, alto);
            const imagen = ctx.getImageData(0, 0, ancho, alto);
            const resultado = decodificador.current(imagen.data, ancho, alto, { inversionAttempts: "dontInvert" });
            if (resultado?.data && procesarTexto(resultado.data)) return;
          }
        }
      }
    } catch (e) {
      registrarError("qr.analizar", e);
    }
    temporizador.current = setTimeout(analizarCuadro, INTERVALO_MS);
  }, [procesarTexto]);

  const iniciar = useCallback(async () => {
    const miGeneracion = ++generacion.current;
    resuelto.current = false;
    setError(null);
    setAviso(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setEstado("error");
      setError(mensajeErrorCamara(new Error("sin getUserMedia")));
      return;
    }
    setEstado("iniciando");
    try {
      // Detector: nativo si soporta QR; si no, jsQR (carga diferida).
      const Nativo = (window as unknown as { BarcodeDetector?: ConstructorDetector }).BarcodeDetector;
      if (Nativo && !detector.current) {
        try {
          const formatos = (await Nativo.getSupportedFormats?.()) ?? ["qr_code"];
          if (formatos.includes("qr_code")) detector.current = new Nativo({ formats: ["qr_code"] });
        } catch {
          detector.current = null;
        }
      }
      if (!detector.current && !decodificador.current) {
        const modulo = await import("jsqr");
        decodificador.current = modulo.default as unknown as Decodificador;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      if (miGeneracion !== generacion.current || !video.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      flujo.current = stream;
      const v = video.current;
      v.srcObject = stream;
      v.setAttribute("playsinline", "true"); // necesario en iOS
      v.muted = true;
      await v.play();
      if (miGeneracion !== generacion.current) return;

      const pista = stream.getVideoTracks()[0];
      const capacidades = (pista.getCapabilities?.() ?? {}) as MediaTrackCapabilities & { torch?: boolean };
      setLinterna({ disponible: Boolean(capacidades.torch), encendida: false });

      setEstado("escaneando");
      temporizador.current = setTimeout(analizarCuadro, INTERVALO_MS);
    } catch (e) {
      if (miGeneracion !== generacion.current) return; // cancelado: no es un error
      registrarError("qr.camara", e);
      detener();
      setEstado("error");
      setError(mensajeErrorCamara(e));
    }
  }, [analizarCuadro, detener]);

  const alternarLinterna = async () => {
    const pista = flujo.current?.getVideoTracks()[0];
    if (!pista) return;
    const encender = !linterna.encendida;
    try {
      await pista.applyConstraints({ advanced: [{ torch: encender } as MediaTrackConstraintSet & { torch: boolean }] });
      setLinterna((l) => ({ ...l, encendida: encender }));
    } catch (e) {
      registrarError("qr.linterna", e);
    }
  };

  useEffect(() => {
    if (iniciarAutomaticamente) void iniciar();
    const alCambiarVisibilidad = () => {
      if (document.hidden) {
        detener();
        setEstado("inactivo");
      }
    };
    document.addEventListener("visibilitychange", alCambiarVisibilidad);
    return () => {
      document.removeEventListener("visibilitychange", alCambiarVisibilidad);
      detener();
    };
  }, [iniciar, detener, iniciarAutomaticamente]);

  // El aviso de QR no reconocido desaparece solo.
  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 2500);
    return () => clearTimeout(t);
  }, [aviso]);

  const activo = estado === "escaneando" || estado === "iniciando";

  return (
    <div className="space-y-3">
      <div className="relative mx-auto aspect-square w-full max-w-md overflow-hidden rounded-3xl bg-tinta shadow-lg">
        <video ref={video} className={`size-full object-cover ${activo ? "" : "invisible"}`} playsInline muted aria-label="Vista de la cámara" />

        {activo && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
            <div className="relative size-[68%]">
              {["left-0 top-0 border-l-4 border-t-4 rounded-tl-2xl", "right-0 top-0 border-r-4 border-t-4 rounded-tr-2xl", "left-0 bottom-0 border-l-4 border-b-4 rounded-bl-2xl", "right-0 bottom-0 border-r-4 border-b-4 rounded-br-2xl"].map((c) => (
                <span key={c} className={`absolute size-10 border-marca-500 ${c}`} />
              ))}
              {estado === "escaneando" && <span className="absolute inset-x-2 top-1/2 h-0.5 animate-pulse bg-marca-400 shadow-[0_0_12px_2px] shadow-marca-500" />}
            </div>
          </div>
        )}

        {estado === "iniciando" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white">
            <LoaderCircle className="size-10 animate-spin" aria-hidden="true" />
            <p className="font-semibold">Iniciando cámara…</p>
          </div>
        )}

        {(estado === "inactivo" || estado === "error") && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center text-white">
            {estado === "error" ? <CameraOff className="size-12 text-marca-300" aria-hidden="true" /> : <Camera className="size-12 text-marca-300" aria-hidden="true" />}
            <p className="font-semibold">{estado === "error" ? "Cámara no disponible" : "Apunte la cámara al código QR del rack"}</p>
            <button type="button" className="boton-primario h-14 px-8 text-lg" onClick={() => void iniciar()}>
              <Camera className="size-6" aria-hidden="true" />
              {estado === "error" ? "Reintentar" : "Activar cámara"}
            </button>
          </div>
        )}

        {estado === "escaneando" && linterna.disponible && (
          <button
            type="button"
            onClick={alternarLinterna}
            className="absolute bottom-3 right-3 flex size-12 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur"
            aria-label={linterna.encendida ? "Apagar linterna" : "Encender linterna"}
            aria-pressed={linterna.encendida}
          >
            {linterna.encendida ? <FlashlightOff className="size-6" /> : <Flashlight className="size-6" />}
          </button>
        )}

        {aviso && (
          <p className="absolute inset-x-3 top-3 rounded-xl bg-black/70 px-3 py-2 text-center text-sm font-semibold text-white" role="status">
            {aviso}
          </p>
        )}
      </div>

      {estado === "escaneando" && <p className="text-center text-sm font-medium text-tinta-suave">Centre el código QR dentro del recuadro.</p>}

      {error && (
        <div className="alerta-error mx-auto max-w-md" role="alert">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {error}
        </div>
      )}
    </div>
  );
}
