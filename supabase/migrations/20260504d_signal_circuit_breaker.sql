-- 2026-05-04d: Signal-type circuit breaker
--
-- Auto-managed by /api/cron/accuracy-watchdog. When recent accuracy for a
-- signal direction (BUY/SELL) collapses below SUPPRESS_THRESHOLD over a
-- minimum sample, the watchdog flips `active` to true; that row gets read
-- by /api/cron/compute-signals which downgrades matching outputs to NEUTRAL
-- before they ever land in `signals` for users.
--
-- Auto-clears when accuracy mean-reverts above CLEAR_THRESHOLD. Operators
-- may also clear manually by setting `active=false` (recorded in admin UI
-- by the /admin/calibration page in a follow-up).
--
-- Single-row-per-direction. Updates use upsert on (signal_type).
create table if not exists signal_circuit_breaker (
  signal_type text primary key check (signal_type in ('BUY','SELL')),
  active boolean not null default false,
  reason text,
  acc_pct numeric,
  sample_size int,
  triggered_at timestamptz,
  cleared_at timestamptz,
  updated_at timestamptz not null default now()
);

-- Seed both rows in inactive state so the cron's upsert path is consistent.
insert into signal_circuit_breaker (signal_type, active) values
  ('BUY', false),
  ('SELL', false)
on conflict (signal_type) do nothing;
