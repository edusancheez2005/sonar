-- 2026-05-04 (Stage 2: kill static fallback)
-- Operator-curated, slow-moving fallback used by the engine when the live
-- `token_signal_calibration` row is null/insufficient. The cron NEVER writes
-- here — only humans do, after reviewing the calibration_change_log.
--
-- Default state is empty: every token runs at +1 (raw direction) until either
-- (a) the calibrator earns the right to override via Stage-3 hysteresis, or
-- (b) an operator inserts a snapshot row by hand.
create table if not exists signal_calibration_snapshot (
  token text not null,
  eval_window text not null check (eval_window in ('1h','6h','24h')),
  sign_multiplier smallint check (sign_multiplier in (-1, 0, 1)),
  confidence_score numeric not null,
  ic numeric,
  n_outcomes int not null,
  approved_by text not null,
  approved_at timestamptz not null default now(),
  notes text,
  primary key (token, eval_window)
);

create index if not exists scs_token_idx on signal_calibration_snapshot (token);
