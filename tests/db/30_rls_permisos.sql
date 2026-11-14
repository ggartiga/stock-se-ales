-- =====================================================================
-- Prueba: control de permisos (RLS + privilegios + triggers de protección)
-- =====================================================================
\echo '  [permisos por rol]'

-- ---------------- Trabajador ----------------
select pruebas.sesion('33333333-3333-4333-8333-333333333333');
set role authenticated;
do $$ begin
  perform pruebas.afirmar((select count(*) = 9 from public.v_inventario), 'Trabajador consulta todo el inventario');
end $$;
-- Migración 5: el trabajador gestiona almacenes, productos e ingresos.
do $$
declare v_producto uuid; v_resultado text;
begin
  insert into public.almacenes (nombre, codigo, es_prueba) values ('Almacén Trabajador [PRUEBA]', 'PRB-TRB', true);
  insert into public.ubicaciones (almacen_id, codigo_ubicacion) select id, 'T1' from public.almacenes where codigo = 'PRB-TRB';
  perform pruebas.afirmar((select count(*) = 1 from public.ubicaciones u join public.almacenes a on a.id = u.almacen_id where a.codigo = 'PRB-TRB'),
                          'Trabajador crea almacén y ubicación');
  delete from public.ubicaciones where codigo_ubicacion = 'T1';
  delete from public.almacenes where codigo = 'PRB-TRB';
  perform pruebas.afirmar(not exists (select 1 from public.almacenes where codigo = 'PRB-TRB'), 'Trabajador elimina almacén y ubicación');

  v_producto := public.crear_producto('PRB-TRB-1', 'Producto del trabajador', null, null, 0, 0, gen_random_uuid());
  perform pruebas.afirmar(v_producto is not null, 'Trabajador puede usar crear_producto');
  v_resultado := public.eliminar_producto(v_producto);
  perform pruebas.afirmar(v_resultado = 'eliminado', 'Trabajador puede eliminar productos');
end $$;
-- Llega a la validación de cantidad: ya no lo detiene la comprobación de rol.
select pruebas.debe_fallar($$select public.registrar_ingreso((select inventario_id from public.v_inventario limit 1), 0, gen_random_uuid())$$,
  'CANTIDAD_INVALIDA', 'Trabajador puede registrar ingresos (sin rechazo por rol)');
select pruebas.debe_fallar($$select public.admin_actualizar_usuario('33333333-3333-4333-8333-333333333333', 'Yo', 'administrador', true)$$,
  'SIN_PERMISO', 'Trabajador no puede administrar usuarios');
select pruebas.debe_fallar($$update public.inventario set cantidad_actual = 999$$,
  '42501', 'Trabajador no puede modificar el stock directamente');
select pruebas.debe_fallar($$insert into public.movimientos (solicitud_id, producto_id, inventario_id, usuario_id, trabajador, correo_trabajador,
      almacen_id, ubicacion_id, codigo_sap, elemento, almacen_nombre, codigo_ubicacion, tipo_movimiento, cantidad, stock_anterior, stock_nuevo)
    select gen_random_uuid(), producto_id, inventario_id, '33333333-3333-4333-8333-333333333333', 'Falso', 'f@f.cl',
      almacen_id, ubicacion_id, codigo_sap, elemento, almacen_nombre, codigo_ubicacion, 'INGRESO', 100, 0, 100
    from public.v_inventario limit 1$$,
  '42501', 'Trabajador no puede insertar movimientos manipulando la petición');
select pruebas.debe_fallar($$select privado.aplicar_movimiento('33333333-3333-4333-8333-333333333333',
      (select inventario_id from public.v_inventario limit 1), 'INGRESO', 100, gen_random_uuid())$$,
  '42501', 'Las funciones internas (esquema privado) no son accesibles');
select pruebas.debe_fallar($$delete from public.productos where id = 'd0000000-0000-4000-8000-000000000001'$$,
  '23503', 'Un producto con inventario no se borra directamente (integridad referencial)');

-- ---------------- Supervisor ----------------
reset role;
select pruebas.sesion('22222222-2222-4222-8222-222222222222');
set role authenticated;
do $$
declare v_filas int; v_original text;
begin
  insert into public.ubicaciones (almacen_id, codigo_ubicacion) values ('a0000000-0000-4000-8000-000000000001', 'Z9');
  delete from public.ubicaciones where almacen_id = 'a0000000-0000-4000-8000-000000000001' and codigo_ubicacion = 'Z9';
  get diagnostics v_filas = row_count;
  perform pruebas.afirmar(v_filas = 1, 'Supervisor crea y elimina ubicaciones');

  select elemento into v_original from public.productos where id = 'd0000000-0000-4000-8000-000000000001';
  update public.productos set elemento = 'Cambiado' where id = 'd0000000-0000-4000-8000-000000000001';
  get diagnostics v_filas = row_count;
  perform pruebas.afirmar(v_filas = 1, 'Supervisor puede editar productos');
  update public.productos set elemento = v_original where id = 'd0000000-0000-4000-8000-000000000001';
