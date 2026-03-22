-- Weekly Insights table — stores AI-generated weekly market analysis
-- Cron generates this every Friday, content is sent via Brevo email to all users
CREATE TABLE IF NOT EXISTS weekly_insights (
  id              BIGSERIAL PRIMARY KEY,
  week_start      DATE NOT NULL,           -- Monday of the analysis week
  week_end        DATE NOT NULL,           -- Friday of the analysis week
  subject         TEXT NOT NULL,            -- Email subject line
  summary         TEXT NOT NULL,            -- 2-3 sentence overview
  top_news        JSONB NOT NULL,          -- [{title, source, impact, sentiment}] top 5 stories
  whale_moves     JSONB NOT NULL,          -- [{token, direction, volume_usd, wallets}] biggest whale activity
  sentiment_shift JSONB NOT NULL,          -- {overall, btc, eth, sol, trend} week-over-week sentiment
  price_movers    JSONB NOT NULL,          -- [{token, change_pct, narrative}] top gainers/losers
  key_voices      JSONB,                   -- [{name, quote, sentiment}] notable quotes of the week
  html_body       TEXT NOT NULL,            -- Pre-rendered email HTML for Brevo
  emails_sent     INTEGER DEFAULT 0,       -- Count of emails dispatched
  generated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(week_start)
);

CREATE INDEX IF NOT EXISTS idx_weekly_insights_week ON weekly_insights(week_start DESC);
