-- 2026-05-04 (Stage 3: hysteresis-gated calibration)
-- Two append-only logs that make every sign-multiplier decision auditable:
--
-- calibration_proposal_log: written on EVERY nightly calibrator run for any
--   bucket (token, eval_window) where the derived sign disagrees with the
--   currently-applied sign in token_signal_calibration. The hysteresis gate
--   counts consecutive agreeing rows here before promoting a flip.
--
-- calibration_change_log: written ONLY when a sign actually changes in
--   token_signal_calibration (i.e. when proposals confirm and the cron
--   updates the live row). One row per real flip — this is the table the
--   operator reads when debugging "why did BTC suddenly invert overnight?"
create table if not exists calibration_change_log (
  id bigserial primary key,
  token text not null,
  eval_window text not null,
  old_sign smallint,
  new_sign smallint,
  ic numeric,
  hit_rate numeric,
  n_outcomes int,
  confirmed_runs int,
  decided_at timestamptz not null default now()
);
create index if not exists ccl_token_idx
  on calibration_change_log (token, decided_at desc);

create table if not exists calibration_proposal_log (
  id bigserial primary key,
  token text not null,
  eval_window text not null,
  proposed_sign smallint,
  ic numeric,
  hit_rate numeric,
  n_outcomes int,
  proposed_at timestamptz not null default now()
);
create index if not exists cpl_token_idx
  on calibration_proposal_log (token, eval_window, proposed_at desc);
