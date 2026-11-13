import { requerirRol } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import type { Perfil } from "@/lib/tipos";
import { EncabezadoPagina } from "@/components/ui/EncabezadoPagina";
import { Alerta } from "@/components/ui/Alerta";
import { FormularioNuevoUsuario, FilaUsuario } from "./Formularios";

export const metadata = { title: "Usuarios y roles" };

export default async function PaginaUsuarios() {
  const yo = await requerirRol(["administrador"]);
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from("usuarios")
    .select("id, nombre_completo, correo, rol, activo, fecha_creacion")
    .order("activo", { ascending: false })
    .order("nombre_completo");

  const usuarios = (data ?? []) as Perfil[];

  return (
    <div className="space-y-5">
      <EncabezadoPagina titulo="Usuarios y roles" volver="/mas-acciones" descripcion="Cuentas de los trabajadores y sus permisos." />

      <section className="tarjeta p-5">
        <h2 className="text-lg font-bold">Nuevo usuario</h2>
        <FormularioNuevoUsuario />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">
          Usuarios registrados <span className="text-tinta-suave">({usuarios.length})</span>
        </h2>
        {error && <Alerta tipo="error">No se pudo cargar la lista de usuarios.</Alerta>}
        <div className="grid gap-3 lg:grid-cols-2">
          {usuarios.map((u) => (
            <FilaUsuario key={u.id} usuario={u} esYo={u.id === yo.id} />
          ))}
        </div>
      </section>
    </div>
  );
}
