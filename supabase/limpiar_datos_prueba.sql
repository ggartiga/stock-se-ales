-- =====================================================================
-- Elimina TODOS los datos ficticios de prueba (es_prueba = true).
-- Ejecutar como propietario de la base de datos (SQL Editor de Supabase),
-- NUNCA desde la aplicación. Incluye los movimientos de esos productos,
-- por lo que sólo debe usarse antes de pasar a producción.
-- =====================================================================
begin;

delete from public.movimientos m
 where m.producto_id in (select id from public.productos where es_prueba)
    or m.almacen_id  in (select id from public.almacenes where es_prueba);

delete from public.inventario i
 using public.productos p
 where i.producto_id = p.id and p.es_prueba;

delete from public.inventario i
 using public.ubicaciones u, public.almacenes a
 where i.ubicacion_id = u.id and u.almacen_id = a.id and a.es_prueba;

delete from public.productos where es_prueba;

delete from public.ubicaciones u
 using public.almacenes a
 where u.almacen_id = a.id and a.es_prueba;

delete from public.almacenes where es_prueba;

commit;
