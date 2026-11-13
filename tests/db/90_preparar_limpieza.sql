-- Antes de limpiar: un producto "real" (es_prueba = false) que NO debe borrarse
insert into public.almacenes (id, nombre, codigo) values ('a0000000-0000-4000-8000-0000000000ff', 'Almacén Real', 'REAL');
insert into public.ubicaciones (id, almacen_id, codigo_ubicacion) values ('b0000000-0000-4000-8000-0000000000ff', 'a0000000-0000-4000-8000-0000000000ff', 'A1');
insert into public.productos (id, codigo_sap, elemento) values ('d0000000-0000-4000-8000-0000000000ff', '10000099999', 'Producto real');
insert into public.inventario (producto_id, ubicacion_id) values ('d0000000-0000-4000-8000-0000000000ff', 'b0000000-0000-4000-8000-0000000000ff');
