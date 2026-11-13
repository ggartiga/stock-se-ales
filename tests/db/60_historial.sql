-- =====================================================================
-- Prueba: historial de movimientos (visibilidad, orden, inmutabilidad)
-- =====================================================================
\echo '  [historial]'

-- Un retiro de otra trabajadora
select pruebas.sesion('44444444-4444-4444-8444-444444444444');
set role authenticated;
select public.registrar_retiro(
  (select inventario_id from public.v_inventario where elemento = 'Fusible 5 A'), 10, gen_random_uuid(), 'Cambio de fusibles');

do $$ begin
  perform pruebas.afirmar((select count(*) = 1 from public.movimientos), 'Trabajadora sólo ve sus propios movimientos');
  perform pruebas.afirmar((select stock_anterior = 100 and stock_nuevo = 90 from public.movimientos), 'Stock anterior/nuevo correctos');
end $$;

-- Intentos de manipulación del historial por un trabajador
select pruebas.debe_fallar($$update public.movimientos set cantidad = 1$$, '42501', 'Trabajadora no puede modificar movimientos');
select pruebas.debe_fallar($$delete from public.movimientos$$, '42501', 'Trabajadora no puede eliminar movimientos');

-- Supervisor: ve todo, ordenado del más reciente al más antiguo
reset role;
select pruebas.sesion('22222222-2222-4222-8222-222222222222');
set role authenticated;
do $$
declare v_primero public.movimientos;
begin
  perform pruebas.afirmar((select count(*) >= 3 from public.movimientos), 'Supervisor ve los movimientos de todos');
  select * into v_primero from public.movimientos order by fecha_hora desc, id desc limit 1;
  perform pruebas.afirmar(v_primero.elemento = 'Fusible 5 A', 'El movimiento más reciente aparece primero');
  perform pruebas.afirmar((select count(*) >= 3 from public.movimientos
                            where fecha_hora >= date_trunc('day', now()) and fecha_hora < date_trunc('day', now()) + interval '1 day'),
                          'Filtro por fecha (rango del día)');
  perform pruebas.afirmar((select count(*) = 0 from public.movimientos where fecha_hora < now() - interval '1 year'),
                          'Filtro por fecha fuera de rango no devuelve resultados');
end $$;
select pruebas.debe_fallar($$update public.movimientos set cantidad = 1$$, '42501', 'Supervisor no puede modificar movimientos');

-- Administrador: tampoco (trazabilidad total)
reset role;
select pruebas.sesion('11111111-1111-4111-8111-111111111111');
set role authenticated;
select pruebas.debe_fallar($$delete from public.movimientos$$, '42501', 'Administrador no puede eliminar movimientos desde la API');

reset role;
set role service_role;
select pruebas.debe_fallar($$update public.movimientos set cantidad = 1$$, '42501', 'Ni la clave secreta (service_role) puede modificar el historial');
select pruebas.debe_fallar($$delete from public.movimientos$$, '42501', 'Ni la clave secreta (service_role) puede borrar el historial');

-- El historial conserva el nombre aunque cambie el perfil
reset role;
select pruebas.sesion('11111111-1111-4111-8111-111111111111');
set role authenticated;
select public.admin_actualizar_usuario('44444444-4444-4444-8444-444444444444', 'Teresa Renombrada (PRUEBA)', 'trabajador', true);
do $$ begin
  perform pruebas.afirmar((select trabajador = 'Teresa Trabajadora (PRUEBA)' from public.movimientos where elemento = 'Fusible 5 A'),
                          'El historial conserva el nombre original del trabajador');
end $$;
