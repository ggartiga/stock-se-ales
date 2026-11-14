-- =====================================================================
-- STOCK SEÑALES — Migración 6: registro sólo con correo @metro.cl
-- El formulario /registro ya valida el dominio. Esta regla lo refuerza en
-- la base de datos: una cuenta creada sin rol fijado por el servidor (por
-- ejemplo, con supabase.auth.signUp usando la clave pública) se rechaza si
-- el correo no termina en @metro.cl. Las cuentas que crea el administrador
-- desde "Usuarios y roles" llevan app_metadata.rol y no se ven afectadas.
-- =====================================================================

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
  if not (new.raw_app_meta_data ? 'rol')
     and lower(coalesce(new.email, '')) not like '%@metro.cl' then
    raise exception 'Sólo se permiten correos @metro.cl'
      using errcode = '42501', hint = 'DOMINIO_NO_PERMITIDO';
  end if;

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
