-- =====================================================================
-- STOCK SEÑALES — Migración 3: lógica transaccional de inventario
--
-- Regla de oro: la cantidad_actual SÓLO cambia junto con un movimiento,
-- dentro de la misma transacción. Una llamada RPC de Supabase es una
-- única transacción: si falla cualquier paso, PostgreSQL revierte todo.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Protección: los roles de la API no pueden cambiar cantidad_actual
-- directamente (ni mover un registro de inventario a otro producto/ubicación).
-- Las funciones SECURITY DEFINER se ejecutan como su propietario y por
-- eso sí pueden hacerlo, siempre registrando el movimiento.
-- ---------------------------------------------------------------------
create or replace function privado.proteger_inventario()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated', 'service_role') then
    if tg_op = 'INSERT' and new.cantidad_actual <> 0 then
      raise exception 'El stock inicial debe registrarse mediante un movimiento de ingreso'
        using errcode = '42501', hint = 'STOCK_SOLO_POR_MOVIMIENTO';
    end if;
    if tg_op = 'UPDATE' then
      if new.cantidad_actual is distinct from old.cantidad_actual then
        raise exception 'El stock sólo puede modificarse mediante un movimiento registrado'
          using errcode = '42501', hint = 'STOCK_SOLO_POR_MOVIMIENTO';
      end if;
      if new.producto_id is distinct from old.producto_id
         or new.ubicacion_id is distinct from old.ubicacion_id then
        raise exception 'No se puede cambiar el producto o la ubicación de un registro de inventario'
          using errcode = '42501', hint = 'INVENTARIO_INMUTABLE';
      end if;
    end if;
  end if;
  return new;
end;
$$;

create trigger inventario_proteger
  before insert or update on public.inventario
  for each row execute function privado.proteger_inventario();

-- ---------------------------------------------------------------------
-- Historial inmutable: nadie desde la API puede modificar ni borrar
-- movimientos (ni siquiera con la clave secreta / service_role).
-- ---------------------------------------------------------------------
create or replace function privado.proteger_movimientos()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated', 'service_role') then
    raise exception 'El historial de movimientos no puede modificarse ni eliminarse'
      using errcode = '42501', hint = 'HISTORIAL_INMUTABLE';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger movimientos_inmutables
  before update or delete on public.movimientos
  for each row execute function privado.proteger_movimientos();

create trigger movimientos_sin_truncate
  before truncate on public.movimientos
  for each statement execute function privado.proteger_movimientos();

