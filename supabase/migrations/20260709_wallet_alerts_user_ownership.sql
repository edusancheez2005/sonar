-- ============================================================================
-- Add per-user ownership to wallet_alerts.
--
-- The /api/alerts and /api/alerts/[id] routes previously ran with the service
-- role and NO auth or ownership check: anyone could GET every row (leaking all
-- users' telegram_chat_id), and PUT/DELETE any alert by id. wallet_alerts had
-- no owner column, so there was nothing to scope by.
--
-- This adds a nullable user_id owner. The routes now require a valid Supabase
-- JWT and scope every read/update/delete by user_id. Pre-existing rows have a
-- NULL user_id and become unowned (invisible to the per-user API) — acceptable,
-- since they were never attributable to a user in the first place.
-- ============================================================================

ALTER TABLE wallet_alerts
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS wallet_alerts_user_id_idx ON wallet_alerts (user_id);
