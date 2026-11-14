/**
 * Permisos de la interfaz. Son sólo de presentación: la autorización real la
 * aplican RLS y las funciones SQL. Mantener alineado con la migración 4.
 */
export type Rol = "administrador" | "supervisor" | "trabajador";

export const ROLES: readonly Rol[] = ["administrador", "supervisor", "trabajador"] as const;

export const ETIQUETA_ROL: Record<Rol, string> = {
  administrador: "Administrador",
  supervisor: "Supervisor",
  trabajador: "Trabajador",
};

export function esRol(valor: unknown): valor is Rol {
  return typeof valor === "string" && (ROLES as readonly string[]).includes(valor);
}

/** Roles que gestionan inventario, productos, almacenes y QR (migración 5). */
export const ROLES_GESTION_INVENTARIO: Rol[] = ["administrador", "supervisor", "trabajador"];

export const permisos = {
  retirar: (_rol: Rol) => true,
  administrarInventario: (rol: Rol) => ROLES_GESTION_INVENTARIO.includes(rol),
  administrarUsuarios: (rol: Rol) => rol === "administrador",
  verHistorialCompleto: (rol: Rol) => rol === "administrador" || rol === "supervisor",
  verUsuarios: (rol: Rol) => rol === "administrador" || rol === "supervisor",
};

/**
 * Valida un destino de redirección recibido por URL para evitar redirecciones
 * abiertas a sitios externos (p. ej. ?siguiente=//sitio-malicioso.com).
 */
export function rutaInternaSegura(destino: string | null | undefined, porDefecto = "/inventario"): string {
  if (!destino || typeof destino !== "string") return porDefecto;
  if (!destino.startsWith("/") || destino.startsWith("//") || destino.startsWith("/\\")) return porDefecto;
  if (/[\r\n]/.test(destino)) return porDefecto;
  if (destino.startsWith("/login") || destino.startsWith("/auth")) return porDefecto;
  return destino;
}
