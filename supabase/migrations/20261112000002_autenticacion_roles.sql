-- =====================================================================
-- STOCK SEÑALES — Migración 2: autenticación, perfiles y roles
-- =====================================================================

-- ---------------------------------------------------------------------
-- Funciones auxiliares de rol (SECURITY DEFINER para evitar recursión
-- de RLS al consultar public.usuarios desde las políticas).
-- Un usuario inactivo no tiene rol => no pasa ninguna política.
-- ---------------------------------------------------------------------
create or replace function public.rol_actual()
returns public.rol_usuario
language sql
stable
security definer
set search_path = ''
as $$
  select u.rol
  from public.usuarios u
  where u.id = auth.uid()
    and u.activo
$$;

create or replace function public.es_usuario_activo()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.rol_actual() is not null
$$;

create or replace function public.es_administrador()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.rol_actual() = 'administrador', false)
$$;

create or replace function public.es_supervisor_o_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.rol_actual() in ('administrador', 'supervisor'), false)
$$;

-- ---------------------------------------------------------------------
-- Alta automática del perfil al crear una cuenta en Supabase Auth.
-- * El nombre se toma de user_metadata.nombre_completo (o del correo).
-- * El rol NUNCA se toma de user_metadata (editable por el usuario);
--   sólo de app_metadata.rol, que sólo puede fijar el servidor.
-- * Si aún no existe ningún administrador, la primera cuenta lo será
--   (arranque inicial del sistema).
-- ---------------------------------------------------------------------
create or replace function privado.crear_perfil_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rol    public.rol_usuario := 'trabajador';
  v_nombre text;
begin
  if not exists (select 1 from public.usuarios where rol = 'administrador') then
    v_rol := 'administrador';
  elsif new.raw_app_meta_data ? 'rol'
     and new.raw_app_meta_data ->> 'rol' in ('administrador', 'supervisor', 'trabajador') then
    v_rol := (new.raw_app_meta_data ->> 'rol')::public.rol_usuario;
  end if;

  v_nombre := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'nombre_completo', '')), '');
  if v_nombre is null or char_length(v_nombre) < 2 then
    v_nombre := split_part(coalesce(new.email, 'usuario'), '@', 1);
  end if;

  insert into public.usuarios (id, nombre_completo, correo, rol)
  values (new.id, left(v_nombre, 150), lower(new.email), v_rol);

  return new;
end;
$$;

create trigger al_crear_cuenta_auth
  after insert on auth.users
  for each row execute function privado.crear_perfil_usuario();

-- Mantener el correo sincronizado si cambia en Supabase Auth.
create or replace function privado.sincronizar_correo_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is distinct from old.email and new.email is not null then
    update public.usuarios set correo = lower(new.email) where id = new.id;
  end if;
  return new;
end;
$$;

create trigger al_cambiar_correo_auth
  after update of email on auth.users
  for each row execute function privado.sincronizar_correo_usuario();

-- ---------------------------------------------------------------------
-- Administración de usuarios (sólo administradores)
-- No existe política UPDATE sobre usuarios: todo cambio pasa por aquí.
-- ---------------------------------------------------------------------
create or replace function public.admin_actualizar_usuario(
  p_usuario_id      uuid,
  p_nombre_completo text,
  p_rol             public.rol_usuario,
  p_activo          boolean
)
returns public.usuarios
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_resultado public.usuarios;
  v_nombre    text := btrim(coalesce(p_nombre_completo, ''));
begin
  if not public.es_administrador() then
    raise exception 'Sólo un administrador puede modificar usuarios'
      using errcode = '42501', hint = 'SIN_PERMISO';
  end if;

  if char_length(v_nombre) < 2 or char_length(v_nombre) > 150 then
    raise exception 'El nombre debe tener entre 2 y 150 caracteres'
      using errcode = '22023', hint = 'DATO_INVALIDO';
  end if;

  -- Bloqueo para evaluar de forma consistente el "último administrador".
  perform 1 from public.usuarios where rol = 'administrador' for update;

  if (p_rol <> 'administrador' or not p_activo)
     and exists (select 1 from public.usuarios where id = p_usuario_id and rol = 'administrador' and activo)
     and (select count(*) from public.usuarios where rol = 'administrador' and activo) <= 1 then
    raise exception 'Debe existir al menos un administrador activo'
      using errcode = '23514', hint = 'ULTIMO_ADMINISTRADOR';
  end if;

  update public.usuarios
     set nombre_completo = v_nombre,
         rol             = p_rol,
         activo          = p_activo
   where id = p_usuario_id
  returning * into v_resultado;

  if not found then
    raise exception 'Usuario no encontrado' using errcode = 'P0002', hint = 'NO_ENCONTRADO';
  end if;

  return v_resultado;
end;
$$;
