#!/usr/bin/env bash
# =====================================================================
# Pruebas de base de datos de STOCK SEÑALES
# Levanta un PostgreSQL temporal, aplica la simulación de Supabase, las
# migraciones reales y el seed, y ejecuta las pruebas SQL y de concurrencia.
#
# Requisitos: PostgreSQL 15+ (initdb, pg_ctl, psql, pgbench) en el PATH
#   o en /usr/lib/postgresql/<versión>/bin.
# Uso: npm run test:db   (o: bash tests/db/ejecutar.sh)
# =====================================================================
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DIR_PRUEBAS="$RAIZ/tests/db"

# PostgreSQL no se ejecuta como root: en contenedores se relanza como "postgres".
if [ "$(id -u)" = "0" ] && id postgres >/dev/null 2>&1; then
  exec runuser -u postgres -- bash "$0" "$@"
fi

if ! command -v initdb >/dev/null 2>&1; then
  PGBIN="$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1 || true)"
  [ -n "$PGBIN" ] && export PATH="$PGBIN:$PATH"
fi
command -v initdb >/dev/null || { echo "No se encontró PostgreSQL (initdb)"; exit 1; }

DATOS="$(mktemp -d)"
SOCKET="$(mktemp -d)"
export PGPORT="${PGPORT_PRUEBAS:-54329}"
export PGHOST="$SOCKET"
export PGUSER=postgres
export PGDATABASE=stock_senales_pruebas

limpiar() { pg_ctl -D "$DATOS" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$DATOS" "$SOCKET"; }
trap limpiar EXIT

initdb -D "$DATOS" -U postgres -A trust --locale=C.UTF-8 >/dev/null
pg_ctl -D "$DATOS" -o "-k $SOCKET -p $PGPORT -c listen_addresses='' -c max_connections=60" -l "$DATOS/log.txt" -w start >/dev/null
createdb "$PGDATABASE"

PSQL=(psql -X -q -v ON_ERROR_STOP=1)
# Muestra sólo los resultados de las aserciones (NOTICE) y los mensajes de sección
formatear() { sed -u -E 's/^psql:[^ ]+ NOTICE:  /   /; s/^NOTICE:  /   /'; }

echo "▶ Aplicando simulación de Supabase"
"${PSQL[@]}" -f "$DIR_PRUEBAS/00_simulacion_supabase.sql"

echo "▶ Aplicando migraciones"
for m in "$RAIZ"/supabase/migrations/*.sql; do
  echo "   · $(basename "$m")"
  "${PSQL[@]}" -f "$m"
done

echo "▶ Cargando datos de prueba (seed)"
"${PSQL[@]}" -o /dev/null -f "$RAIZ/supabase/seed.sql"

echo "▶ Pruebas funcionales y de seguridad"
for t in "$DIR_PRUEBAS"/[1-8]*_*.sql; do
  echo "   · $(basename "$t")"
  "${PSQL[@]}" -o /dev/null -f "$t" 2>&1 | formatear
done

echo "▶ Pruebas de concurrencia"
bash "$DIR_PRUEBAS/concurrencia.sh" 2>&1 | formatear

echo "▶ Limpieza de datos de prueba"
"${PSQL[@]}" -f "$DIR_PRUEBAS/90_preparar_limpieza.sql"
"${PSQL[@]}" -f "$RAIZ/supabase/limpiar_datos_prueba.sql"
"${PSQL[@]}" -o /dev/null -f "$DIR_PRUEBAS/91_verificar_limpieza.sql" 2>&1 | formatear

echo ""
echo "✅ Todas las pruebas de base de datos pasaron"
