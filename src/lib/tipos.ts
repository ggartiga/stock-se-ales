import type { EstadoStock } from "./dominio/stock";
import type { Rol } from "./dominio/permisos";

/** Tipos de las filas que la app lee de Supabase (alineados con las migraciones SQL). */

export interface Perfil {
  id: string;
  nombre_completo: string;
  correo: string;
  rol: Rol;
  activo: boolean;
  fecha_creacion?: string;
}

export interface Almacen {
  id: string;
  nombre: string;
  codigo: string;
  estado: "activo" | "inactivo";
  es_prueba: boolean;
}

export interface Ubicacion {
  id: string;
  almacen_id: string;
  codigo_ubicacion: string;
  identificador_qr: string;
  descripcion: string | null;
  estado: "activo" | "inactivo";
}

export interface Producto {
  id: string;
  codigo_sap: string;
  elemento: string;
  descripcion: string | null;
  activo: boolean;
  es_prueba: boolean;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

/** Fila de public.v_inventario / public.buscar_inventario() */
export interface ItemInventario {
  inventario_id: string;
  producto_id: string;
  codigo_sap: string;
  elemento: string;
  descripcion: string | null;
  es_prueba: boolean;
  cantidad_actual: number;
  cantidad_minima: number;
  estado_stock: EstadoStock;
  ubicacion_id: string;
  codigo_ubicacion: string;
  identificador_qr: string;
  ubicacion_estado: "activo" | "inactivo";
  almacen_id: string;
  almacen_nombre: string;
  almacen_codigo: string;
  almacen_estado: "activo" | "inactivo";
  fecha_actualizacion: string;
}

export type TipoMovimiento = "RETIRO" | "INGRESO" | "AJUSTE";

export interface Movimiento {
  id: number;
  producto_id: string;
  inventario_id: string;
  usuario_id: string;
  trabajador: string;
  correo_trabajador: string;
  almacen_id: string;
  ubicacion_id: string;
  codigo_sap: string;
  elemento: string;
  almacen_nombre: string;
  codigo_ubicacion: string;
  tipo_movimiento: TipoMovimiento;
  cantidad: number;
  stock_anterior: number;
  stock_nuevo: number;
  fecha_hora: string;
  observacion: string | null;
}

export interface ResultadoMovimiento {
  movimiento_id: number;
  tipo: TipoMovimiento;
  cantidad: number;
  stock_anterior: number;
  stock_nuevo: number;
  fecha_hora: string;
  repetida: boolean;
}

/** Estado devuelto por las Server Actions a los formularios (useActionState). */
export interface EstadoFormulario {
  ok: boolean;
  mensaje: string | null;
  /** Cambia en cada envío para que el formulario pueda reaccionar (p. ej. limpiar campos). */
  marca?: number;
}

export const ESTADO_INICIAL: EstadoFormulario = { ok: false, mensaje: null };
