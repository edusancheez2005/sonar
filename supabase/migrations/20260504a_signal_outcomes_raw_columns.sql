-- 2026-05-04 (Stage 1: Observability)
-- Persist the *raw* signal direction alongside the displayed signal so that
-- post-hoc audits can ask "would the unflipped engine have been right?"
-- without re-running compute-signals against historical inputs.
--
-- raw_score:     copy of token_signals.raw_score at signal-emission time.
-- raw_direction: bullish / bearish / neutral derived from sign(raw_score)
--                with the same noise floor the engine uses for label gating.
alter table signal_outcomes
  add column if not exists raw_score numeric,
  add column if not exists raw_direction text
    check (raw_direction in ('bullish','bearish','neutral'));

create index if not exists signal_outcomes_raw_direction_idx
  on signal_outcomes (raw_direction);
