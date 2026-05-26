-- ============================================================================
-- Stage B.1 watchlist unification (2026-05-26)
-- ============================================================================
-- Background
-- ----------
-- Two watchlist tables existed in parallel:
--   * public.user_watchlists  (created 2026-02-13, column `symbol`)
--       - written to by the token-page "+ Watchlist" button via /api/watchlist
--       - has production data
--       - has a service-role bypass RLS policy
--   * public.user_watchlist   (created 2026-05-25, column `ticker`)
--       - only ever read/written by the legacy orchestrator write tools
--       - effectively empty in production
--
-- The split meant items added on a token page never surfaced in the personal
-- dashboard Watchlist tab, because that tab read from the singular table.
--
-- This migration consolidates on `user_watchlists` (plural, `symbol`). The
-- app code (lib/personal/watchlist.ts, writeTools.ts, userData.ts) now reads
-- and writes the plural table exclusively.
--
-- Safety rules (per ORCA HARD RULES — additive only):
--   * We DO NOT drop public.user_watchlist. It is left in place as legacy.
--   * We defensively backfill any rows it happens to hold so no data is lost.
--   * The migration is idempotent: ON CONFLICT DO NOTHING.
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_watchlist'
  ) THEN
    INSERT INTO public.user_watchlists (user_id, symbol)
    SELECT user_id, UPPER(ticker)
    FROM public.user_watchlist
    WHERE user_id IS NOT NULL
      AND ticker IS NOT NULL
      AND length(trim(ticker)) BETWEEN 1 AND 12
    ON CONFLICT (user_id, symbol) DO NOTHING;
  END IF;
END $$;

COMMENT ON TABLE public.user_watchlists IS
  'Canonical user watchlist table (Stage B.1, 2026-05-26). Written to by '
  '/api/watchlist and the ORCA add/removeFromWatchlist write tools.';