-- ---------------------------------------------------------------------
-- Núcleo: aplica un movimiento con bloqueo de fila (SELECT ... FOR UPDATE)
-- * Bloquea el registro de inventario: solicitudes simultáneas sobre el
--   mismo registro se atienden de a una (sin carreras ni stock negativo).
-- * Idempotente por p_solicitud_id: repetir la misma solicitud devuelve
--   el movimiento original sin descontar dos veces.
-- ---------------------------------------------------------------------
create or replace function privado.aplicar_movimiento(
  p_usuario_id    uuid,
  p_inventario_id uuid,
  p_tipo          public.tipo_movimiento,
  p_cantidad      integer,
  p_solicitud_id  uuid,
  p_observacion   text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario   public.usuarios;
  v_inv       record;
  v_existente public.movimientos;
  v_mov       public.movimientos;
  v_anterior  integer;
  v_nuevo     integer;
  v_obs       text := nullif(btrim(coalesce(p_observacion, '')), '');
  v_restr     text;
begin
  if p_solicitud_id is null then
    raise exception 'Falta el identificador de la solicitud'
      using errcode = '22023', hint = 'SOLICITUD_INVALIDA';
  end if;

  if p_cantidad is null or p_cantidad <= 0 then
    raise exception 'La cantidad debe ser un número entero mayor que cero'
      using errcode = '22023', hint = 'CANTIDAD_INVALIDA';
  end if;

  if v_obs is not null and char_length(v_obs) > 500 then
    raise exception 'La observación no puede superar 500 caracteres'
      using errcode = '22023', hint = 'DATO_INVALIDO';
  end if;

  -- Trabajador: SIEMPRE desde la sesión autenticada (nunca desde el cliente).
  select * into v_usuario from public.usuarios where id = p_usuario_id;
  if not found or not v_usuario.activo then
    raise exception 'Usuario sin acceso al sistema'
      using errcode = '42501', hint = 'USUARIO_INACTIVO';
  end if;

  -- 1) Obtener y BLOQUEAR el registro de inventario (stock anterior).
  select i.id, i.cantidad_actual, i.producto_id, i.ubicacion_id,
         p.codigo_sap, p.elemento, p.activo as producto_activo,
         u.codigo_ubicacion, u.estado as ubicacion_estado,
         a.id as almacen_id, a.nombre as almacen_nombre, a.estado as almacen_estado
    into v_inv
    from public.inventario i
    join public.productos   p on p.id = i.producto_id
    join public.ubicaciones u on u.id = i.ubicacion_id
    join public.almacenes   a on a.id = u.almacen_id
   where i.id = p_inventario_id
     for update of i;

  if not found then
    raise exception 'El registro de inventario no existe'
      using errcode = 'P0002', hint = 'INVENTARIO_NO_ENCONTRADO';
  end if;

  -- 2) Idempotencia (se evalúa con el bloqueo tomado, así una solicitud
  --    duplicada concurrente ve el movimiento ya confirmado).
  select * into v_existente from public.movimientos where solicitud_id = p_solicitud_id;
  if found then
    if v_existente.usuario_id <> p_usuario_id
       or v_existente.inventario_id <> p_inventario_id
       or v_existente.tipo_movimiento <> p_tipo
       or v_existente.cantidad <> p_cantidad then
      raise exception 'El identificador de solicitud ya fue utilizado en otra operación'
        using errcode = '23505', hint = 'SOLICITUD_DUPLICADA';
    end if;
    return jsonb_build_object(
      'movimiento_id',  v_existente.id,
      'tipo',           v_existente.tipo_movimiento,
      'cantidad',       v_existente.cantidad,
      'stock_anterior', v_existente.stock_anterior,
      'stock_nuevo',    v_existente.stock_nuevo,
      'fecha_hora',     v_existente.fecha_hora,
      'repetida',       true
    );
  end if;

  if not v_inv.producto_activo then
    raise exception 'El producto está archivado y no admite movimientos'
      using errcode = '42501', hint = 'PRODUCTO_INACTIVO';
  end if;
  if v_inv.ubicacion_estado <> 'activo' or v_inv.almacen_estado <> 'activo' then
    raise exception 'La ubicación o el almacén están inactivos'
      using errcode = '42501', hint = 'UBICACION_INACTIVA';
  end if;

  -- 3) Validar nuevamente disponibilidad y calcular stock nuevo.
  v_anterior := v_inv.cantidad_actual;
  if p_tipo = 'RETIRO' then
    if p_cantidad > v_anterior then
      raise exception 'Stock insuficiente: hay % unidad(es) disponible(s) y se solicitaron %', v_anterior, p_cantidad
        using errcode = '23514', hint = 'STOCK_INSUFICIENTE';
    end if;
    v_nuevo := v_anterior - p_cantidad;
  elsif p_tipo = 'INGRESO' then
    if v_anterior::bigint + p_cantidad > 2147483647 then
      raise exception 'La cantidad supera el máximo permitido'
        using errcode = '22003', hint = 'CANTIDAD_INVALIDA';
    end if;
    v_nuevo := v_anterior + p_cantidad;
  else
    raise exception 'Tipo de movimiento no soportado por esta función'
      using errcode = '22023', hint = 'TIPO_INVALIDO';
  end if;

  -- 4) Descontar / sumar stock.
  update public.inventario set cantidad_actual = v_nuevo where id = p_inventario_id;

  -- 5) Registrar el movimiento. fecha_hora = now() del servidor.
  insert into public.movimientos (
    solicitud_id, producto_id, inventario_id, usuario_id,
    trabajador, correo_trabajador,
    almacen_id, ubicacion_id,
    codigo_sap, elemento, almacen_nombre, codigo_ubicacion,
    tipo_movimiento, cantidad, stock_anterior, stock_nuevo, observacion
  ) values (
    p_solicitud_id, v_inv.producto_id, p_inventario_id, v_usuario.id,
    v_usuario.nombre_completo, v_usuario.correo,
    v_inv.almacen_id, v_inv.ubicacion_id,
    v_inv.codigo_sap, v_inv.elemento, v_inv.almacen_nombre, v_inv.codigo_ubicacion,
    p_tipo, p_cantidad, v_anterior, v_nuevo, v_obs
  )
  returning * into v_mov;

  return jsonb_build_object(
    'movimiento_id',  v_mov.id,
    'tipo',           v_mov.tipo_movimiento,
    'cantidad',       v_mov.cantidad,
    'stock_anterior', v_mov.stock_anterior,
    'stock_nuevo',    v_mov.stock_nuevo,
    'fecha_hora',     v_mov.fecha_hora,
    'repetida',       false
  );
