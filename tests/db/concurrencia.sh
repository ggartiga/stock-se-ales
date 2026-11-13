#!/usr/bin/env bash
# =====================================================================
# Pruebas de operaciones simultáneas (se invoca desde ejecutar.sh)
# 1) 20 clientes × 10 retiros de 1 unidad sobre un stock de 100 (200 intentos):
#    deben concretarse exactamente 100, el stock terminar en 0 y nunca ser negativo.
# 2) La misma solicitud enviada dos veces en paralelo descuenta una sola vez.
# =====================================================================
set -euo pipefail
PSQL=(psql -X -q -v ON_ERROR_STOP=1 -At)
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

TRABAJADOR=33333333-3333-4333-8333-333333333333

# Preparación (como propietario): producto con 100 unidades y función de intento
"${PSQL[@]}" <<'SQL'
insert into public.productos (id, codigo_sap, elemento, es_prueba)
values ('d0000000-0000-4000-8000-0000000000cc', 'PRB-CONCURRENCIA', 'Producto concurrencia', true);
insert into public.inventario (id, producto_id, ubicacion_id, cantidad_actual, cantidad_minima)
values ('f0000000-0000-4000-8000-0000000000cc', 'd0000000-0000-4000-8000-0000000000cc',
        'b0000000-0000-4000-8000-000000000003', 100, 5);
SQL

# Intenta un retiro; el rechazo por stock insuficiente devuelve false sin abortar al cliente
"${PSQL[@]}" <<'SQL'
create or replace function pruebas.intentar_retiro(p_inv uuid, p_cant int)
returns boolean language plpgsql as $$
declare v_hint text;
begin
  perform public.registrar_retiro(p_inv, p_cant, gen_random_uuid());
  return true;
exception when others then
  get stacked diagnostics v_hint = pg_exception_hint;
  if v_hint = 'STOCK_INSUFICIENTE' then
    return false;
  end if;
  raise;
end $$;
grant execute on function pruebas.intentar_retiro(uuid, int) to authenticated;
SQL

cat > "$TMP/retiro.sql" <<SQL
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '$TRABAJADOR', false);
SELECT pruebas.intentar_retiro('f0000000-0000-4000-8000-0000000000cc', 1);
RESET ROLE;
SQL

echo "  [concurrencia] 20 clientes × 10 retiros simultáneos sobre stock 100…"
pgbench -n -c 20 -j 4 -t 10 -f "$TMP/retiro.sql" >"$TMP/pgbench.log" 2>&1 || { cat "$TMP/pgbench.log"; exit 1; }
grep -E "number of failed transactions|transactions actually processed" "$TMP/pgbench.log" | sed 's/^/     /'

"${PSQL[@]}" <<'SQL'
do $$
declare
  v_stock int; v_movs int; v_suma int; v_distintos int; v_incoherentes int;
begin
  select cantidad_actual into v_stock from public.inventario where id = 'f0000000-0000-4000-8000-0000000000cc';
  select count(*), coalesce(sum(cantidad), 0), count(distinct stock_anterior)
    into v_movs, v_suma, v_distintos
    from public.movimientos where inventario_id = 'f0000000-0000-4000-8000-0000000000cc';
  select count(*) into v_incoherentes from public.movimientos
   where inventario_id = 'f0000000-0000-4000-8000-0000000000cc' and stock_nuevo <> stock_anterior - cantidad;

  perform pruebas.afirmar(v_stock = 0, format('Stock final 0 (obtenido %s), nunca negativo', v_stock));
  perform pruebas.afirmar(v_movs = 100 and v_suma = 100, format('Exactamente 100 retiros registrados (obtenidos %s)', v_movs));
  perform pruebas.afirmar(v_distintos = 100, 'Cada retiro vio un stock anterior distinto (100…1): sin lecturas obsoletas');
  perform pruebas.afirmar(v_incoherentes = 0, 'Todos los movimientos son coherentes (anterior − cantidad = nuevo)');
end $$;
SQL

echo "  [concurrencia] misma solicitud enviada dos veces en paralelo…"
"${PSQL[@]}" <<'SQL'
update public.inventario set cantidad_minima = 0 where id = 'f0000000-0000-4000-8000-0000000000cc';
insert into public.productos (id, codigo_sap, elemento, es_prueba)
values ('d0000000-0000-4000-8000-0000000000dd', 'PRB-DOBLE', 'Producto doble envío', true);
insert into public.inventario (id, producto_id, ubicacion_id, cantidad_actual)
values ('f0000000-0000-4000-8000-0000000000dd', 'd0000000-0000-4000-8000-0000000000dd',
        'b0000000-0000-4000-8000-000000000003', 10);
SQL

SOLICITUD=e0000000-0000-4000-8000-0000000000dd
# Sesión A: retira y mantiene la transacción abierta 2 s (simula latencia)
( "${PSQL[@]}" <<SQL >"$TMP/a.txt" 2>&1
set role authenticated;
select set_config('request.jwt.claim.sub', '$TRABAJADOR', false) \g /dev/null
begin;
select (public.registrar_retiro('f0000000-0000-4000-8000-0000000000dd', 3, '$SOLICITUD'))->>'repetida';
select pg_sleep(2) \g /dev/null
commit;
SQL
) &
PID_A=$!
sleep 0.5
# Sesión B: la misma solicitud (doble pulsación) llega mientras A está en curso
"${PSQL[@]}" <<SQL >"$TMP/b.txt" 2>&1
set role authenticated;
select set_config('request.jwt.claim.sub', '$TRABAJADOR', false) \g /dev/null
select (public.registrar_retiro('f0000000-0000-4000-8000-0000000000dd', 3, '$SOLICITUD'))->>'repetida';
SQL
wait $PID_A

echo "     sesión A repetida=$(tr -d '\n' <"$TMP/a.txt")  sesión B repetida=$(tr -d '\n' <"$TMP/b.txt")"
"${PSQL[@]}" <<'SQL'
do $$ begin
  perform pruebas.afirmar((select cantidad_actual = 7 from public.inventario where id = 'f0000000-0000-4000-8000-0000000000dd'),
                          'Doble envío simultáneo descuenta una sola vez (10 → 7)');
  perform pruebas.afirmar((select count(*) = 1 from public.movimientos where solicitud_id = 'e0000000-0000-4000-8000-0000000000dd'),
                          'Doble envío simultáneo registra un único movimiento');
end $$;
SQL
grep -q "true" "$TMP/b.txt" || { echo "FALLÓ: la sesión B debía recibir repetida=true"; exit 1; }
echo "     ✔ La segunda solicitud esperó el bloqueo y recibió el movimiento original"
