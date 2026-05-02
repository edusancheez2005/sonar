# Apply scripts/seed_famous_wallets_v2.sql to Supabase Postgres.
#
# Requires:
#   - psql on PATH (install via `winget install PostgreSQL.PostgreSQL` or pgAdmin bundle)
#   - $env:SUPABASE_DB_URL set, e.g.:
#       $env:SUPABASE_DB_URL = "postgresql://postgres:<password>@db.<project>.supabase.co:5432/postgres"
#
# Usage:
#   ./scripts/apply_famous_wallets_v2.ps1

$ErrorActionPreference = 'Stop'

if (-not $env:SUPABASE_DB_URL) {
    Write-Host "ERROR: SUPABASE_DB_URL not set." -ForegroundColor Red
    Write-Host "Get the connection string from Supabase dashboard -> Project Settings -> Database -> Connection string (URI)."
    exit 1
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$sqlFile = Join-Path $scriptDir 'seed_famous_wallets_v2.sql'

if (-not (Test-Path $sqlFile)) {
    Write-Host "ERROR: SQL file not found at $sqlFile" -ForegroundColor Red
    exit 1
}

Write-Host "Applying $sqlFile to Supabase..." -ForegroundColor Cyan
& psql $env:SUPABASE_DB_URL -v ON_ERROR_STOP=1 -f $sqlFile
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "Done. Verification:" -ForegroundColor Green
& psql $env:SUPABASE_DB_URL -c "SELECT category, COUNT(*) AS entities, SUM(jsonb_array_length(addresses)) AS addresses FROM curated_entities GROUP BY category ORDER BY entities DESC;"
