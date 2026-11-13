-- =====================================================================
-- Prueba: alta de perfiles, asignación de roles y administración de usuarios
-- =====================================================================
\echo '  [usuarios y roles]'

-- Primera cuenta del sistema => administrador (arranque)
insert into auth.users (id, email, raw_user_meta_data)
values ('11111111-1111-4111-8111-111111111111', 'Admin.Prueba@stock-senales.test',
        '{"nombre_completo": "Ana Administradora (PRUEBA)"}');

-- Supervisor: rol desde app_metadata (sólo lo puede fijar el servidor)
insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data)
values ('22222222-2222-4222-8222-222222222222', 'supervisor.prueba@stock-senales.test',
        '{"nombre_completo": "Sergio Supervisor (PRUEBA)"}', '{"rol": "supervisor"}');

-- Trabajador que intenta auto-asignarse "administrador" vía user_metadata: se ignora
insert into auth.users (id, email, raw_user_meta_data)
values ('33333333-3333-4333-8333-333333333333', 'trabajador.prueba@stock-senales.test',
        '{"nombre_completo": "Tomás Trabajador (PRUEBA)", "rol": "administrador"}');

insert into auth.users (id, email, raw_user_meta_data)
values ('44444444-4444-4444-8444-444444444444', 'trabajadora2.prueba@stock-senales.test',
        '{"nombre_completo": "Teresa Trabajadora (PRUEBA)"}');

-- Sin nombre: se usa la parte local del correo
insert into auth.users (id, email)
values ('55555555-5555-4555-8555-555555555555', 'inactivo.prueba@stock-senales.test');

do $$
begin
  perform pruebas.afirmar((select count(*) = 5 from public.usuarios), 'Se crea un perfil por cada cuenta de Auth');
  perform pruebas.afirmar((select rol = 'administrador' from public.usuarios where id = '11111111-1111-4111-8111-111111111111'),
                          'La primera cuenta es administradora');
  perform pruebas.afirmar((select correo = 'admin.prueba@stock-senales.test' from public.usuarios where id = '11111111-1111-4111-8111-111111111111'),
                          'El correo se normaliza a minúsculas');
  perform pruebas.afirmar((select rol = 'supervisor' from public.usuarios where id = '22222222-2222-4222-8222-222222222222'),
                          'El rol de app_metadata se respeta');
  perform pruebas.afirmar((select rol = 'trabajador' from public.usuarios where id = '33333333-3333-4333-8333-333333333333'),
                          'Un rol en user_metadata (editable por el usuario) se IGNORA');
  perform pruebas.afirmar((select nombre_completo = 'inactivo.prueba' from public.usuarios where id = '55555555-5555-4555-8555-555555555555'),
                          'Sin nombre, se usa la parte local del correo');
end $$;

-- Un trabajador no puede administrar usuarios ni editar su perfil
select pruebas.sesion('33333333-3333-4333-8333-333333333333');
set role authenticated;
select pruebas.debe_fallar(
  $$select public.admin_actualizar_usuario('33333333-3333-4333-8333-333333333333', 'Hacker', 'administrador', true)$$,
  'SIN_PERMISO', 'Trabajador no puede ascenderse a administrador');
select pruebas.debe_fallar(
  $$update public.usuarios set rol = 'administrador' where id = '33333333-3333-4333-8333-333333333333'$$,
  '42501', 'Trabajador no puede actualizar public.usuarios directamente');
select pruebas.debe_fallar(
  $$update public.usuarios set nombre_completo = 'Otro nombre' where id = '33333333-3333-4333-8333-333333333333'$$,
  '42501', 'Trabajador no puede cambiar su propio nombre (se usa en el historial)');
do $$ begin
  perform pruebas.afirmar((select count(*) = 1 from public.usuarios), 'Trabajador sólo ve su propio perfil');
end $$;

-- Supervisor ve a todos pero no administra
reset role;
select pruebas.sesion('22222222-2222-4222-8222-222222222222');
set role authenticated;
do $$ begin
  perform pruebas.afirmar((select count(*) = 5 from public.usuarios), 'Supervisor ve todos los perfiles');
end $$;
select pruebas.debe_fallar(
  $$select public.admin_actualizar_usuario('33333333-3333-4333-8333-333333333333', 'X Y', 'supervisor', true)$$,
  'SIN_PERMISO', 'Supervisor no puede cambiar roles');

-- Administrador administra
reset role;
select pruebas.sesion('11111111-1111-4111-8111-111111111111');
set role authenticated;
select public.admin_actualizar_usuario('55555555-5555-4555-8555-555555555555', 'Iván Inactivo (PRUEBA)', 'trabajador', false);
do $$ begin
  perform pruebas.afirmar((select not activo from public.usuarios where id = '55555555-5555-4555-8555-555555555555'),
                          'Administrador puede desactivar un usuario');
end $$;
select pruebas.debe_fallar(
  $$select public.admin_actualizar_usuario('11111111-1111-4111-8111-111111111111', 'Ana Administradora (PRUEBA)', 'trabajador', true)$$,
  'ULTIMO_ADMINISTRADOR', 'No se puede quitar el rol al último administrador');
select pruebas.debe_fallar(
  $$select public.admin_actualizar_usuario('33333333-3333-4333-8333-333333333333', ' ', 'trabajador', true)$$,
  'DATO_INVALIDO', 'Nombre vacío rechazado');

-- Usuario inactivo: no ve nada
reset role;
select pruebas.sesion('55555555-5555-4555-8555-555555555555');
set role authenticated;
do $$ begin
  perform pruebas.afirmar((select count(*) = 0 from public.v_inventario), 'Usuario desactivado no ve inventario');
  perform pruebas.afirmar((select public.rol_actual() is null), 'Usuario desactivado no tiene rol efectivo');
end $$;

-- Anónimo: sin acceso
reset role;
select pruebas.sesion(null);
set role anon;
select pruebas.debe_fallar($$select * from public.productos$$, '42501', 'Anónimo no puede leer productos');
select pruebas.debe_fallar($$select * from public.v_inventario$$, '42501', 'Anónimo no puede leer inventario');
select pruebas.debe_fallar($$select public.registrar_retiro(gen_random_uuid(), 1, gen_random_uuid())$$, '42501', 'Anónimo no puede retirar');
