-- =====================================================================
-- STOCK SEÑALES — Migración 5: gestión de inventario para todos los roles
-- Trabajadores y supervisores pueden, además de retirar:
--   * registrar ingresos de stock y asignar productos a ubicaciones,
--   * crear, editar y eliminar productos,
--   * administrar almacenes y ubicaciones (incluye imprimir QR).
-- La administración de usuarios sigue siendo exclusiva del administrador.
-- =====================================================================

create or replace function public.puede_gestionar_inventario()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.rol_actual() in ('administrador', 'supervisor', 'trabajador'), false)
$$;

revoke execute on function public.puede_gestionar_inventario() from public, anon;
grant  execute on function public.puede_gestionar_inventario() to authenticated;

-- ---------------------------------------------------------------------
-- Políticas RLS de escritura
-- ---------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['almacenes', 'ubicaciones', 'productos', 'inventario'] loop
    execute format('drop policy if exists %1$s_crear on public.%1$s', t);
    execute format('drop policy if exists %1$s_editar on public.%1$s', t);
    execute format('drop policy if exists %1$s_eliminar on public.%1$s', t);
    execute format(
      'create policy %1$s_crear on public.%1$s for insert to authenticated
         with check ((select public.puede_gestionar_inventario()))', t);
    execute format(
      'create policy %1$s_editar on public.%1$s for update to authenticated
         using ((select public.puede_gestionar_inventario()))
         with check ((select public.puede_gestionar_inventario()))', t);
    execute format(
      'create policy %1$s_eliminar on public.%1$s for delete to authenticated
         using ((select public.puede_gestionar_inventario()))', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- RPC: misma lógica que la migración 3, cambiando sólo la comprobación
-- de rol.
-- ---------------------------------------------------------------------
create or replace function public.registrar_ingreso(
  p_inventario_id uuid,
  p_cantidad      integer,
  p_solicitud_id  uuid,
  p_observacion   text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.puede_gestionar_inventario() then
    raise exception 'No tiene permiso para registrar ingresos' using errcode = '42501', hint = 'SIN_PERMISO';
  end if;
  return privado.aplicar_movimiento(auth.uid(), p_inventario_id, 'INGRESO', p_cantidad, p_solicitud_id, p_observacion);
end;
$$;

create or replace function public.asignar_producto_ubicacion(
  p_producto_id      uuid,
  p_ubicacion_id     uuid,
  p_cantidad_minima  integer,
  p_cantidad_inicial integer,
  p_solicitud_id     uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inventario_id uuid;
begin
  if not public.puede_gestionar_inventario() then
    raise exception 'No tiene permiso para asignar productos' using errcode = '42501', hint = 'SIN_PERMISO';
  end if;
  if p_cantidad_minima is null or p_cantidad_minima < 0 then
    raise exception 'La cantidad mínima no puede ser negativa' using errcode = '22023', hint = 'CANTIDAD_INVALIDA';
  end if;
  if p_cantidad_inicial is null or p_cantidad_inicial < 0 then
    raise exception 'El stock inicial no puede ser negativo' using errcode = '22023', hint = 'CANTIDAD_INVALIDA';
  end if;
  if exists (select 1 from public.inventario where producto_id = p_producto_id and ubicacion_id = p_ubicacion_id) then
    raise exception 'El producto ya está registrado en esa ubicación' using errcode = '23505', hint = 'YA_EXISTE';
  end if;

  insert into public.inventario (producto_id, ubicacion_id, cantidad_actual, cantidad_minima)
  values (p_producto_id, p_ubicacion_id, 0, p_cantidad_minima)
  returning id into v_inventario_id;

  if p_cantidad_inicial > 0 then
    perform privado.aplicar_movimiento(auth.uid(), v_inventario_id, 'INGRESO', p_cantidad_inicial,
                                       p_solicitud_id, 'Stock inicial');
  end if;

  return v_inventario_id;
exception
  when foreign_key_violation then
    raise exception 'El producto o la ubicación no existen' using errcode = '23503', hint = 'NO_ENCONTRADO';
end;
$$;

create or replace function public.crear_producto(
  p_codigo_sap       text,
  p_elemento         text,
  p_descripcion      text,
  p_ubicacion_id     uuid,
  p_cantidad_minima  integer,
  p_cantidad_inicial integer,
  p_solicitud_id     uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_producto_id uuid;
  v_restr       text;
begin
  if not public.puede_gestionar_inventario() then
    raise exception 'No tiene permiso para crear productos' using errcode = '42501', hint = 'SIN_PERMISO';
  end if;

  insert into public.productos (codigo_sap, elemento, descripcion)
  values (btrim(p_codigo_sap), btrim(p_elemento), nullif(btrim(coalesce(p_descripcion, '')), ''))
  returning id into v_producto_id;

  if p_ubicacion_id is not null then
    perform public.asignar_producto_ubicacion(v_producto_id, p_ubicacion_id,
                                              coalesce(p_cantidad_minima, 0),
                                              coalesce(p_cantidad_inicial, 0),
                                              p_solicitud_id);
  end if;

  return v_producto_id;
exception
  when unique_violation then
    get stacked diagnostics v_restr = constraint_name;
    if v_restr = 'productos_sap_unico' then
      raise exception 'Ya existe un producto con el código SAP %', btrim(p_codigo_sap)
        using errcode = '23505', hint = 'SAP_DUPLICADO';
    end if;
    raise;
  when check_violation then
    raise exception 'Datos del producto inválidos (revise código SAP y nombre)'
      using errcode = '23514', hint = 'DATO_INVALIDO';
end;
$$;

create or replace function public.eliminar_producto(p_producto_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.puede_gestionar_inventario() then
    raise exception 'No tiene permiso para eliminar productos' using errcode = '42501', hint = 'SIN_PERMISO';
  end if;

  perform 1 from public.productos where id = p_producto_id for update;
  if not found then
    raise exception 'Producto no encontrado' using errcode = 'P0002', hint = 'NO_ENCONTRADO';
  end if;

  if exists (select 1 from public.movimientos where producto_id = p_producto_id) then
    update public.productos set activo = false where id = p_producto_id;
    return 'archivado';
  end if;

  delete from public.inventario where producto_id = p_producto_id;
  delete from public.productos where id = p_producto_id;
  return 'eliminado';
end;
$$;
