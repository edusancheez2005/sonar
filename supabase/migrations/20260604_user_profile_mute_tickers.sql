-- =============================================================================
-- Voice Writes — muteTicker / unmuteTicker storage (2026-06-04)
-- =============================================================================
-- Adds per-user temporary alert-mute state to user_profile. A single shared
-- expiry column (muted_tickers_until) governs the whole muted_tickers array;
-- the writer (runMuteTicker) stores the later-of the existing and new expiry,
-- and personalization.ts only surfaces muted tickers while the expiry is in
-- the future.
--
-- Idempotent: safe to re-run.
-- =============================================================================

ALTER TABLE public.user_profile
  ADD COLUMN IF NOT EXISTS muted_tickers text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS muted_tickers_until timestamptz;

COMMENT ON COLUMN public.user_profile.muted_tickers IS
  'Uppercase ticker symbols for which the user has temporarily muted ORCA alerts (voice-write muteTicker). Capped at 50 in application code.';

COMMENT ON COLUMN public.user_profile.muted_tickers_until IS
  'Shared expiry for muted_tickers. When NULL or in the past, no mutes are active. runMuteTicker stores the later-of the existing and newly-requested expiry.';
