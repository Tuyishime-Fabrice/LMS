#!/usr/bin/env bash
# Checks supabase/setup.sql on a scratch Postgres: runs it as one transaction on an imitation of a
# new Supabase project, confirms a second run is refused, then runs the behaviour tests in
# supabase/tests against the result.
#
# Usage: scripts/check-supabase-setup.sh <scratch-postgres-url>
#   e.g. scripts/check-supabase-setup.sh postgresql://postgres@127.0.0.1:54329
# The server needs the roles from supabase/setup-build/supabase_stub.sql; "authenticator" must be
# able to log in without a password (trust), as the security tests connect with it.
set -euo pipefail

SERVER="${1:?scratch Postgres URL required, for example postgresql://postgres@127.0.0.1:5432}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DB=dataplus_setup_check
run() { psql "$SERVER/$DB" -X -q -v ON_ERROR_STOP=1 "$@"; }

psql "$SERVER/postgres" -X -q -c "DROP DATABASE IF EXISTS $DB" -c "CREATE DATABASE $DB"
run -f "$ROOT/supabase/setup-build/supabase_stub.sql" >/dev/null 2>&1
run -1 -f "$ROOT/supabase/setup.sql" >/dev/null 2>&1 || { run -1 -f "$ROOT/supabase/setup.sql"; exit 1; }
echo "setup.sql: ran in one transaction"

if run -1 -f "$ROOT/supabase/setup.sql" >/dev/null 2>&1; then
  echo "setup.sql ran a second time; the guard should have refused" >&2; exit 1
fi
echo "setup.sql: second run refused"

run -f "$ROOT/supabase/tests/fixtures.sql" >/dev/null 2>&1
# security_and_certificates logs in as authenticator, the role the Supabase API uses.
AUTH_URL="$(printf '%s' "$SERVER" | sed -E 's#//[^@/]*@#//authenticator@#')"
for test in security_and_certificates ai_tutor lesson_files; do
  if [ "$test" = security_and_certificates ]; then url="$AUTH_URL/$DB"; else url="$SERVER/$DB"; fi
  out="$(psql "$url" -X -v ON_ERROR_STOP=1 -f "$ROOT/supabase/tests/$test.sql" 2>&1)" || { echo "$out" | grep -E "ERROR|FAILED" >&2; exit 1; }
  echo "$test: $(printf '%s\n' "$out" | grep -c 'ok -') checks passed"
done

psql "$SERVER/postgres" -X -q -c "DROP DATABASE IF EXISTS $DB"
