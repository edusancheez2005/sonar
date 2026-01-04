-- =====================================================
-- PHASE 1: ORCA AI 2.0 - Database Foundation
-- =====================================================
-- Created: Jan 3, 2026
-- Purpose: Create 7 tables for news, sentiment, prices, quotas, chat, briefs, watchlists
-- =====================================================

-- =====================================================
-- TABLE 1: news_items
-- Purpose: Store news from LunarCrush (primary) and CryptoPanic (secondary)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.news_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL, -- 'lunarcrush' or 'cryptopanic'
  external_id TEXT, -- source's unique ID
  ticker TEXT NOT NULL, -- 'BTC', 'ETH', etc.
  title TEXT NOT NULL,
  url TEXT,
  published_at TIMESTAMPTZ NOT NULL,
  fetched_at TIMESTAMPTZ DEFAULT now(),
  content TEXT, -- full article content if available
  author TEXT,
  sentiment_raw FLOAT, -- provider's sentiment score (-1 to +1)
  sentiment_llm FLOAT, -- GPT-4o-mini analyzed sentiment (-1 to +1)
  votes_positive INT DEFAULT 0,
  votes_negative INT DEFAULT 0,
  metadata JSONB, -- extra provider-specific data
  CONSTRAINT news_items_source_external_id_key UNIQUE(source, external_id)
);

-- Indexes for news_items
CREATE INDEX IF NOT EXISTS idx_news_ticker ON public.news_items(ticker);
CREATE INDEX IF NOT EXISTS idx_news_published ON public.news_items(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_fetched ON public.news_items(fetched_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_sentiment_null ON public.news_items(sentiment_llm) WHERE sentiment_llm IS NULL;

-- RLS Policy: Public read access (no auth required for news)
ALTER TABLE public.news_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access for news" ON public.news_items FOR SELECT USING (true);

-- =====================================================
-- TABLE 2: sentiment_scores
-- Purpose: Aggregated sentiment by ticker (hourly snapshots)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.sentiment_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  provider_sentiment_avg FLOAT, -- avg from LunarCrush/CryptoPanic
  llm_sentiment_avg FLOAT, -- avg from GPT-4o-mini analysis
  aggregated_score FLOAT, -- weighted: 60% LLM + 40% provider
  news_count_24h INT DEFAULT 0,
  positive_count INT DEFAULT 0,
  negative_count INT DEFAULT 0,
  neutral_count INT DEFAULT 0,
  confidence FLOAT, -- based on sample size
  CONSTRAINT sentiment_scores_ticker_timestamp_key UNIQUE(ticker, timestamp)
);

-- Indexes for sentiment_scores
CREATE INDEX IF NOT EXISTS idx_sentiment_ticker ON public.sentiment_scores(ticker);
CREATE INDEX IF NOT EXISTS idx_sentiment_timestamp ON public.sentiment_scores(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_sentiment_ticker_time ON public.sentiment_scores(ticker, timestamp DESC);

-- RLS Policy: Public read access
ALTER TABLE public.sentiment_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access for sentiment" ON public.sentiment_scores FOR SELECT USING (true);

-- =====================================================
-- TABLE 3: price_snapshots
-- Purpose: CoinGecko price data (every 15 minutes)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.price_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  price_usd FLOAT NOT NULL,
  market_cap FLOAT,
  volume_24h FLOAT,
  price_change_1h FLOAT,
  price_change_24h FLOAT,
  price_change_7d FLOAT,
  CONSTRAINT price_snapshots_ticker_timestamp_key UNIQUE(ticker, timestamp)
);

-- Indexes for price_snapshots
CREATE INDEX IF NOT EXISTS idx_price_ticker ON public.price_snapshots(ticker);
CREATE INDEX IF NOT EXISTS idx_price_timestamp ON public.price_snapshots(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_price_ticker_time ON public.price_snapshots(ticker, timestamp DESC);

-- RLS Policy: Public read access
ALTER TABLE public.price_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access for prices" ON public.price_snapshots FOR SELECT USING (true);

-- =====================================================
-- TABLE 4: user_quotas
-- Purpose: Track daily question limits (5 for pro, 2 for free)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  questions_used INT DEFAULT 0,
  questions_limit INT DEFAULT 2, -- free tier
  briefs_sent INT DEFAULT 0,
  briefs_limit INT DEFAULT 0, -- 1 for pro, 0 for free
  plan TEXT DEFAULT 'free', -- 'free' or 'pro'
  reset_at TIMESTAMPTZ DEFAULT (CURRENT_DATE + INTERVAL '1 day'), -- 00:00 GMT
  CONSTRAINT user_quotas_user_date_key UNIQUE(user_id, date)
);

-- Indexes for user_quotas
CREATE INDEX IF NOT EXISTS idx_quota_user ON public.user_quotas(user_id);
CREATE INDEX IF NOT EXISTS idx_quota_date ON public.user_quotas(date DESC);

-- RLS Policies: Users can only read/write their own quotas
ALTER TABLE public.user_quotas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own quotas" ON public.user_quotas
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own quotas" ON public.user_quotas
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own quotas" ON public.user_quotas
  FOR UPDATE USING (auth.uid() = user_id);

-- =====================================================
-- TABLE 5: chat_history
-- Purpose: Store all user conversations with ORCA
-- =====================================================
CREATE TABLE IF NOT EXISTS public.chat_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ DEFAULT now(),
  user_message TEXT NOT NULL,
  orca_response TEXT NOT NULL,
  tokens_used INT,
  model TEXT DEFAULT 'gpt-4o',
  tickers_mentioned TEXT[], -- ['BTC', 'ETH']
  data_sources_used JSONB, -- {whale: true, news: true, sentiment: true}
  response_time_ms INT
);