end $$;
select pruebas.debe_fallar($$select public.admin_actualizar_usuario('22222222-2222-4222-8222-222222222222', 'Yo', 'administrador', true)$$,
  'SIN_PERMISO', 'Supervisor no puede administrar usuarios');

-- ---------------- Administrador ----------------
reset role;
select pruebas.sesion('11111111-1111-4111-8111-111111111111');
set role authenticated;
insert into public.almacenes (nombre, codigo, es_prueba) values ('Almacén Temporal [PRUEBA]', 'PRB-TMP', true);
insert into public.ubicaciones (almacen_id, codigo_ubicacion)
  select id, 'Z1' from public.almacenes where codigo = 'PRB-TMP';
do $$ begin
  perform pruebas.afirmar((select count(*) = 1 from public.ubicaciones u join public.almacenes a on a.id = u.almacen_id where a.codigo = 'PRB-TMP'),
                          'Administrador crea almacén y ubicación');
  perform pruebas.afirmar((select identificador_qr is not null from public.ubicaciones where codigo_ubicacion = 'Z1'),
                          'Cada ubicación recibe un identificador QR único automático');
end $$;
select pruebas.debe_fallar($$insert into public.ubicaciones (almacen_id, codigo_ubicacion) select id, 'Z1' from public.almacenes where codigo = 'PRB-TMP'$$,
  '23505', 'No se repite el código de ubicación dentro de un almacén');
-- ...pero sí en otro almacén (A1 existe en LF, SEAT y FL)
do $$ begin
  perform pruebas.afirmar((select count(distinct identificador_qr) = 3 from public.ubicaciones where codigo_ubicacion = 'A1'),
                          'Ubicaciones homónimas en distintos almacenes tienen QR distintos');
end $$;
select pruebas.debe_fallar($$update public.ubicaciones set identificador_qr = gen_random_uuid()$$,
  '42501', 'El identificador QR no se puede alterar desde la API');
select pruebas.debe_fallar($$update public.inventario set cantidad_actual = 999 where producto_id = 'd0000000-0000-4000-8000-000000000001'$$,
  '42501', 'Ni el administrador cambia stock sin movimiento');
select pruebas.debe_fallar($$insert into public.inventario (producto_id, ubicacion_id, cantidad_actual)
      values ('d0000000-0000-4000-8000-000000000008', 'b0000000-0000-4000-8000-000000000001', 50)$$,
  'STOCK_SOLO_POR_MOVIMIENTO', 'Inventario nuevo con stock > 0 sin movimiento es rechazado');
update public.inventario set cantidad_minima = 3
 where producto_id = 'd0000000-0000-4000-8000-000000000001' and ubicacion_id = 'b0000000-0000-4000-8000-000000000001';
do $$ begin
  perform pruebas.afirmar((select cantidad_minima = 3 from public.v_inventario
                            where producto_id = 'd0000000-0000-4000-8000-000000000001' and codigo_ubicacion = 'A1' and almacen_codigo = 'PRB-LF'),
                          'Administrador sí puede ajustar la cantidad mínima');
end $$;
update public.inventario set cantidad_minima = 2
 where producto_id = 'd0000000-0000-4000-8000-000000000001' and ubicacion_id = 'b0000000-0000-4000-8000-000000000001';
select pruebas.debe_fallar($$delete from public.almacenes where codigo = 'PRB-LF'$$,
  '23503', 'No se puede borrar un almacén con ubicaciones (integridad referencial)');

-- service_role (clave secreta) tampoco puede escribir el historial
reset role;
set role service_role;
select pruebas.debe_fallar($$insert into public.movimientos (solicitud_id, producto_id, inventario_id, usuario_id, trabajador, correo_trabajador,
      almacen_id, ubicacion_id, codigo_sap, elemento, almacen_nombre, codigo_ubicacion, tipo_movimiento, cantidad, stock_anterior, stock_nuevo)
    values (gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), 'x', 'x', gen_random_uuid(), gen_random_uuid(),
            'x', 'x', 'x', 'x', 'INGRESO', 1, 0, 1)$$,
  '42501', 'service_role no puede insertar movimientos directamente');
