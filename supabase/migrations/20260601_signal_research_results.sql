-- =============================================================================
-- signal_research_results
-- =============================================================================
-- Output table for the §4.F signal research kit (docs/SIGNAL_RESEARCH_2026Q3.md
-- and scripts/backtest-signals.js). Each row is one (signal_family, window)
-- pair backtested against `signal_outcomes` with suspect=FALSE applied.
--
-- This table is RESEARCH-ONLY. It MUST NOT be read by the production
-- signal pipeline (app/api/cron/compute-signals/) without a human-in-the-loop
-- go/no-go decision per §4.F deliverable 5. The pipeline still emits from
-- `token_signals` only.
--
-- RLS: readable by service role only. End users do not see raw backtest
-- numbers — the personalised dashboard surfaces production signals only.

CREATE TABLE IF NOT EXISTS public.signal_research_results (
  id                    bigserial PRIMARY KEY,
  signal_name           text NOT NULL,
  window                text NOT NULL CHECK (window IN ('24h', '3d', '7d')),
  n_samples             integer NOT NULL CHECK (n_samples >= 0),
  win_rate              numeric CHECK (win_rate IS NULL OR (win_rate >= 0 AND win_rate <= 1)),
  avg_pct               numeric,
  sharpe_proxy          numeric,
  max_drawdown_proxy    numeric,
  -- Free-form bag of parameters used (thresholds, lookback windows, etc.)
  params                jsonb DEFAULT '{}'::jsonb,
  -- Optional summary string for the human reviewer
  notes                 text,
  -- Always TRUE if suspect=FALSE filter was applied to source data.
  clean_only            boolean NOT NULL DEFAULT true,
  tested_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_signal_research_results_name_window
  ON public.signal_research_results (signal_name, window, tested_at DESC);

CREATE INDEX IF NOT EXISTS idx_signal_research_results_tested_at
  ON public.signal_research_results (tested_at DESC);

ALTER TABLE public.signal_research_results ENABLE ROW LEVEL SECURITY;

-- No SELECT/INSERT policies for `anon` or `authenticated`. Service role
-- bypasses RLS, so the backtest script can read/write. Forcing the
-- absence-of-policy is intentional: end-user surfaces NEVER query this.

COMMENT ON TABLE public.signal_research_results IS
  'Backtest results from the §4.F signal research kit. Service-role read/write only. Do not surface in user-facing UI without a go/no-go decision per §4.F deliverable 5.';
