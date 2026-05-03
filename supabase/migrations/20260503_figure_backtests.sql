-- figure_backtests
-- One row per curated_entities.slug. Populated nightly by
-- /api/cron/backtest-figures. Drives the new "performance" sort on
-- /figures and the "Top Performers This Week" widget on
-- /wallet-tracker. The actual replay is done by the same engine that
-- powers the on-page WalletBacktestPanel (lib/wallet-backtest/engine.ts)
-- so the public number on the directory matches what users see when
-- they click into a figure.
--
-- We pre-compute both windows so the homepage and the directory can
-- both render without round-tripping the engine on every request.

CREATE TABLE IF NOT EXISTS figure_backtests (
  slug TEXT PRIMARY KEY REFERENCES curated_entities(slug) ON DELETE CASCADE,
  chain TEXT NOT NULL,
  address TEXT NOT NULL,
  capital_usd NUMERIC NOT NULL,
  return_pct_7d NUMERIC,
  return_pct_90d NUMERIC,
  final_equity_usd_90d NUMERIC,
  trades_replayed INTEGER,
  computed_at TIMESTAMPTZ DEFAULT NOW(),
  error TEXT
);

CREATE INDEX IF NOT EXISTS idx_figure_backtests_return_90d
  ON figure_backtests(return_pct_90d DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_figure_backtests_return_7d
  ON figure_backtests(return_pct_7d DESC NULLS LAST);