-- Indexes for chat_history
CREATE INDEX IF NOT EXISTS idx_chat_user ON public.chat_history(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_timestamp ON public.chat_history(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_chat_user_time ON public.chat_history(user_id, timestamp DESC);

-- RLS Policy: Users can only read their own chat history
ALTER TABLE public.chat_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own chat" ON public.chat_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chat" ON public.chat_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- TABLE 6: daily_briefs
-- Purpose: Archive of generated daily briefs (email logs)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.daily_briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ DEFAULT now(),
  brief_date DATE NOT NULL,
  subject TEXT,
  html_content TEXT NOT NULL,
  top_movers JSONB, -- [{ticker, change_24h, reason}]
  whale_highlights JSONB,
  sentiment_snapshot JSONB,
  email_status TEXT DEFAULT 'sent', -- 'sent', 'failed', 'bounced'
  resend_message_id TEXT
);

-- Indexes for daily_briefs
CREATE INDEX IF NOT EXISTS idx_brief_user ON public.daily_briefs(user_id);
CREATE INDEX IF NOT EXISTS idx_brief_date ON public.daily_briefs(brief_date DESC);
CREATE INDEX IF NOT EXISTS idx_brief_user_date ON public.daily_briefs(user_id, brief_date DESC);

-- RLS Policy: Users can only read their own briefs
ALTER TABLE public.daily_briefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own briefs" ON public.daily_briefs
  FOR SELECT USING (auth.uid() = user_id);

-- =====================================================
-- TABLE 7: user_watchlists
-- Purpose: User-saved favorite tokens (10 free, 50 pro)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_watchlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  added_at TIMESTAMPTZ DEFAULT now(),
  notes TEXT,
  alert_enabled BOOLEAN DEFAULT false,
  alert_price_target FLOAT,
  CONSTRAINT user_watchlists_user_ticker_key UNIQUE(user_id, ticker)
);

-- Indexes for user_watchlists
CREATE INDEX IF NOT EXISTS idx_watchlist_user ON public.user_watchlists(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_ticker ON public.user_watchlists(ticker);

-- RLS Policy: Users can only manage their own watchlists
ALTER TABLE public.user_watchlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own watchlist" ON public.user_watchlists
  FOR ALL USING (auth.uid() = user_id);

-- =====================================================
-- SUMMARY
-- =====================================================
-- ✅ Created 7 tables:
--    1. news_items (news from LunarCrush + CryptoPanic)
--    2. sentiment_scores (aggregated sentiment analysis)
--    3. price_snapshots (CoinGecko price data)
--    4. user_quotas (rate limiting)
--    5. chat_history (conversation logs)
--    6. daily_briefs (email archive)
--    7. user_watchlists (saved tokens)
-- ✅ All tables have appropriate indexes
-- ✅ All tables have RLS policies enabled
-- ✅ Ready for Phase 1 cron jobs
-- =====================================================

