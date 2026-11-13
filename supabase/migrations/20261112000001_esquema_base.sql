-- =====================================================================
-- STOCK SEÑALES — Migración 1: esquema base normalizado
-- Tablas: usuarios, almacenes, ubicaciones, productos, inventario, movimientos
-- =====================================================================

create extension if not exists pg_trgm;

-- Esquema privado: funciones internas NO expuestas por la API de Supabase.
create schema if not exists privado;
revoke all on schema privado from public;

-- ---------------------------------------------------------------------
-- Tipos enumerados
-- ---------------------------------------------------------------------
create type public.rol_usuario as enum ('administrador', 'supervisor', 'trabajador');
create type public.tipo_movimiento as enum ('RETIRO', 'INGRESO', 'AJUSTE');
create type public.estado_registro as enum ('activo', 'inactivo');

-- ---------------------------------------------------------------------
-- Función genérica para mantener fecha_actualizacion
-- ---------------------------------------------------------------------
create or replace function privado.tocar_fecha_actualizacion()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.fecha_actualizacion := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- usuarios: perfil de cada cuenta de Supabase Auth
-- ---------------------------------------------------------------------
create table public.usuarios (
  id                  uuid primary key references auth.users (id) on delete restrict,
  nombre_completo     text not null
                      constraint usuarios_nombre_largo check (char_length(btrim(nombre_completo)) between 2 and 150),
  correo              text not null
                      constraint usuarios_correo_formato check (correo ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  rol                 public.rol_usuario not null default 'trabajador',
  activo              boolean not null default true,
  fecha_creacion      timestamptz not null default now(),
  fecha_actualizacion timestamptz not null default now(),
  constraint usuarios_correo_unico unique (correo)
);
comment on table public.usuarios is 'Perfil y rol de cada trabajador autenticado. El id coincide con auth.users.id.';

create trigger usuarios_fecha_actualizacion
  before update on public.usuarios
  for each row execute function privado.tocar_fecha_actualizacion();

-- ---------------------------------------------------------------------
-- almacenes
-- ---------------------------------------------------------------------
create table public.almacenes (
  id                  uuid primary key default gen_random_uuid(),
  nombre              text not null
                      constraint almacenes_nombre_largo check (char_length(btrim(nombre)) between 2 and 100),
  codigo              text not null
                      constraint almacenes_codigo_formato check (codigo ~ '^[A-Z0-9_-]{1,20}$'),
  estado              public.estado_registro not null default 'activo',
  es_prueba           boolean not null default false,
  fecha_creacion      timestamptz not null default now(),
  fecha_actualizacion timestamptz not null default now(),
  constraint almacenes_codigo_unico unique (codigo),
  constraint almacenes_nombre_unico unique (nombre)
);
comment on column public.almacenes.es_prueba is 'TRUE para datos ficticios de prueba (ver supabase/seed.sql).';

create trigger almacenes_fecha_actualizacion
  before update on public.almacenes
  for each row execute function privado.tocar_fecha_actualizacion();

-- ---------------------------------------------------------------------
-- ubicaciones: racks / posiciones dentro de un almacén
-- ---------------------------------------------------------------------
create table public.ubicaciones (
  id                  uuid primary key default gen_random_uuid(),
  almacen_id          uuid not null references public.almacenes (id) on delete restrict,
  codigo_ubicacion    text not null
                      constraint ubicaciones_codigo_formato check (codigo_ubicacion ~ '^[A-Z0-9_-]{1,20}$'),
  -- Identificador único global impreso en el QR. Evita conflictos cuando
  -- dos almacenes tienen una ubicación con el mismo código (p. ej. A1).
  identificador_qr    uuid not null default gen_random_uuid(),
  descripcion         text
                      constraint ubicaciones_descripcion_largo check (descripcion is null or char_length(descripcion) <= 300),
  estado              public.estado_registro not null default 'activo',
  fecha_creacion      timestamptz not null default now(),
  fecha_actualizacion timestamptz not null default now(),
  constraint ubicaciones_qr_unico unique (identificador_qr),
  constraint ubicaciones_codigo_por_almacen unique (almacen_id, codigo_ubicacion)
);

create trigger ubicaciones_fecha_actualizacion
  before update on public.ubicaciones
  for each row execute function privado.tocar_fecha_actualizacion();

-- ---------------------------------------------------------------------
-- productos: catálogo (independiente de dónde esté almacenado)
-- ---------------------------------------------------------------------
create table public.productos (
  id                  uuid primary key default gen_random_uuid(),
  codigo_sap          text not null
                      constraint productos_sap_formato check (codigo_sap ~ '^[A-Za-z0-9._-]{1,30}$'),
  elemento            text not null
                      constraint productos_elemento_largo check (char_length(btrim(elemento)) between 1 and 150),
  descripcion         text
                      constraint productos_descripcion_largo check (descripcion is null or char_length(descripcion) <= 1000),
  -- Un producto con historial no se borra físicamente: se archiva (activo = false).
  activo              boolean not null default true,
  es_prueba           boolean not null default false,
  fecha_creacion      timestamptz not null default now(),
  fecha_actualizacion timestamptz not null default now(),
  constraint productos_sap_unico unique (codigo_sap)
);

create trigger productos_fecha_actualizacion
  before update on public.productos
  for each row execute function privado.tocar_fecha_actualizacion();

-- ---------------------------------------------------------------------
-- inventario: existencias de un producto en una ubicación
-- (un producto puede estar en varias ubicaciones con cantidades independientes)
-- ---------------------------------------------------------------------
create table public.inventario (
  id                  uuid primary key default gen_random_uuid(),
  producto_id         uuid not null references public.productos (id) on delete restrict,
  ubicacion_id        uuid not null references public.ubicaciones (id) on delete restrict,
  cantidad_actual     integer not null default 0
                      constraint inventario_cantidad_no_negativa check (cantidad_actual >= 0),
  cantidad_minima     integer not null default 0
                      constraint inventario_minima_no_negativa check (cantidad_minima >= 0),
  fecha_creacion      timestamptz not null default now(),
  fecha_actualizacion timestamptz not null default now(),
  constraint inventario_producto_ubicacion_unico unique (producto_id, ubicacion_id)
);

create trigger inventario_fecha_actualizacion
  before update on public.inventario
  for each row execute function privado.tocar_fecha_actualizacion();

-- ---------------------------------------------------------------------
-- movimientos: historial inmutable
-- Conserva copia del trabajador y del producto/ubicación al momento
-- del movimiento para mantener la trazabilidad histórica.
-- ---------------------------------------------------------------------
create table public.movimientos (
  id                  bigint generated always as identity primary key,
  -- Clave de idempotencia generada por el cliente al abrir el formulario.
  -- Impide dobles retiros por pulsaciones repetidas o reintentos de red.
  solicitud_id        uuid not null,
  producto_id         uuid not null references public.productos (id) on delete restrict,
  inventario_id       uuid not null references public.inventario (id) on delete restrict,
  usuario_id          uuid not null references public.usuarios (id) on delete restrict,
  trabajador          text not null,
  correo_trabajador   text not null,
  almacen_id          uuid not null references public.almacenes (id) on delete restrict,
  ubicacion_id        uuid not null references public.ubicaciones (id) on delete restrict,
  -- Copias históricas (snapshot)
  codigo_sap          text not null,
  elemento            text not null,
  almacen_nombre      text not null,
  codigo_ubicacion    text not null,
  tipo_movimiento     public.tipo_movimiento not null,
  cantidad            integer not null
                      constraint movimientos_cantidad_positiva check (cantidad > 0),
  stock_anterior      integer not null
                      constraint movimientos_anterior_no_negativo check (stock_anterior >= 0),
  stock_nuevo         integer not null
                      constraint movimientos_nuevo_no_negativo check (stock_nuevo >= 0),
  fecha_hora          timestamptz not null default now(),
  observacion         text
                      constraint movimientos_observacion_largo check (observacion is null or char_length(observacion) <= 500),
  constraint movimientos_solicitud_unica unique (solicitud_id),
  constraint movimientos_coherencia check (
       (tipo_movimiento = 'RETIRO'  and stock_nuevo = stock_anterior - cantidad)
    or (tipo_movimiento = 'INGRESO' and stock_nuevo = stock_anterior + cantidad)
    or (tipo_movimiento = 'AJUSTE'  and abs(stock_nuevo - stock_anterior) = cantidad)
  )
);
comment on table public.movimientos is 'Historial inmutable de movimientos de inventario. Sólo se inserta mediante funciones del servidor.';

-- ---------------------------------------------------------------------
-- Índices
-- ---------------------------------------------------------------------
create index ubicaciones_almacen_idx       on public.ubicaciones (almacen_id);
create index inventario_ubicacion_idx      on public.inventario (ubicacion_id);
create index inventario_producto_idx       on public.inventario (producto_id);
create index productos_elemento_trgm_idx   on public.productos using gin (elemento gin_trgm_ops);
create index productos_descripcion_trgm_idx on public.productos using gin (descripcion gin_trgm_ops);
create index productos_sap_trgm_idx        on public.productos using gin (codigo_sap gin_trgm_ops);
create index movimientos_fecha_idx         on public.movimientos (fecha_hora desc, id desc);
create index movimientos_usuario_fecha_idx on public.movimientos (usuario_id, fecha_hora desc);
create index movimientos_producto_idx      on public.movimientos (producto_id);
create index movimientos_inventario_idx    on public.movimientos (inventario_id);
create index movimientos_ubicacion_idx     on public.movimientos (ubicacion_id);
create index movimientos_almacen_idx       on public.movimientos (almacen_id);

-- ---------------------------------------------------------------------
-- Vista de inventario con estado calculado
-- security_invoker: respeta el RLS del usuario que consulta.
-- Estados: sin_stock (= 0), stock_bajo (<= mínimo), disponible (> mínimo)
-- ---------------------------------------------------------------------
create view public.v_inventario
with (security_invoker = true)
as
select
  i.id                as inventario_id,
  i.producto_id,
  p.codigo_sap,
  p.elemento,
  p.descripcion,
  p.es_prueba,
  i.cantidad_actual,
  i.cantidad_minima,
  case
    when i.cantidad_actual = 0 then 'sin_stock'
    when i.cantidad_actual <= i.cantidad_minima then 'stock_bajo'
    else 'disponible'
  end::text           as estado_stock,
  u.id                as ubicacion_id,
  u.codigo_ubicacion,
  u.identificador_qr,
  u.estado            as ubicacion_estado,
  a.id                as almacen_id,
  a.nombre            as almacen_nombre,
  a.codigo            as almacen_codigo,
  a.estado            as almacen_estado,
  i.fecha_actualizacion
from public.inventario i
join public.productos   p on p.id = i.producto_id
join public.ubicaciones u on u.id = i.ubicacion_id
join public.almacenes   a on a.id = u.almacen_id
where p.activo;
