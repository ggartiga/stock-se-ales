-- =====================================================================
-- STOCK SEÑALES — Migración 4: Row Level Security y privilegios
--
-- Matriz de permisos
-- ┌──────────────────────┬──────────────┬────────────┬──────────────┐
-- │ Recurso              │ Trabajador   │ Supervisor │ Administrador│
-- ├──────────────────────┼──────────────┼────────────┼──────────────┤
-- │ Inventario/catálogo  │ leer         │ leer       │ leer/escribir│
-- │ Retirar stock (RPC)  │ sí           │ sí         │ sí           │
-- │ Ingreso de stock     │ no           │ no         │ sí           │
-- │ Historial            │ sólo propio  │ todo       │ todo         │
-- │ Modificar historial  │ nunca        │ nunca      │ nunca        │
-- │ Usuarios             │ sólo propio  │ leer todos │ administrar  │
-- └──────────────────────┴──────────────┴────────────┴──────────────┘
-- =====================================================================

alter table public.usuarios    enable row level security;
alter table public.almacenes   enable row level security;
alter table public.ubicaciones enable row level security;
alter table public.productos   enable row level security;
alter table public.inventario  enable row level security;
alter table public.movimientos enable row level security;

-- Nota: no se usa FORCE RLS; las funciones SECURITY DEFINER (propietario
-- postgres) deben poder operar. Los roles de la API nunca son propietarios.

-- ---------------------------------------------------------------------
-- usuarios
-- ---------------------------------------------------------------------
create policy usuarios_leer_propio on public.usuarios
  for select to authenticated
  using (id = (select auth.uid()));

create policy usuarios_leer_todos_supervision on public.usuarios
  for select to authenticated
  using ((select public.es_supervisor_o_admin()));
-- Sin políticas INSERT/UPDATE/DELETE: altas por trigger de Auth y cambios
-- sólo por public.admin_actualizar_usuario().

-- ---------------------------------------------------------------------
-- almacenes
-- ---------------------------------------------------------------------
create policy almacenes_leer on public.almacenes
  for select to authenticated using ((select public.es_usuario_activo()));
create policy almacenes_crear on public.almacenes
  for insert to authenticated with check ((select public.es_administrador()));
create policy almacenes_editar on public.almacenes
  for update to authenticated using ((select public.es_administrador())) with check ((select public.es_administrador()));
create policy almacenes_eliminar on public.almacenes
  for delete to authenticated using ((select public.es_administrador()));

-- ---------------------------------------------------------------------
-- ubicaciones
-- ---------------------------------------------------------------------
create policy ubicaciones_leer on public.ubicaciones
  for select to authenticated using ((select public.es_usuario_activo()));
create policy ubicaciones_crear on public.ubicaciones
  for insert to authenticated with check ((select public.es_administrador()));
create policy ubicaciones_editar on public.ubicaciones
  for update to authenticated using ((select public.es_administrador())) with check ((select public.es_administrador()));
create policy ubicaciones_eliminar on public.ubicaciones
  for delete to authenticated using ((select public.es_administrador()));

-- ---------------------------------------------------------------------
-- productos
-- ---------------------------------------------------------------------
create policy productos_leer on public.productos
  for select to authenticated using ((select public.es_usuario_activo()));
create policy productos_crear on public.productos
  for insert to authenticated with check ((select public.es_administrador()));
create policy productos_editar on public.productos
  for update to authenticated using ((select public.es_administrador())) with check ((select public.es_administrador()));
create policy productos_eliminar on public.productos
  for delete to authenticated using ((select public.es_administrador()));

-- ---------------------------------------------------------------------
-- inventario (cantidad_actual además protegida por trigger)
-- ---------------------------------------------------------------------
create policy inventario_leer on public.inventario
  for select to authenticated using ((select public.es_usuario_activo()));
create policy inventario_crear on public.inventario
  for insert to authenticated with check ((select public.es_administrador()));
create policy inventario_editar on public.inventario
  for update to authenticated using ((select public.es_administrador())) with check ((select public.es_administrador()));
