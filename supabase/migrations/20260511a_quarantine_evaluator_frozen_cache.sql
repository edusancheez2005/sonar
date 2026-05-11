-- 2026-05-11: Quarantine signal_outcomes rows where the EVALUATOR's
-- price-read was served from Next.js fetch-cache (BTC $76,876 frozen
-- from May 6 for 4+ days). Same root cause as the May 6 fetch-prices
-- bug, but in app/api/cron/evaluate-signals/route.js — its fetch()
-- calls also lacked { cache: 'no-store' }.
--
-- Symptom: btc_price_at_eval clusters at $76,876 (~47% of post-fix
-- rows since 2026-05-07). The remaining rows had live BTC at eval but
-- were compared against the same poisoned cohort statistically.
--
-- These rows showed a phantom SELL edge (+9.4% per trade at 1h) and
-- a phantom BUY anti-edge (-14% per trade at 6h/24h). Once filtered
-- out, the truth flips: BUY shows +2.6% / +4.4% net at 6h / 24h with
-- 85-86% win rates; SELL is breakeven-to-losing.
--
-- We quarantine instead of delete to preserve the audit trail for
-- the post-mortem.

UPDATE signal_outcomes
SET suspect = TRUE,
    suspect_reason = 'evaluator_fetch_cache_frozen_2026_05_07_to_05_11'
WHERE signal_time >= '2026-05-07T14:00:00Z'
  AND signal_time <  '2026-05-11T18:00:00Z'
  AND btc_price_at_eval >= 76800
  AND btc_price_at_eval <= 76900
  AND suspect = FALSE;

-- The BUY circuit breaker auto-tripped on 2026-05-08 18:00 with
-- acc=21.5% n=79. That window included a heavy share of frozen-eval
-- rows that systematically misclassified BUYs as wrong. Clear it so
-- compute-signals starts emitting BUYs again; the watchdog will
-- re-trip on real data if the BUY composite is genuinely broken.
UPDATE signal_circuit_breaker
SET active = FALSE,
    acc_pct = NULL,
    sample_size = NULL,
    reason = 'manual_clear_2026_05_11: 2026-05-08 trip used evaluator-frozen-cache rows; clean data shows BUY 6h win=85% / 24h win=86% +4.42% net. Re-enabling.',
    cleared_at = now(),
    updated_at = now()
WHERE signal_type = 'BUY' AND active = TRUE;
