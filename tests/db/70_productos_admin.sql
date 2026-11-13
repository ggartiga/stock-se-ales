-- =====================================================================
-- Prueba: creación, edición y eliminación de productos (administrador)
-- =====================================================================
\echo '  [productos: crear, editar, eliminar]'
select pruebas.sesion('11111111-1111-4111-8111-111111111111');
set role authenticated;

do $$
declare
  v_prod uuid;
  v_inv  uuid;
  v_res  text;
begin
  -- Crear con stock inicial: queda un movimiento INGRESO "Stock inicial"
  v_prod := public.crear_producto('PRB-20000000001', 'Baliza de prueba', 'Baliza ficticia', 'b0000000-0000-4000-8000-000000000003',
                                  2, 7, gen_random_uuid());
  perform pruebas.afirmar((select cantidad_actual = 7 and cantidad_minima = 2 from public.inventario where producto_id = v_prod),
                          'Creación de producto con stock inicial 7 y mínimo 2');
  perform pruebas.afirmar((select count(*) = 1 from public.movimientos
                            where producto_id = v_prod and tipo_movimiento = 'INGRESO' and observacion = 'Stock inicial'
                              and stock_anterior = 0 and stock_nuevo = 7),
                          'El stock inicial queda trazado como movimiento INGRESO');

  -- Editar
  update public.productos set elemento = 'Baliza editada', descripcion = 'Descripción nueva' where id = v_prod;
  perform pruebas.afirmar((select elemento = 'Baliza editada' from public.productos where id = v_prod), 'Edición de producto');

  -- Asignar a otra ubicación (cantidades independientes)
  v_inv := public.asignar_producto_ubicacion(v_prod, 'b0000000-0000-4000-8000-000000000008', 1, 3, gen_random_uuid());
  perform pruebas.afirmar((select count(*) = 2 from public.v_inventario where producto_id = v_prod),
                          'Un producto puede estar en varias ubicaciones');
  perform pruebas.afirmar((select array_agg(cantidad_actual order by cantidad_actual) = array[3,7]
                             from public.v_inventario where producto_id = v_prod),
                          'Con cantidades independientes por ubicación');

  -- Eliminar con historial => se archiva
  v_res := public.eliminar_producto(v_prod);
  perform pruebas.afirmar(v_res = 'archivado', 'Producto con historial se archiva en lugar de borrarse');
  perform pruebas.afirmar((select count(*) = 0 from public.v_inventario where producto_id = v_prod),
                          'El producto archivado deja de aparecer en el inventario');
  perform pruebas.afirmar((select count(*) = 2 from public.movimientos where producto_id = v_prod),
                          'Su historial se conserva');

  -- Eliminar sin historial => se borra
  v_prod := public.crear_producto('PRB-20000000002', 'Producto sin uso', null, 'b0000000-0000-4000-8000-000000000004',
                                  0, 0, gen_random_uuid());
  v_res := public.eliminar_producto(v_prod);
  perform pruebas.afirmar(v_res = 'eliminado' and not exists (select 1 from public.productos where id = v_prod),
                          'Producto sin historial se elimina físicamente');
end $$;

select pruebas.debe_fallar($$select public.crear_producto('PRB-10000023262', 'Duplicado', null, null, 0, 0, gen_random_uuid())$$,
  'SAP_DUPLICADO', 'Código SAP duplicado rechazado');
select pruebas.debe_fallar($$select public.crear_producto('SAP CON ESPACIOS', 'X', null, null, 0, 0, gen_random_uuid())$$,
  'DATO_INVALIDO', 'Código SAP con formato inválido rechazado');
select pruebas.debe_fallar($$select public.crear_producto('PRB-3', 'Mínimo negativo', null, 'b0000000-0000-4000-8000-000000000004', -1, 0, gen_random_uuid())$$,
  'CANTIDAD_INVALIDA', 'Cantidad mínima negativa rechazada');
do $$ begin
  perform pruebas.afirmar(not exists (select 1 from public.productos where codigo_sap = 'PRB-3'),
                          'La creación fallida no deja un producto a medias (atómica)');
end $$;
select pruebas.debe_fallar($$select public.asignar_producto_ubicacion('d0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 0, 0, gen_random_uuid())$$,
  'YA_EXISTE', 'No se duplica un producto en la misma ubicación');