create policy inventario_eliminar on public.inventario
  for delete to authenticated using ((select public.es_administrador()));

-- ---------------------------------------------------------------------
-- movimientos: sólo lectura desde la API. Inserción exclusiva vía RPC.
-- ---------------------------------------------------------------------
create policy movimientos_leer_propios on public.movimientos
  for select to authenticated
  using (usuario_id = (select auth.uid()) and (select public.es_usuario_activo()));

create policy movimientos_leer_todos_supervision on public.movimientos
  for select to authenticated
  using ((select public.es_supervisor_o_admin()));

-- ---------------------------------------------------------------------
-- Privilegios de tabla (defensa en profundidad sobre RLS)
-- ---------------------------------------------------------------------
revoke all on public.usuarios, public.almacenes, public.ubicaciones,
              public.productos, public.inventario, public.movimientos,
              public.v_inventario
  from anon, public;

grant select                         on public.usuarios    to authenticated;
grant select, insert, update, delete on public.almacenes   to authenticated;
grant select, insert, update, delete on public.ubicaciones to authenticated;
grant select, insert, update, delete on public.productos   to authenticated;
grant select, insert, update, delete on public.inventario  to authenticated;
grant select                         on public.movimientos to authenticated;
grant select                         on public.v_inventario to authenticated;

revoke insert, update, delete on public.usuarios    from authenticated;
revoke insert, update, delete on public.movimientos from authenticated, service_role;

-- Columnas de sólo lectura para la API
revoke update on public.inventario from authenticated;
grant  update (cantidad_minima) on public.inventario to authenticated;
revoke update on public.ubicaciones from authenticated;
grant  update (codigo_ubicacion, descripcion, estado) on public.ubicaciones to authenticated;
revoke update on public.productos from authenticated;
grant  update (codigo_sap, elemento, descripcion, activo) on public.productos to authenticated;
revoke update on public.almacenes from authenticated;
grant  update (nombre, codigo, estado) on public.almacenes to authenticated;

-- ---------------------------------------------------------------------
-- Privilegios de funciones
-- ---------------------------------------------------------------------
revoke execute on function public.rol_actual()                from public, anon;
revoke execute on function public.es_usuario_activo()         from public, anon;
revoke execute on function public.es_administrador()          from public, anon;
revoke execute on function public.es_supervisor_o_admin()     from public, anon;
revoke execute on function public.admin_actualizar_usuario(uuid, text, public.rol_usuario, boolean) from public, anon;
revoke execute on function public.registrar_retiro(uuid, integer, uuid, text)      from public, anon;
revoke execute on function public.registrar_ingreso(uuid, integer, uuid, text)     from public, anon;
revoke execute on function public.asignar_producto_ubicacion(uuid, uuid, integer, integer, uuid) from public, anon;
revoke execute on function public.crear_producto(text, text, text, uuid, integer, integer, uuid) from public, anon;
revoke execute on function public.eliminar_producto(uuid)                         from public, anon;
revoke execute on function public.buscar_inventario(text, text, uuid, uuid, text) from public, anon;

grant execute on function public.rol_actual()                to authenticated;
grant execute on function public.es_usuario_activo()         to authenticated;
grant execute on function public.es_administrador()          to authenticated;
grant execute on function public.es_supervisor_o_admin()     to authenticated;
grant execute on function public.admin_actualizar_usuario(uuid, text, public.rol_usuario, boolean) to authenticated;
grant execute on function public.registrar_retiro(uuid, integer, uuid, text)      to authenticated;
grant execute on function public.registrar_ingreso(uuid, integer, uuid, text)     to authenticated;
grant execute on function public.asignar_producto_ubicacion(uuid, uuid, integer, integer, uuid) to authenticated;
grant execute on function public.crear_producto(text, text, text, uuid, integer, integer, uuid) to authenticated;
grant execute on function public.eliminar_producto(uuid)                         to authenticated;
grant execute on function public.buscar_inventario(text, text, uuid, uuid, text) to authenticated;

-- Las funciones del esquema privado no son accesibles desde la API.
revoke all on all functions in schema privado from public, anon, authenticated;
