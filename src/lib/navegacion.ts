import { ROLES_GESTION_INVENTARIO, type Rol } from "./dominio/permisos";

/**
 * Definición única del menú y de "Más acciones".
 * estado "pendiente": se muestra deshabilitado con la etiqueta "Próximamente".
 * roles: si se define, sólo esos roles pueden usarla (al resto se le muestra "Restringido").
 */
export type EstadoOpcion = "disponible" | "pendiente";

export interface OpcionMenu {
  id: string;
  titulo: string;
  descripcion: string;
  href: string | null;
  icono: "inventario" | "escanear" | "historial" | "mas" | "ingreso" | "ajuste" | "productos" | "almacenes" | "usuarios" | "qr" | "reportes";
  estado: EstadoOpcion;
  roles?: Rol[];
}

export const MENU_PRINCIPAL: OpcionMenu[] = [
  { id: "inventario", titulo: "Inventario", descripcion: "Stock de todos los almacenes", href: "/inventario", icono: "inventario", estado: "disponible" },
  { id: "escanear", titulo: "Escanear QR", descripcion: "Ver los productos de un rack", href: "/escanear", icono: "escanear", estado: "disponible" },
  { id: "historial", titulo: "Historial de movimientos", descripcion: "Retiros e ingresos registrados", href: "/historial", icono: "historial", estado: "disponible" },
  { id: "mas", titulo: "Más acciones", descripcion: "Administración y próximas funciones", href: "/mas-acciones", icono: "mas", estado: "disponible" },
];

export const MAS_ACCIONES: OpcionMenu[] = [
  { id: "ingreso", titulo: "Ingreso de stock", descripcion: "Registrar recepción de material", href: null, icono: "ingreso", estado: "pendiente", roles: ROLES_GESTION_INVENTARIO },
  { id: "ajustes", titulo: "Ajustes de inventario", descripcion: "Corregir diferencias de conteo", href: null, icono: "ajuste", estado: "pendiente", roles: ROLES_GESTION_INVENTARIO },
  { id: "productos", titulo: "Administración de productos", descripcion: "Crear, editar y eliminar productos", href: "/admin/productos", icono: "productos", estado: "disponible", roles: ROLES_GESTION_INVENTARIO },
  { id: "almacenes", titulo: "Administración de almacenes", descripcion: "Almacenes, ubicaciones y racks", href: "/admin/almacenes", icono: "almacenes", estado: "disponible", roles: ROLES_GESTION_INVENTARIO },
  { id: "qr", titulo: "Imprimir códigos QR", descripcion: "Etiquetas para los racks", href: "/admin/almacenes/qr", icono: "qr", estado: "disponible", roles: ROLES_GESTION_INVENTARIO },
  { id: "usuarios", titulo: "Usuarios y roles", descripcion: "Cuentas de los trabajadores", href: "/admin/usuarios", icono: "usuarios", estado: "disponible", roles: ["administrador"] },
  { id: "reportes", titulo: "Reportes", descripcion: "Consumo y rotación de repuestos", href: null, icono: "reportes", estado: "pendiente", roles: ROLES_GESTION_INVENTARIO },
];

export type AccesoOpcion = "permitido" | "restringido" | "pendiente";

export function accesoOpcion(opcion: OpcionMenu, rol: Rol): AccesoOpcion {
  if (opcion.roles && !opcion.roles.includes(rol)) return "restringido";
  if (opcion.estado === "pendiente" || !opcion.href) return "pendiente";
  return "permitido";
}
