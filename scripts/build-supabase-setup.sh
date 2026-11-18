#!/usr/bin/env bash
# Rebuilds supabase/setup.sql: one script that creates the whole database on a new, empty
# Supabase project. It replays supabase/migrations in a working order on a scratch Postgres
# (with stand-ins for Supabase's auth and storage schemas), then dumps the result.
#
# Usage: scripts/build-supabase-setup.sh <scratch-postgres-url>
#   e.g. scripts/build-supabase-setup.sh postgresql://postgres@127.0.0.1:54329
# The scratch server must be disposable: the script creates and drops databases on it.
# Needs psql, pg_dump and python3.
set -euo pipefail

SERVER="${1:?scratch Postgres URL required, for example postgresql://postgres@127.0.0.1:5432}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MIG="$ROOT/supabase/migrations"
DB=dataplus_setup_build
OUT="$ROOT/supabase/setup.sql"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

psql_db() { psql "$SERVER/$1" -X -q -v ON_ERROR_STOP=1 "${@:2}"; }

psql_db postgres -c "DROP DATABASE IF EXISTS $DB" -c "CREATE DATABASE $DB"
psql_db "$DB" -f "$ROOT/supabase/setup-build/supabase_stub.sql" >/dev/null

# Working order: base schema (2025-09 to 2025-12), then the 2025-01/02 fixes that were
# written against it, then everything from 2026. Two steps need a committed change first.
mapfile -t base < <(cd "$MIG" && ls 20250[9]*.sql 20251*.sql)
mapfile -t fixes < <(cd "$MIG" && ls 20250[1-8]*.sql)
mapfile -t later < <(cd "$MIG" && ls 2026*.sql)

for f in "${base[@]}" "${fixes[@]}" "${later[@]}"; do
  case "$f" in
    20250204000000_create_admin_system.sql)
      psql_db "$DB" -c "ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'admin'" ;;
    20250208000000_admin_dashboard_stats.sql)
      psql_db "$DB" -c "DROP FUNCTION IF EXISTS public.get_all_profiles(); DROP FUNCTION IF EXISTS public.get_all_student_progress();" ;;
  esac
  if ! psql_db "$DB" -1 -f "$MIG/$f" >/dev/null 2>"$TMP/err"; then
    echo "Migration failed: $f" >&2
    cat "$TMP/err" >&2
    exit 1
  fi
done
echo "Applied ${#base[@]} + ${#fixes[@]} + ${#later[@]} migrations"

pg_dump "$SERVER/$DB" -n public --no-owner --column-inserts > "$TMP/public.sql"

# Parts outside the public schema, read back with an empty search_path so every name is qualified.
psql_db "$DB" -At -c "SET search_path = ''" -c "
SELECT 'DROP TRIGGER IF EXISTS ' || quote_ident(tgname) || ' ON auth.users;' || chr(10) || pg_get_triggerdef(oid) || ';'
FROM pg_trigger WHERE tgrelid = 'auth.users'::regclass AND NOT tgisinternal ORDER BY tgname" > "$TMP/auth.sql"

psql_db "$DB" -At -c "SET search_path = ''" -c "
SELECT format('INSERT INTO storage.buckets (id, name, public) VALUES (%L, %L, %s) ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;', id, name, CASE WHEN public THEN 'true' ELSE 'false' END)
FROM storage.buckets ORDER BY id" > "$TMP/buckets.sql"

psql_db "$DB" -At -c "SET search_path = ''" -c "
SELECT format('DROP POLICY IF EXISTS %I ON storage.%I;', p.polname, c.relname) || chr(10) ||
       format('CREATE POLICY %I ON storage.%I AS %s FOR %s TO %s%s%s;',
         p.polname, c.relname,
         CASE WHEN p.polpermissive THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END,
         CASE p.polcmd WHEN 'r' THEN 'SELECT' WHEN 'a' THEN 'INSERT' WHEN 'w' THEN 'UPDATE' WHEN 'd' THEN 'DELETE' ELSE 'ALL' END,
         CASE WHEN p.polroles = '{0}' THEN 'public'
              ELSE (SELECT string_agg(quote_ident(rolname), ', ') FROM pg_roles WHERE oid = ANY (p.polroles)) END,
         coalesce(' USING (' || pg_get_expr(p.polqual, p.polrelid) || ')', ''),
         coalesce(' WITH CHECK (' || pg_get_expr(p.polwithcheck, p.polrelid) || ')', ''))
FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid
WHERE c.relnamespace = 'storage'::regnamespace ORDER BY c.relname, p.polname" > "$TMP/storage.sql"