exception
  -- Red de seguridad: si dos solicitudes idénticas chocan en el índice único.
  when unique_violation then
    get stacked diagnostics v_restr = constraint_name;
    if v_restr = 'movimientos_solicitud_unica' then
      raise exception 'La solicitud ya fue procesada'
        using errcode = '23505', hint = 'SOLICITUD_DUPLICADA';
    end if;
    raise;
end;
$$;

revoke all on function privado.aplicar_movimiento(uuid, uuid, public.tipo_movimiento, integer, uuid, text) from public;

-- ---------------------------------------------------------------------
-- RPC pública: RETIRO (cualquier usuario activo)
-- ---------------------------------------------------------------------
create or replace function public.registrar_retiro(
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
  if auth.uid() is null then
    raise exception 'Debe iniciar sesión' using errcode = '28000', hint = 'NO_AUTENTICADO';
  end if;
  if not public.es_usuario_activo() then
    raise exception 'Usuario sin acceso al sistema' using errcode = '42501', hint = 'USUARIO_INACTIVO';
  end if;
  return privado.aplicar_movimiento(auth.uid(), p_inventario_id, 'RETIRO', p_cantidad, p_solicitud_id, p_observacion);
end;
$$;

-- ---------------------------------------------------------------------
-- RPC pública: INGRESO (sólo administradores). Base para el futuro
-- módulo "Ingreso de stock"; hoy la usa el alta de productos.
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
  if not public.es_administrador() then
    raise exception 'Sólo un administrador puede registrar ingresos' using errcode = '42501', hint = 'SIN_PERMISO';
  end if;
  return privado.aplicar_movimiento(auth.uid(), p_inventario_id, 'INGRESO', p_cantidad, p_solicitud_id, p_observacion);
end;
$$;

-- ---------------------------------------------------------------------
-- RPC: asignar un producto a una ubicación (con stock inicial opcional)
-- ---------------------------------------------------------------------
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
  if not public.es_administrador() then
    raise exception 'Sólo un administrador puede asignar productos' using errcode = '42501', hint = 'SIN_PERMISO';
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

-- ---------------------------------------------------------------------
-- RPC: crear producto + primera ubicación + stock inicial (atómico)
-- ---------------------------------------------------------------------
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
  if not public.es_administrador() then
    raise exception 'Sólo un administrador puede crear productos' using errcode = '42501', hint = 'SIN_PERMISO';
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

-- ---------------------------------------------------------------------
-- RPC: eliminar producto. Si tiene historial se ARCHIVA (no se pierde
-- trazabilidad); si no, se elimina físicamente junto a su inventario.
-- ---------------------------------------------------------------------
create or replace function public.eliminar_producto(p_producto_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.es_administrador() then
    raise exception 'Sólo un administrador puede eliminar productos' using errcode = '42501', hint = 'SIN_PERMISO';
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

-- ---------------------------------------------------------------------
-- RPC de búsqueda (respeta RLS: SECURITY INVOKER)
-- p_campo: 'todo' | 'sap' | 'elemento' | 'descripcion'
-- ---------------------------------------------------------------------
create or replace function public.buscar_inventario(
  p_texto        text default null,
  p_campo        text default 'todo',
  p_almacen_id   uuid default null,
  p_ubicacion_id uuid default null,
  p_estado       text default null
)
returns setof public.v_inventario
language sql
stable
security invoker
set search_path = ''
as $$
  with filtro as (
    select '%' || replace(replace(replace(btrim(coalesce(p_texto, '')), '\', '\\'), '%', '\%'), '_', '\_') || '%' as patron,
           btrim(coalesce(p_texto, '')) = '' as sin_texto
  )
  select v.*
    from public.v_inventario v, filtro f
   where (p_almacen_id   is null or v.almacen_id   = p_almacen_id)
     and (p_ubicacion_id is null or v.ubicacion_id = p_ubicacion_id)
     and (p_estado       is null or v.estado_stock = p_estado)
     and (
          f.sin_texto
       or (coalesce(p_campo, 'todo') in ('todo', 'sap')         and v.codigo_sap  ilike f.patron)
       or (coalesce(p_campo, 'todo') in ('todo', 'elemento')    and v.elemento    ilike f.patron)
       or (coalesce(p_campo, 'todo') in ('todo', 'descripcion') and v.descripcion ilike f.patron)
     )
   order by v.elemento, v.almacen_nombre, v.codigo_ubicacion
   limit 500
$$;
