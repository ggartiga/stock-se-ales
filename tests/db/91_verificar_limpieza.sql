\echo '  [limpieza de datos de prueba]'
do $$ begin
  perform pruebas.afirmar((select count(*) = 0 from public.productos where es_prueba), 'No quedan productos de prueba');
  perform pruebas.afirmar((select count(*) = 0 from public.almacenes where es_prueba), 'No quedan almacenes de prueba');
  perform pruebas.afirmar((select count(*) = 1 from public.productos where codigo_sap = '10000099999'), 'Los datos reales se conservan');
  perform pruebas.afirmar((select count(*) = 1 from public.inventario), 'El inventario real se conserva');
end $$;