# Permissions exactly as the migrations left them. A dump assumes objects start with Postgres'
# defaults, but Supabase grants anon and authenticated everything on new objects, so the
# revokes in the migrations would otherwise be lost.
psql_db "$DB" -At -c "SET search_path = ''" -c "
WITH objects AS (
  SELECT 'FUNCTION' AS kind, p.oid::regprocedure::text AS name, coalesce(p.proacl, acldefault('f', p.proowner)) AS acl, p.proowner AS owner, 1 AS sort
  FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace AND p.prokind IN ('f', 'p')
    AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.classid = 'pg_proc'::regclass AND d.objid = p.oid AND d.deptype = 'e')
  UNION ALL
  SELECT CASE WHEN c.relkind = 'S' THEN 'SEQUENCE' ELSE 'TABLE' END, c.oid::regclass::text,
         coalesce(c.relacl, acldefault((CASE WHEN c.relkind = 'S' THEN 's' ELSE 'r' END)::\"char\", c.relowner)), c.relowner, 0
  FROM pg_class c WHERE c.relnamespace = 'public'::regnamespace AND c.relkind IN ('r', 'p', 'v', 'm', 'S')
    AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.classid = 'pg_class'::regclass AND d.objid = c.oid AND d.deptype = 'e')
)
SELECT format('REVOKE ALL ON %s %s FROM PUBLIC, anon, authenticated, service_role;', kind, name)
       || coalesce((SELECT string_agg(format(' GRANT %s ON %s %s TO %s;', a.privs, kind, name, a.grantee), '')
                    FROM (SELECT CASE WHEN x.grantee = 0 THEN 'PUBLIC' ELSE quote_ident(r.rolname) END AS grantee,
                                 string_agg(x.privilege_type, ', ' ORDER BY x.privilege_type) AS privs
                          FROM aclexplode(o.acl) x LEFT JOIN pg_roles r ON r.oid = x.grantee
                          WHERE x.grantee <> o.owner GROUP BY 1 ORDER BY 1) a), '')
FROM objects o ORDER BY sort, name" > "$TMP/acl.sql"

python3 - "$TMP" "$OUT" "$MIG/20261118000100_realtime_tables.sql" <<'PY'
import re, sys, pathlib
tmp, out, realtime = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2]), pathlib.Path(sys.argv[3])
dump = (tmp / "public.sql").read_text()

drop_line = re.compile(
    r"^(\\(un)?restrict .*"            # psql-only lines; the SQL Editor rejects them
    r"|CREATE SCHEMA public;"          # exists already on Supabase
    r"|COMMENT ON SCHEMA public .*"
    r"|ALTER DEFAULT PRIVILEGES .*"    # Supabase sets these itself
    r"|GRANT USAGE ON SCHEMA public .*"
    r"|-- Dumped (from|by) .*"
    r"|-- PostgreSQL database dump.*)$")
lines = [l for l in dump.splitlines() if not drop_line.match(l)]
body = re.sub(r"(--\n)+(-- Name: [^\n]*\n)?(--\n)+", "\n", "\n".join(lines) + "\n")
body = re.sub(r"\n{3,}", "\n\n", body).strip() + "\n"

header = """-- DataPlus Academy: complete database for a NEW, EMPTY Supabase project.
--
-- Paste this whole file into Supabase Dashboard -> SQL Editor -> New query, and run it once.
-- It runs as a single transaction: if anything fails, nothing is kept.
-- It creates the tables, security rules (RLS), functions, the sign-up trigger,
-- the storage buckets and their rules, and turns on live updates for messages.
--
-- Do not run it on a database that is already in use. For an existing project,
-- apply new files from supabase/migrations one at a time instead.
--
-- Generated by scripts/build-supabase-setup.sh from supabase/migrations. Do not edit by hand.

BEGIN;

DO $guard$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL THEN
    RAISE EXCEPTION 'This project already has DataPlus tables. supabase/setup.sql is only for a new, empty project.';
  END IF;
  IF to_regclass('auth.users') IS NULL OR to_regclass('storage.buckets') IS NULL THEN
    RAISE EXCEPTION 'auth.users or storage.buckets is missing. Run this in the SQL Editor of a Supabase project.';
  END IF;
END
$guard$;

"""

def section(title, text):
    return f"\n-- ===== {title} =====\n\n{text.strip()}\n"

realtime_sql = "\n".join(l for l in realtime.read_text().splitlines() if not l.startswith("--"))
footer = "\nCOMMIT;\n\nSELECT 'DataPlus Academy database is ready' AS result;\n"
out.write_text(header + section("Public schema", body)
               + section("Sign-up: create a profile for every new account", (tmp / "auth.sql").read_text())
               + section("Storage buckets", (tmp / "buckets.sql").read_text())
               + section("Storage rules", (tmp / "storage.sql").read_text())
               + section("Live updates", realtime_sql)
               + section("Permissions on tables and functions", (tmp / "acl.sql").read_text())
               + footer)
print(f"Wrote {out} ({out.stat().st_size // 1024} KB)")
PY

psql_db postgres -c "DROP DATABASE IF EXISTS $DB"
