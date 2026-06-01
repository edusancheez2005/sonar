-- =============================================================================
-- 2026-06-01: Breaker shadow observability + dead-lock unblock
-- =============================================================================
-- Adds the schema columns that let the per-direction circuit breaker
-- (signal_circuit_breaker) escape the self-locking dead-state diagnosed on
-- 2026-06-01 (see SIGNAL_REMEDIATION_2026-06-01_PROMPT.md, §3.1):
--
--   Old failure mode: breaker suppresses BUY → no graded BUY rows in
--   signal_outcomes → breaker's clear condition (n>=25 over 6h) never
--   measurable → breaker latches forever.
--
--   Fix: shadow-grade the suppressed direction. Engine still publishes
--   NEUTRAL to users, but the would-be label is persisted on the row and
--   the grader writes an outcome with shadow=true. The watchdog's clear
--   condition reads the union of live + shadow outcomes.
--
-- Three columns added; one index. All defaults are safe: existing rows
-- keep their current behavior (original_signal=NULL → not a shadow,
-- breaker_suppressed=false, shadow=false).
-- =============================================================================

-- 1. token_signals: capture the would-be label + suppression flag.
alter table public.token_signals
  add column if not exists original_signal text
    check (original_signal in ('STRONG BUY','BUY','NEUTRAL','SELL','STRONG SELL') or original_signal is null),
  add column if not exists breaker_suppressed boolean not null default false;

comment on column public.token_signals.original_signal is
  'Would-be signal label before any downstream suppression (breaker or tier-disagree gate). NULL when no suppression occurred. Used by evaluate-signals to shadow-grade suppressed directions so the breaker clear condition stays measurable.';

comment on column public.token_signals.breaker_suppressed is
  'TRUE iff the signal was downgraded to NEUTRAL by the per-direction circuit breaker (signal_circuit_breaker). The user-facing signal column shows NEUTRAL; original_signal carries the suppressed direction.';

-- Partial index supports the watchdog/grader filter "find shadow candidates"
-- without scanning the full table. Selective: only ~suppressed rows exist
-- (currently ~10% of emissions).
create index if not exists idx_token_signals_breaker_suppressed
  on public.token_signals (computed_at)
  where breaker_suppressed = true;


-- 2. signal_outcomes: mark grading rows that came from shadow paths.
alter table public.signal_outcomes
  add column if not exists shadow boolean not null default false;

comment on column public.signal_outcomes.shadow is
  'TRUE iff this outcome row was produced by grading a breaker-suppressed signal (token_signals.breaker_suppressed=true) against its original_signal. Shadow rows feed the breaker clear logic but are EXCLUDED from headline accuracy metrics so user-visible numbers reflect only live emissions.';

-- Composite index supports the watchdog's split-aggregation query
-- (live-only headline, union for breaker).
create index if not exists idx_signal_outcomes_shadow_time
  on public.signal_outcomes (shadow, signal_time);


-- 3. signal_circuit_breaker: optional post-clear confidence cap window.
-- When the watchdog clears a breaker (live or via time-valve), it can set
-- this to (now + 6h). compute-signals reads it and halves the confidence
-- of any directional emission until the cap expires. Prevents a single
-- spike of confident-but-untrusted output right after a breaker reopens.
alter table public.signal_circuit_breaker
  add column if not exists confidence_cap_until timestamptz;

comment on column public.signal_circuit_breaker.confidence_cap_until is
  'When non-null and in the future, compute-signals caps emitted confidence at 50 for this direction. Set by accuracy-watchdog on clear/time-valve transitions. NULL means no cap.';
