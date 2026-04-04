-- Signal Outcomes: tracks whether each signal prediction was correct
-- Populated by /api/cron/evaluate-signals (runs hourly)
-- Read by /api/signals/accuracy

CREATE TABLE IF NOT EXISTS signal_outcomes (
  id BIGSERIAL PRIMARY KEY,
  signal_id BIGINT REFERENCES token_signals(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  signal_type TEXT NOT NULL,           -- STRONG_BUY, BUY, SELL, STRONG_SELL
  signal_score NUMERIC,
  signal_confidence NUMERIC,
  price_at_signal NUMERIC NOT NULL,
  price_at_eval NUMERIC NOT NULL,
  price_change_pct NUMERIC NOT NULL,   -- % change from signal to eval
  correct BOOLEAN,                     -- true = signal predicted direction correctly
  eval_window TEXT NOT NULL,           -- '1h', '6h', '24h'
  signal_time TIMESTAMPTZ NOT NULL,
  eval_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Prevent duplicate evaluations
  UNIQUE(signal_id, eval_window)
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_signal_outcomes_token ON signal_outcomes(token);
CREATE INDEX IF NOT EXISTS idx_signal_outcomes_window ON signal_outcomes(eval_window);
CREATE INDEX IF NOT EXISTS idx_signal_outcomes_correct ON signal_outcomes(correct);
CREATE INDEX IF NOT EXISTS idx_signal_outcomes_signal_time ON signal_outcomes(signal_time DESC);
