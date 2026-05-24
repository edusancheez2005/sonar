-- =============================================================================
-- ORCA Copilot — personalisation tables (build step §4.B)
-- =============================================================================
-- Adds the four per-user tables backing the personalised dashboard and the
-- ORCA copilot's long-term memory.
--
-- Tables created (all per-user, RLS-protected via user_id = auth.uid()):
--   1. user_profile      — one row per user; onboarding answers
--   2. user_holdings     — declared positions (bucketed USD; no exact dollars)
--   3. user_watchlist    — tickers the user is researching (no holdings)
--   4. orca_memory       — long-term per-user facts learned by the copilot
--
-- Compliance notes:
--   - All FKs reference auth.users(id) ON DELETE CASCADE so account deletion
--     cascades to every personalisation surface (GDPR right-to-erasure).
--   - Check constraints reject unknown enum values at the database boundary.
--   - user_holdings.approx_usd_value is bucketed (text enum), NOT a numeric
--     dollar amount. This is the locked privacy decision (§7.1 of
--     ORCA_COPILOT_BUILD_PROMPT.md). Storing exact wealth in plaintext is a
--     liability we do not want.
--   - orca_memory.expires_at is nullable; null = persistent (locked decision
--     §7.2). The index still includes it so future TTL sweeps are cheap.
--   - Existing tables `profiles` and `user_watchlists` (plural) are
--     intentionally separate. See build log for naming-collision rationale.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. user_profile
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_profile (
  user_id                    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  experience_level           text CHECK (experience_level IN ('new','intermediate','advanced')),
  primary_goal               text CHECK (primary_goal IN ('learn','track','research','trade')),
  risk_tolerance             text CHECK (risk_tolerance IN ('conservative','balanced','aggressive')),
  time_horizon               text CHECK (time_horizon IN ('intraday','swing','position','long_term')),
  preferred_chains           text[],
  notification_style         text CHECK (notification_style IN ('quiet','balanced','frequent')),
  jurisdiction_hint          text CHECK (jurisdiction_hint IN ('US','UK','EU','OTHER')),
  personalization_dismissed  boolean NOT NULL DEFAULT false,
  onboarded_at               timestamptz NOT NULL DEFAULT now(),
  updated_at                 timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_profile_select_own
  ON public.user_profile FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY user_profile_insert_own
  ON public.user_profile FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_profile_update_own
  ON public.user_profile FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_profile_delete_own
  ON public.user_profile FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger: bump updated_at on UPDATE
CREATE OR REPLACE FUNCTION public.user_profile_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_profile_updated_at ON public.user_profile;
CREATE TRIGGER trg_user_profile_updated_at
  BEFORE UPDATE ON public.user_profile
  FOR EACH ROW
  EXECUTE FUNCTION public.user_profile_set_updated_at();


-- -----------------------------------------------------------------------------
-- 2. user_holdings
-- -----------------------------------------------------------------------------
-- approx_usd_value is bucketed text, NOT numeric. Locked decision §7.1.
CREATE TABLE IF NOT EXISTS public.user_holdings (
  id                bigserial PRIMARY KEY,
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticker            text NOT NULL,
  approx_usd_value  text CHECK (approx_usd_value IN ('<1k','1k-10k','10k-100k','100k+')),
  entry_context     text,
  added_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_holdings_user_ticker
  ON public.user_holdings (user_id, ticker);

ALTER TABLE public.user_holdings ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_holdings_select_own
  ON public.user_holdings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY user_holdings_insert_own
  ON public.user_holdings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_holdings_update_own
  ON public.user_holdings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_holdings_delete_own
  ON public.user_holdings FOR DELETE
  USING (auth.uid() = user_id);


-- -----------------------------------------------------------------------------
-- 3. user_watchlist  (singular — distinct from the existing user_watchlists)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_watchlist (
  user_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticker    text NOT NULL,
  added_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, ticker)
);

CREATE INDEX IF NOT EXISTS idx_user_watchlist_user
  ON public.user_watchlist (user_id);

ALTER TABLE public.user_watchlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_watchlist_select_own
  ON public.user_watchlist FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY user_watchlist_insert_own
  ON public.user_watchlist FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_watchlist_update_own
  ON public.user_watchlist FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_watchlist_delete_own
  ON public.user_watchlist FOR DELETE
  USING (auth.uid() = user_id);


-- -----------------------------------------------------------------------------
-- 4. orca_memory
-- -----------------------------------------------------------------------------
-- expires_at is nullable; null = persistent (locked decision §7.2).
CREATE TABLE IF NOT EXISTS public.orca_memory (
  id                 bigserial PRIMARY KEY,
  user_id            uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fact               text NOT NULL,
  source_message_id  bigint,
  confidence         numeric CHECK (confidence BETWEEN 0 AND 1),
  created_at         timestamptz NOT NULL DEFAULT now(),
  expires_at         timestamptz
);

CREATE INDEX IF NOT EXISTS idx_orca_memory_user_expires
  ON public.orca_memory (user_id, expires_at);

ALTER TABLE public.orca_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY orca_memory_select_own
  ON public.orca_memory FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY orca_memory_insert_own
  ON public.orca_memory FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY orca_memory_update_own
  ON public.orca_memory FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY orca_memory_delete_own
  ON public.orca_memory FOR DELETE
  USING (auth.uid() = user_id);
