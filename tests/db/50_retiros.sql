-- =====================================================================
-- Prueba: retiro transaccional de productos
-- Inventario usado: Controlador VCC en LF/A1 (stock 5)
-- =====================================================================
\echo '  [retiros]'
select pruebas.sesion('33333333-3333-4333-8333-333333333333');
set role authenticated;

do $$
declare
  v_inv uuid;
  v_res jsonb;
  v_mov public.movimientos;
  v_antes timestamptz := clock_timestamp();
begin
  select inventario_id into v_inv from public.v_inventario
   where codigo_sap = 'PRB-10000023262' and almacen_codigo = 'PRB-LF' and codigo_ubicacion = 'A1';

  -- Retiro válido
  v_res := public.registrar_retiro(v_inv, 1, 'e0000000-0000-4000-8000-000000000001', 'Mantención vía 1');
  perform pruebas.afirmar((v_res->>'stock_anterior')::int = 5 and (v_res->>'stock_nuevo')::int = 4,
                          'Retiro de 1 unidad: stock anterior 5 → stock nuevo 4');
  perform pruebas.afirmar((select cantidad_actual = 4 from public.inventario where id = v_inv),
                          'El inventario queda descontado');

  select * into v_mov from public.movimientos where solicitud_id = 'e0000000-0000-4000-8000-000000000001';
  perform pruebas.afirmar(v_mov.tipo_movimiento = 'RETIRO' and v_mov.cantidad = 1, 'Movimiento tipo RETIRO con cantidad 1');
  perform pruebas.afirmar(v_mov.trabajador = 'Tomás Trabajador (PRUEBA)', 'Se registra el nombre del trabajador de la sesión');
  perform pruebas.afirmar(v_mov.correo_trabajador = 'trabajador.prueba@stock-senales.test', 'Se registra el correo del trabajador de la sesión');
  perform pruebas.afirmar(v_mov.usuario_id = '33333333-3333-4333-8333-333333333333', 'Se registra el identificador del usuario');
  perform pruebas.afirmar(v_mov.fecha_hora is not null and v_mov.fecha_hora <= clock_timestamp()
                          and v_mov.fecha_hora >= v_antes - interval '1 minute',
                          'Fecha y hora generadas por el servidor');
  perform pruebas.afirmar(v_mov.codigo_sap = 'PRB-10000023262' and v_mov.codigo_ubicacion = 'A1'
                          and v_mov.almacen_nombre like 'Almacén LF%' and v_mov.elemento = 'Controlador VCC',
                          'Se guarda copia histórica de producto, almacén y ubicación');
  perform pruebas.afirmar(v_mov.observacion = 'Mantención vía 1', 'Se guarda la observación');

  -- Doble pulsación / reintento: misma solicitud => no se descuenta dos veces
  v_res := public.registrar_retiro(v_inv, 1, 'e0000000-0000-4000-8000-000000000001', 'Mantención vía 1');
  perform pruebas.afirmar((v_res->>'repetida')::boolean, 'Repetir la misma solicitud devuelve el movimiento original');
  perform pruebas.afirmar((select cantidad_actual = 4 from public.inventario where id = v_inv),
                          'Doble pulsación NO descuenta dos veces');
  perform pruebas.afirmar((select count(*) = 1 from public.movimientos where solicitud_id = 'e0000000-0000-4000-8000-000000000001'),
                          'Doble pulsación NO duplica el movimiento');
end $$;

select pruebas.debe_fallar($$select public.registrar_retiro(
    (select inventario_id from public.v_inventario where codigo_sap = 'PRB-10000023262' and almacen_codigo = 'PRB-LF'),
    2, 'e0000000-0000-4000-8000-000000000001')$$,
  'SOLICITUD_DUPLICADA', 'Reutilizar un id de solicitud con otra cantidad es rechazado');
select pruebas.debe_fallar($$select public.registrar_retiro(
    (select inventario_id from public.v_inventario where codigo_sap = 'PRB-10000023262' and almacen_codigo = 'PRB-LF'), 0, gen_random_uuid())$$,
  'CANTIDAD_INVALIDA', 'Cantidad 0 rechazada');
select pruebas.debe_fallar($$select public.registrar_retiro(
    (select inventario_id from public.v_inventario where codigo_sap = 'PRB-10000023262' and almacen_codigo = 'PRB-LF'), -3, gen_random_uuid())$$,
  'CANTIDAD_INVALIDA', 'Cantidad negativa rechazada');
select pruebas.debe_fallar($$select public.registrar_retiro(
    (select inventario_id from public.v_inventario where codigo_sap = 'PRB-10000023262' and almacen_codigo = 'PRB-LF'), null, gen_random_uuid())$$,
  'CANTIDAD_INVALIDA', 'Cantidad nula rechazada');
