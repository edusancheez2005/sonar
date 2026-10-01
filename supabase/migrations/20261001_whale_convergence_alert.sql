-- =============================================================================
-- Whale convergence alerts (2026-10-01)
-- =============================================================================
-- "Tell me when 3+ tracked whales buy the same token." New alert kind
-- `whale_convergence`: fires when at least N DISTINCT whale wallets bought the
-- same token in the trailing 24h. Row shape:
--   ticker        '_ALL_' (any token) or a specific symbol
--   kind          'whale_convergence'
--   threshold_pct the minimum number of distinct whales (2-20; default 3)
--                 — reused as the count column so no new column is needed
--   threshold_usd NULL
-- Run in the Supabase SQL editor (safe to re-run).
-- =============================================================================

ALTER TABLE IF EXISTS public.user_alerts DROP CONSTRAINT IF EXISTS user_alerts_kind_check;
ALTER TABLE IF EXISTS public.user_alerts ADD CONSTRAINT user_alerts_kind_check
  CHECK (kind IN (
    'price_move',
    'whale_flow',
    'signal_flip',
    'news_high_impact',
    'wallet_activity',
    'news_any',
    'social_post',
    'whale_convergence'
  ));

ALTER TABLE IF EXISTS public.user_alerts DROP CONSTRAINT IF EXISTS chk_threshold_shape;
ALTER TABLE IF EXISTS public.user_alerts ADD CONSTRAINT chk_threshold_shape CHECK (
  (kind = 'price_move'        AND threshold_pct IS NOT NULL AND threshold_usd IS NULL) OR
  (kind = 'whale_flow'        AND threshold_usd IS NOT NULL AND threshold_pct IS NULL) OR
  (kind = 'wallet_activity'   AND threshold_pct IS NULL) OR
  (kind = 'whale_convergence' AND threshold_pct IS NOT NULL AND threshold_usd IS NULL) OR
  (kind IN ('signal_flip', 'news_high_impact', 'news_any', 'social_post')
     AND threshold_pct IS NULL AND threshold_usd IS NULL)
);
