-- =====================================================
-- 20260602_user_wallets.sql
-- W2: user-tracked wallets. Powers the dashboard "Wallets" tab and
-- the agentic findTrackedWallets / getWalletActivity tools.
--
-- Privacy:
--   * Rows are owned by user_id. RLS pins SELECT / INSERT / DELETE
--     to auth.uid() = user_id. No UPDATE policy on purpose (a wallet
--     is delete + re-add to change chain/label; keeps audit simple).
--   * ON DELETE CASCADE on auth.users for GDPR right-to-erasure.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_wallets (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  address TEXT NOT NULL,
  chain TEXT NOT NULL CHECK (chain IN (
    'eth', 'btc', 'sol', 'base', 'arb', 'polygon', 'bsc', 'tron', 'xrp'
  )),
  label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, address, chain)
);

CREATE INDEX IF NOT EXISTS idx_user_wallets_user_created
  ON public.user_wallets(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_wallets_address_chain
  ON public.user_wallets(address, chain);

ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_wallets_select_own ON public.user_wallets;
CREATE POLICY user_wallets_select_own
  ON public.user_wallets FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS user_wallets_insert_own ON public.user_wallets;
CREATE POLICY user_wallets_insert_own
  ON public.user_wallets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS user_wallets_delete_own ON public.user_wallets;
CREATE POLICY user_wallets_delete_own
  ON public.user_wallets FOR DELETE
  USING (auth.uid() = user_id);
