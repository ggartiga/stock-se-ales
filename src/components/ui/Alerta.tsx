import { CircleCheck, Info, TriangleAlert } from "lucide-react";

type Tipo = "error" | "exito" | "info";

const CLASE: Record<Tipo, string> = { error: "alerta-error", exito: "alerta-exito", info: "alerta-info" };
const ICONO = { error: TriangleAlert, exito: CircleCheck, info: Info };

export function Alerta({ tipo, children }: { tipo: Tipo; children: React.ReactNode }) {
  const Icono = ICONO[tipo];
  return (
    <div className={CLASE[tipo]} role={tipo === "error" ? "alert" : "status"}>
      <Icono className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 break-words">{children}</div>
    </div>
  );
}

export function MensajeFormulario({ estado }: { estado: { ok: boolean; mensaje: string | null } }) {
  if (!estado.mensaje) return null;
  return <Alerta tipo={estado.ok ? "exito" : "error"}>{estado.mensaje}</Alerta>;
}