select pruebas.debe_fallar($$select public.registrar_retiro(
    (select inventario_id from public.v_inventario where codigo_sap = 'PRB-10000023262' and almacen_codigo = 'PRB-LF'), 5, gen_random_uuid())$$,
  'STOCK_INSUFICIENTE', 'Retirar más de lo disponible (5 > 4) es rechazado');
select pruebas.debe_fallar($$select public.registrar_retiro(
    (select inventario_id from public.v_inventario where codigo_sap = 'PRB-10000023263' and codigo_ubicacion = 'A1'), 1, null)$$,
  'SOLICITUD_INVALIDA', 'Solicitud sin identificador rechazada');
select pruebas.debe_fallar($$select public.registrar_retiro(
    (select inventario_id from public.v_inventario where elemento = 'Soporte de acero'), 1, gen_random_uuid())$$,
  'STOCK_INSUFICIENTE', 'Producto sin stock no admite retiro');
select pruebas.debe_fallar($$select public.registrar_retiro(gen_random_uuid(), 1, gen_random_uuid())$$,
  'INVENTARIO_NO_ENCONTRADO', 'Inventario inexistente rechazado');
select pruebas.debe_fallar($$select public.registrar_retiro(
    (select inventario_id from public.v_inventario where codigo_sap = 'PRB-10000023262' and almacen_codigo = 'PRB-LF'), 1, gen_random_uuid(), repeat('x', 501))$$,
  'DATO_INVALIDO', 'Observación demasiado larga rechazada');

do $$ begin
  perform pruebas.afirmar((select cantidad_actual = 4 from public.v_inventario where codigo_sap = 'PRB-10000023262' and almacen_codigo = 'PRB-LF'),
                          'Ningún intento fallido alteró el stock');
end $$;

-- Retirar exactamente todo el stock: queda en 0 (nunca negativo) y estado "sin stock"
do $$
declare v_res jsonb;
begin
  v_res := public.registrar_retiro(
    (select inventario_id from public.v_inventario where codigo_sap = 'PRB-10000023263' and codigo_ubicacion = 'A1'),
    2, gen_random_uuid());
  perform pruebas.afirmar((v_res->>'stock_nuevo')::int = 0, 'Retiro del total deja stock en 0');
  perform pruebas.afirmar((select estado_stock = 'sin_stock' from public.v_inventario where codigo_sap = 'PRB-10000023263'),
                          'El estado cambia automáticamente a "sin stock"');
end $$;

-- Usuario desactivado no puede retirar
reset role;
select pruebas.sesion('55555555-5555-4555-8555-555555555555');
set role authenticated;
select pruebas.debe_fallar($$select public.registrar_retiro('00000000-0000-4000-8000-000000000000', 1, gen_random_uuid())$$,
  'USUARIO_INACTIVO', 'Usuario desactivado no puede retirar');

-- ---------------------------------------------------------------------
-- ATOMICIDAD: si falla el registro del movimiento, el stock NO queda descontado
-- Se instala temporalmente un trigger que hace fallar el INSERT en movimientos.
-- ---------------------------------------------------------------------
reset role;
create function pruebas.falla_insercion() returns trigger language plpgsql as $$
begin raise exception 'Fallo simulado al guardar el movimiento'; end $$;
create trigger pruebas_falla before insert on public.movimientos
  for each row execute function pruebas.falla_insercion();

select pruebas.sesion('33333333-3333-4333-8333-333333333333');
set role authenticated;
select pruebas.debe_fallar($$select public.registrar_retiro(
    (select inventario_id from public.v_inventario where elemento = 'Relé de vía'), 3, gen_random_uuid())$$,
  'P0001', 'Retiro con fallo al registrar el movimiento es revertido');
do $$ begin
  perform pruebas.afirmar((select cantidad_actual = 12 from public.v_inventario where elemento = 'Relé de vía'),
                          'ATOMICIDAD: el stock de Relé de vía sigue en 12 tras el fallo');
end $$;
reset role;
drop trigger pruebas_falla on public.movimientos;
drop function pruebas.falla_insercion();

-- ---------------------------------------------------------------------
-- Producto archivado / ubicación inactiva no admiten retiros
-- ---------------------------------------------------------------------
update public.ubicaciones set estado = 'inactivo' where id = 'b0000000-0000-4000-8000-000000000005';
select pruebas.sesion('33333333-3333-4333-8333-333333333333');
set role authenticated;
select pruebas.debe_fallar($$select public.registrar_retiro(
    (select id from public.inventario where ubicacion_id = 'b0000000-0000-4000-8000-000000000005' limit 1), 1, gen_random_uuid())$$,
  'UBICACION_INACTIVA', 'Ubicación inactiva no admite retiros');
reset role;
update public.ubicaciones set estado = 'activo' where id = 'b0000000-0000-4000-8000-000000000005';
