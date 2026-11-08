#!/usr/bin/env bash
# Applies every migration to a scratch Postgres database and runs the security checks.
# Usage: PGHOST=... PGPORT=... PGUSER=postgres scripts/test-migrations.sh
set -euo pipefail
cd "$(dirname "$0")/.."

db="vitalog_migration_test"
psql -q -v ON_ERROR_STOP=1 -d postgres -c "drop database if exists $db" -c "create database $db"
psql -q -v ON_ERROR_STOP=1 -d "$db" -f supabase/tests/auth_stub.sql
for f in supabase/migrations/*.sql; do
  echo "applying $f"
  psql -q -v ON_ERROR_STOP=1 -d "$db" -f "$f"
done
psql -q -v ON_ERROR_STOP=1 -d "$db" -f supabase/tests/security.sql
