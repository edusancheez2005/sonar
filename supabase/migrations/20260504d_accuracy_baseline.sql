-- 2026-05-04 (Stage 4: accuracy watchdog)
-- Rolling baseline of headline accuracy + signal distribution. The
-- accuracy-watchdog cron writes one row every 6h with the trailing 24h
-- accuracy and the BUY/SELL/NEUTRAL share. Rows where `alerted = true`
-- triggered a webhook POST (reason in `alert_reason`) and are the canonical
-- evidence of past incidents.
create table if not exists accuracy_baseline (
  id bigserial primary key,
  measured_at timestamptz not null default now(),
  accuracy_pct numeric not null,
  sample_size int not null,
  buy_share numeric,
  sell_share numeric,
  neutral_share numeric,
  alerted boolean not null default false,
  alert_reason text
);

create index if not exists accuracy_baseline_measured_idx
  on accuracy_baseline (measured_at desc);
