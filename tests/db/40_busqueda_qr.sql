-- =====================================================================
-- Prueba: búsqueda, filtros y consulta por ubicación (QR)
-- =====================================================================
\echo '  [búsqueda, filtros y QR]'
select pruebas.sesion('33333333-3333-4333-8333-333333333333');
set role authenticated;

do $$
declare
  v_ubic record;
begin
  perform pruebas.afirmar((select count(*) = 2 from public.buscar_inventario('10000023262', 'sap')),
                          'Búsqueda por código SAP (el producto está en 2 ubicaciones)');
  perform pruebas.afirmar((select count(*) = 1 from public.buscar_inventario('embrague', 'elemento')),
                          'Búsqueda por elemento sin distinguir mayúsculas');
  perform pruebas.afirmar((select count(*) = 1 from public.buscar_inventario('galvanizado', 'descripcion')),
                          'Búsqueda por descripción');
  perform pruebas.afirmar((select count(*) = 0 from public.buscar_inventario('galvanizado', 'elemento')),
                          'El campo de búsqueda restringe dónde se busca');
  perform pruebas.afirmar((select count(*) = 1 from public.buscar_inventario('VCC', 'todo', 'a0000000-0000-4000-8000-000000000002')),
                          'Filtro por almacén');
  perform pruebas.afirmar((select count(*) = 0 from public.buscar_inventario('%', 'todo')),
                          'Los comodines % se escapan (no devuelven todo)');
  perform pruebas.afirmar((select count(*) = 0 from public.buscar_inventario('_', 'sap')),
                          'Los comodines _ se escapan');
  perform pruebas.afirmar((select count(*) = 1 from public.buscar_inventario(null, 'todo', null, null, 'sin_stock')),
                          'Filtro por estado: sin stock');
  perform pruebas.afirmar((select count(*) = 3 from public.buscar_inventario(null, 'todo', null, null, 'stock_bajo')),
                          'Filtro por estado: stock bajo (incluye igual al mínimo)');

  -- Escaneo del QR de A1 (LF): sólo esos 3 productos
  select u.id, u.codigo_ubicacion, a.nombre into v_ubic
    from public.ubicaciones u join public.almacenes a on a.id = u.almacen_id
   where u.identificador_qr = 'c0000000-0000-4000-8000-0000000000a1';
  perform pruebas.afirmar(v_ubic.codigo_ubicacion = 'A1' and v_ubic.nombre like 'Almacén LF%',
                          'El QR identifica almacén LF / ubicación A1');
  perform pruebas.afirmar((select array_agg(elemento order by elemento) = array['Controlador VCC','Embrague','Soporte de acero']
                             from public.buscar_inventario(null, 'todo', null, v_ubic.id)),
                          'QR A1 muestra únicamente Controlador VCC, Embrague y Soporte de acero');

  -- Escaneo de A2: se reemplaza el filtro
  select u.id into v_ubic from public.ubicaciones u where u.identificador_qr = 'c0000000-0000-4000-8000-0000000000a2';
  perform pruebas.afirmar((select array_agg(elemento order by elemento) = array['Lámpara LED de señal','Relé de vía']
                             from public.buscar_inventario(null, 'todo', null, v_ubic.id)),
                          'QR A2 muestra únicamente los productos de A2');

  -- A1 de SEAT no se confunde con A1 de LF
  select u.id into v_ubic from public.ubicaciones u where u.identificador_qr = 'c0000000-0000-4000-8000-0000000002a1';
  perform pruebas.afirmar((select count(*) = 1 from public.buscar_inventario(null, 'todo', null, v_ubic.id)),
                          'QR A1 de SEAT no mezcla productos de A1 de LF');

  perform pruebas.afirmar((select count(*) = 0 from public.ubicaciones where identificador_qr = gen_random_uuid()),
                          'Un QR desconocido no resuelve ninguna ubicación');
end $$;
