import Link from "next/link";
import QRCode from "qrcode";
import { requerirRol } from "@/lib/sesion";
import { listarAlmacenes } from "@/lib/consultas";
import { construirUrlQR, codigoCortoQR } from "@/lib/dominio/qr";
import { esUuid } from "@/lib/dominio/validacion";
import { URL_SITIO } from "@/lib/entorno";
import { EncabezadoPagina } from "@/components/ui/EncabezadoPagina";
import { Alerta } from "@/components/ui/Alerta";
import { Logo } from "@/components/ui/Logo";
import { BotonImprimir } from "./BotonImprimir";

export const metadata = { title: "Imprimir códigos QR" };

interface Etiqueta {
  id: string;
  almacen: string;
  codigo: string;
  descripcion: string | null;
  identificadorQr: string;
  svg: string;
}

/**
 * Hoja imprimible de etiquetas QR. Cada QR contiene la URL de la app con el
 * identificador ÚNICO de la ubicación (no el código "A1"), por lo que dos
 * racks A1 de almacenes distintos nunca se confunden.
 */
export default async function PaginaImprimirQR({
  searchParams,
}: {
  searchParams: Promise<{ almacen?: string; ubicacion?: string; tamano?: string }>;
}) {
  await requerirRol(["administrador"]);
  const { almacen, ubicacion, tamano } = await searchParams;
  const grande = tamano === "grande";

  const almacenes = await listarAlmacenes();
  const seleccion = almacenes
    .filter((a) => !esUuid(almacen) || a.id === almacen)
    .flatMap((a) =>
      a.ubicaciones
        .filter((u) => (!esUuid(ubicacion) || u.id === ubicacion) && u.estado === "activo")
        .map((u) => ({ a, u })),
    );

  const etiquetas: Etiqueta[] = await Promise.all(
    seleccion.map(async ({ a, u }) => ({
      id: u.id,
      almacen: a.nombre,
      codigo: u.codigo_ubicacion,
      descripcion: u.descripcion,
      identificadorQr: u.identificador_qr,
      // SVG generado en el servidor por la librería a partir de nuestra propia URL.
      svg: await QRCode.toString(construirUrlQR(URL_SITIO, u.identificador_qr), {
        type: "svg",
        errorCorrectionLevel: "M",
        margin: 1,
        color: { dark: "#1d2125", light: "#ffffff" },
      }),
    })),
  );

  const urlEsLocal = /localhost|127\.0\.0\.1/.test(URL_SITIO);
  const consulta = (t: string) => {
    const sp = new URLSearchParams();
    if (esUuid(almacen)) sp.set("almacen", almacen!);
    if (esUuid(ubicacion)) sp.set("ubicacion", ubicacion!);
    if (t === "grande") sp.set("tamano", "grande");
    const s = sp.toString();
    return s ? `?${s}` : "";
  };

  return (
    <div className="hoja-qr space-y-4">
      <div className="no-imprimir space-y-4">
        <EncabezadoPagina
          titulo="Imprimir códigos QR"
          volver="/admin/almacenes"
          descripcion={`${etiquetas.length} etiqueta(s) para imprimir y pegar en los racks.`}
          acciones={<BotonImprimir />}
        />
        {urlEsLocal && (
          <Alerta tipo="error">
            Los QR apuntan a <strong>{URL_SITIO}</strong>. Configure NEXT_PUBLIC_SITE_URL con la dirección pública (https) antes de imprimir las etiquetas definitivas.
          </Alerta>
        )}
        <div className="flex flex-wrap gap-2 text-sm font-semibold">
          <Link href={`/admin/almacenes/qr${consulta("normal")}`} className={`rounded-full px-4 py-2 ${!grande ? "bg-marca-500 text-white" : "bg-white ring-1 ring-borde"}`}>
            2 por fila
          </Link>
          <Link href={`/admin/almacenes/qr${consulta("grande")}`} className={`rounded-full px-4 py-2 ${grande ? "bg-marca-500 text-white" : "bg-white ring-1 ring-borde"}`}>
            Grandes
          </Link>
          {(esUuid(almacen) || esUuid(ubicacion)) && (
            <Link href="/admin/almacenes/qr" className="rounded-full bg-white px-4 py-2 ring-1 ring-borde">
              Todas las ubicaciones
            </Link>
          )}
        </div>
      </div>

      {etiquetas.length === 0 ? (
        <Alerta tipo="info">No hay ubicaciones activas para imprimir.</Alerta>
      ) : (
        <div className={`grid gap-4 ${grande ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2 print:grid-cols-2"}`}>
          {etiquetas.map((e) => (
            <article key={e.id} className="etiqueta-qr flex flex-col items-center rounded-2xl border-2 border-dashed border-gray-300 bg-white p-5 text-center">
              <div className="flex items-center gap-2">
                <Logo className="size-7" />
                <span className="text-sm font-black tracking-tight">
                  STOCK <span className="text-marca-500">SEÑALES</span>
                </span>
              </div>
              <p className="mt-2 text-sm font-semibold text-tinta-suave">{e.almacen}</p>
              <p className={`font-black leading-none text-tinta ${grande ? "text-8xl" : "text-6xl"}`}>{e.codigo}</p>
              {e.descripcion && <p className="mt-1 text-sm text-tinta-suave">{e.descripcion}</p>}
              <div className={`mt-3 ${grande ? "w-80" : "w-52"} [&>svg]:h-auto [&>svg]:w-full`} dangerouslySetInnerHTML={{ __html: e.svg }} />
              <p className="mt-2 font-mono text-xs font-semibold tracking-widest text-tinta-suave">ID {codigoCortoQR(e.identificadorQr)}</p>
              <p className="mt-1 text-xs text-tinta-suave">Escanee para ver y retirar los productos de este rack</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
