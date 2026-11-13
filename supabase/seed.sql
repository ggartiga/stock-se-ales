-- =====================================================================
-- STOCK SEÑALES — DATOS FICTICIOS DE PRUEBA
-- Todos los registros llevan es_prueba = true, el sufijo [PRUEBA] en el
-- nombre del almacén y el prefijo PRB- en el código SAP.
-- Para eliminarlos: supabase/limpiar_datos_prueba.sql
-- Se ejecuta automáticamente con `supabase db reset` (sólo entorno local).
-- =====================================================================

begin;

insert into public.almacenes (id, nombre, codigo, es_prueba) values
  ('a0000000-0000-4000-8000-000000000001', 'Almacén LF [PRUEBA]',   'PRB-LF',   true),
  ('a0000000-0000-4000-8000-000000000002', 'Almacén SEAT [PRUEBA]', 'PRB-SEAT', true),
  ('a0000000-0000-4000-8000-000000000003', 'Almacén FL [PRUEBA]',   'PRB-FL',   true);

-- identificador_qr fijo para facilitar pruebas e2e.
-- Nótese que A1 existe en LF y en SEAT: el QR los distingue.
insert into public.ubicaciones (id, almacen_id, codigo_ubicacion, identificador_qr, descripcion) values
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'A1', 'c0000000-0000-4000-8000-0000000000a1', 'Rack A, nivel 1'),
  ('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'A2', 'c0000000-0000-4000-8000-0000000000a2', 'Rack A, nivel 2'),
  ('b0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'A3', 'c0000000-0000-4000-8000-0000000000a3', 'Rack A, nivel 3'),
  ('b0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001', 'A4', 'c0000000-0000-4000-8000-0000000000a4', 'Rack A, nivel 4'),
  ('b0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000001', 'B1', 'c0000000-0000-4000-8000-0000000000b1', 'Rack B, nivel 1'),
  ('b0000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000001', 'B2', 'c0000000-0000-4000-8000-0000000000b2', 'Rack B, nivel 2'),
  ('b0000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000001', 'C1', 'c0000000-0000-4000-8000-0000000000c1', 'Rack C, nivel 1'),
  ('b0000000-0000-4000-8000-000000000008', 'a0000000-0000-4000-8000-000000000002', 'A1', 'c0000000-0000-4000-8000-0000000002a1', 'SEAT rack A1'),
  ('b0000000-0000-4000-8000-000000000009', 'a0000000-0000-4000-8000-000000000003', 'A1', 'c0000000-0000-4000-8000-0000000003a1', 'FL rack A1');

insert into public.productos (id, codigo_sap, elemento, descripcion, es_prueba) values
  ('d0000000-0000-4000-8000-000000000001', 'PRB-10000023262', 'Controlador VCC',        'Controlador de circuito de vía VCC (dato ficticio)', true),
  ('d0000000-0000-4000-8000-000000000002', 'PRB-10000023263', 'Embrague',               'Embrague para accionamiento de cambio (dato ficticio)', true),
  ('d0000000-0000-4000-8000-000000000003', 'PRB-10000023264', 'Soporte de acero',       'Soporte de acero galvanizado para señal (dato ficticio)', true),
  ('d0000000-0000-4000-8000-000000000004', 'PRB-10000023265', 'Relé de vía',            'Relé de seguridad para circuito de vía (dato ficticio)', true),
  ('d0000000-0000-4000-8000-000000000005', 'PRB-10000023266', 'Lámpara LED de señal',   'Módulo LED rojo 12 V (dato ficticio)', true),
  ('d0000000-0000-4000-8000-000000000006', 'PRB-10000023267', 'Cable multipar 10x1,5',  'Tramo de cable multipar (dato ficticio)', true),
  ('d0000000-0000-4000-8000-000000000007', 'PRB-10000023268', 'Fusible 5 A',            'Fusible cerámico 5 A (dato ficticio)', true),
  ('d0000000-0000-4000-8000-000000000008', 'PRB-10000023269', 'Tarjeta de interfaz',    'Tarjeta de interfaz de enclavamiento (dato ficticio)', true);

-- Inventario (el propietario de la BD puede fijar stock inicial en el seed)
insert into public.inventario (producto_id, ubicacion_id, cantidad_actual, cantidad_minima) values
  -- A1 LF: Controlador VCC, Embrague, Soporte de acero
  ('d0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 5, 2),
  ('d0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001', 2, 2),
  ('d0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000001', 0, 1),
  -- A2 LF
  ('d0000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000002', 12, 4),
  ('d0000000-0000-4000-8000-000000000005', 'b0000000-0000-4000-8000-000000000002', 3, 5),
  -- B1 / C1 LF
  ('d0000000-0000-4000-8000-000000000006', 'b0000000-0000-4000-8000-000000000005', 40, 10),
  ('d0000000-0000-4000-8000-000000000007', 'b0000000-0000-4000-8000-000000000007', 100, 20),
  -- El mismo producto en otro almacén (cantidades independientes)
  ('d0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000008', 1, 1),
  ('d0000000-0000-4000-8000-000000000008', 'b0000000-0000-4000-8000-000000000009', 6, 2);

commit;
