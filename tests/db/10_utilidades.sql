-- Utilidades de aserción para las pruebas SQL (esquema "pruebas", sólo en el entorno de prueba)
create schema if not exists pruebas;
grant usage on schema pruebas to anon, authenticated, service_role;

-- Fija el usuario autenticado de la "petición" (equivale al JWT de Supabase)
create or replace function pruebas.sesion(p_uid uuid)
returns void language sql as $$
  select set_config('request.jwt.claim.sub', coalesce(p_uid::text, ''), false);
$$;

create or replace function pruebas.afirmar(p_condicion boolean, p_descripcion text)
returns void language plpgsql as $$
begin
  if p_condicion is distinct from true then
    raise exception 'FALLÓ: %', p_descripcion;
  end if;
  raise notice '  ✔ %', p_descripcion;
end;
$$;

-- Ejecuta p_sql y exige que falle con el hint o SQLSTATE indicado.
create or replace function pruebas.debe_fallar(p_sql text, p_esperado text, p_descripcion text)
returns void language plpgsql as $$
declare
  v_estado text; v_hint text; v_msg text;
begin
  begin
    execute p_sql;
  exception when others then
    get stacked diagnostics v_estado = returned_sqlstate, v_hint = pg_exception_hint, v_msg = message_text;
    if p_esperado is not null and p_esperado not in (coalesce(v_hint, ''), v_estado) then
      raise exception 'FALLÓ: % — se esperaba "%" pero llegó [% / %] %', p_descripcion, p_esperado, v_estado, v_hint, v_msg;
    end if;
    raise notice '  ✔ % (rechazado: %)', p_descripcion, v_msg;
    return;
  end;
  raise exception 'FALLÓ: % — la operación debía ser rechazada y se ejecutó', p_descripcion;
end;
$$;

grant execute on all functions in schema pruebas to anon, authenticated, service_role;
