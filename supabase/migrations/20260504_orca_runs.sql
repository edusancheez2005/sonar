-- ORCA v2 telemetry table
-- Apply manually:
--   psql "$SUPABASE_DB_URL" -f supabase/migrations/20260504_orca_runs.sql
-- Or paste the contents into the Supabase SQL editor.

create extension if not exists pgcrypto;

create table if not exists orca_runs (
  id uuid primary key default gen_random_uuid(),
  ticker text,
  user_id text,
  message text,
  agents jsonb not null default '[]'::jsonb,
  total_latency_ms int,
  total_tokens_in int,
  total_tokens_out int,
  synth_chars int,
  ok boolean not null,
  error text,
  created_at timestamptz not null default now()
);

create index if not exists orca_runs_created_at_idx on orca_runs (created_at desc);
create index if not exists orca_runs_ticker_idx on orca_runs (ticker);
