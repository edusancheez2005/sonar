-- =============================================================================
-- ORCA Proactive Alerts — expand kinds: wallet activity, any news, social posts
-- =============================================================================
-- Builds on 20260603_user_alerts_and_notifications.sql. Adds three new alert
-- kinds and the columns they need:
--
--   wallet_activity  — watch a specific on-chain address for movement
--                      (source: all_whale_transactions). Uses `address`/`chain`
--                      instead of `ticker`. Optional threshold_usd = min tx size.
--   news_any         — any news article for a ticker in the last hour
--                      (source: news_items, no sentiment gate).
--   social_post      — any tweet/post mentioning a ticker in the last hour
--                      (source: social_posts.tickers_mentioned).
--
-- All statements are idempotent and use ALTER TABLE IF EXISTS so this file is
-- safe to run before or after the base migration has been applied.
-- =============================================================================

-- New target columns for address-based (wallet) alerts.
ALTER TABLE IF EXISTS public.user_alerts
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS chain   text;

-- Wallet alerts have no ticker, so ticker is no longer universally required.
ALTER TABLE IF EXISTS public.user_alerts ALTER COLUMN ticker DROP NOT NULL;

-- Expand the kind whitelist.
ALTER TABLE IF EXISTS public.user_alerts DROP CONSTRAINT IF EXISTS user_alerts_kind_check;
ALTER TABLE IF EXISTS public.user_alerts ADD CONSTRAINT user_alerts_kind_check
  CHECK (kind IN (
    'price_move',
    'whale_flow',
    'signal_flip',
    'news_high_impact',
    'wallet_activity',
    'news_any',
    'social_post'
  ));

-- Relax the threshold-shape rule for the new kinds.
--   price_move      : pct set, usd null
--   whale_flow      : usd set, pct null
--   wallet_activity : pct null (usd optional = min tx size)
--   the rest        : no threshold
ALTER TABLE IF EXISTS public.user_alerts DROP CONSTRAINT IF EXISTS chk_threshold_shape;
ALTER TABLE IF EXISTS public.user_alerts ADD CONSTRAINT chk_threshold_shape CHECK (
  (kind = 'price_move'      AND threshold_pct IS NOT NULL AND threshold_usd IS NULL) OR
  (kind = 'whale_flow'      AND threshold_usd IS NOT NULL AND threshold_pct IS NULL) OR
  (kind = 'wallet_activity' AND threshold_pct IS NULL) OR
  (kind IN ('signal_flip', 'news_high_impact', 'news_any', 'social_post')
                            AND threshold_pct IS NULL AND threshold_usd IS NULL)
);

-- Target-shape rule: wallet alerts need an address; everything else needs a
-- ticker. Prevents half-formed rows from either path (REST or chat).
ALTER TABLE IF EXISTS public.user_alerts DROP CONSTRAINT IF EXISTS chk_target_shape;
ALTER TABLE IF EXISTS public.user_alerts ADD CONSTRAINT chk_target_shape CHECK (
  (kind = 'wallet_activity' AND address IS NOT NULL) OR
  (kind <> 'wallet_activity' AND ticker IS NOT NULL)
);

-- Per-(user,address,kind) dedup for wallet alerts. The existing
-- UNIQUE (user_id, ticker, kind) keeps deduping the ticker-based kinds; with
-- ticker NULL on wallet rows that constraint no longer collides, so a partial
-- unique index covers the wallet case.
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_alerts_wallet
  ON public.user_alerts (user_id, address, kind) WHERE address IS NOT NULL;

-- Lookup index for the evaluation cron (enabled wallet rules by address).
CREATE INDEX IF NOT EXISTS idx_user_alerts_address
  ON public.user_alerts (address) WHERE enabled = true AND address IS NOT NULL;
