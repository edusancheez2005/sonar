#!/usr/bin/env bash
# Apply scripts/seed_famous_wallets_v2.sql to Supabase Postgres.
#
# Requires:
#   - psql on PATH
#   - SUPABASE_DB_URL env var, e.g.:
#       export SUPABASE_DB_URL="postgresql://postgres:<password>@db.<project>.supabase.co:5432/postgres"
#
# Usage:
#   ./scripts/apply_famous_wallets_v2.sh
#
set -euo pipefail

if [ -z "${SUPABASE_DB_URL:-}" ]; then
  echo "ERROR: SUPABASE_DB_URL not set."
  echo "Get the connection string from Supabase dashboard → Project Settings → Database → Connection string (URI)."
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SQL_FILE="$SCRIPT_DIR/seed_famous_wallets_v2.sql"

if [ ! -f "$SQL_FILE" ]; then
  echo "ERROR: SQL file not found at $SQL_FILE"
  exit 1
fi

echo "Applying $SQL_FILE to Supabase..."
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f "$SQL_FILE"

echo
echo "Done. Verification:"
psql "$SUPABASE_DB_URL" -c "SELECT category, COUNT(*) AS entities, SUM(jsonb_array_length(addresses)) AS addresses FROM curated_entities GROUP BY category ORDER BY entities DESC;"
