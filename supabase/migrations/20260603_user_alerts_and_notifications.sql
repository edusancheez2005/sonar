-- =============================================================================
-- ORCA Proactive Alerts — rule definitions + in-app inbox + email prefs
-- =============================================================================
-- Adds the tables backing the proactive-alerts stage
-- (ORCA_PROACTIVE_ALERTS_BUILD_PROMPT.md).
--
-- Tables created (per-user, RLS-protected via user_id = auth.uid()):
--   1. user_alerts          — alert rule definitions
--   2. user_notifications   — in-app inbox rows (written only by the cron)
--
-- Columns added to existing user_profile for notification preferences.
--
-- Compliance notes:
--   - All FKs reference auth.users(id) ON DELETE CASCADE so account deletion
--     cascades to every alerts surface (GDPR right-to-erasure).
--   - Email opt-in (notifications_email) defaults to FALSE. Existing users
--     have to flip the switch.
--   - user_notifications has NO client insert/update-arbitrary policy — only
--     the service-role cron writes rows. Clients may flip read_at on their
--     own rows (mark-as-read) via the update policy below.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. user_alerts — rule definitions
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_alerts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticker        text NOT NULL CHECK (ticker ~ '^[A-Z0-9._-]{1,12}$'),
  kind          text NOT NULL CHECK (kind IN (
                  'price_move',         -- |price_change_24h| >= threshold_pct
                  'whale_flow',         -- |whale_net_flow_24h_usd| >= threshold_usd
                  'signal_flip',        -- unified_direction changed from NEUTRAL -> BUY|SELL
                  'news_high_impact'    -- news article with |sentiment_score| >= 0.6 in last 1h
                )),
  threshold_pct numeric CHECK (threshold_pct IS NULL OR threshold_pct > 0),
  threshold_usd bigint  CHECK (threshold_usd IS NULL OR threshold_usd > 0),
  enabled       boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  -- Exactly one of price/whale thresholds must be set when applicable.
  CONSTRAINT chk_threshold_shape CHECK (
    (kind = 'price_move'        AND threshold_pct IS NOT NULL AND threshold_usd IS NULL) OR
    (kind = 'whale_flow'        AND threshold_usd IS NOT NULL AND threshold_pct IS NULL) OR
    (kind IN ('signal_flip','news_high_impact') AND threshold_pct IS NULL AND threshold_usd IS NULL)
  ),
  -- Dedup: at most one (user, ticker, kind) row.
  UNIQUE (user_id, ticker, kind)
);

CREATE INDEX IF NOT EXISTS idx_user_alerts_enabled
  ON public.user_alerts (ticker) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_user_alerts_user
  ON public.user_alerts (user_id, updated_at DESC);

ALTER TABLE public.user_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_alerts_select_own ON public.user_alerts;
CREATE POLICY user_alerts_select_own ON public.user_alerts
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS user_alerts_insert_own ON public.user_alerts;
CREATE POLICY user_alerts_insert_own ON public.user_alerts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS user_alerts_update_own ON public.user_alerts;
CREATE POLICY user_alerts_update_own ON public.user_alerts
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS user_alerts_delete_own ON public.user_alerts;
CREATE POLICY user_alerts_delete_own ON public.user_alerts
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger: bump updated_at on UPDATE (reuses Stage E function shape).
CREATE OR REPLACE FUNCTION public.user_alerts_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_alerts_updated_at ON public.user_alerts;
CREATE TRIGGER trg_user_alerts_updated_at
  BEFORE UPDATE ON public.user_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.user_alerts_set_updated_at();


-- -----------------------------------------------------------------------------
-- 2. user_notifications — inbox rows
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_notifications (
  id              bigserial PRIMARY KEY,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rule_id         uuid REFERENCES public.user_alerts(id) ON DELETE SET NULL,
  ticker          text NOT NULL,
  kind            text NOT NULL,           -- mirrors user_alerts.kind for filtering
  title           text NOT NULL,           -- "SOL -5.2% in last 24h"
  body            text NOT NULL,           -- "Net whale flow on SOL was -$2.1M, 3x the 7d baseline."
  payload         jsonb NOT NULL DEFAULT '{}'::jsonb,  -- raw numbers for re-render
  dedup_hour      timestamptz NOT NULL,    -- date_trunc('hour', now()) — used in UNIQUE below
  read_at         timestamptz,
  emailed_at      timestamptz,             -- set when included in a digest
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, rule_id, dedup_hour)    -- the 1-per-rule-per-hour cap
);

CREATE INDEX IF NOT EXISTS idx_user_notif_user_unread
  ON public.user_notifications (user_id, created_at DESC) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_user_notif_user_all
  ON public.user_notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_notif_email_pending
  ON public.user_notifications (user_id, created_at)
  WHERE emailed_at IS NULL;

ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_notif_select_own ON public.user_notifications;
CREATE POLICY user_notif_select_own ON public.user_notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Writes ONLY via service-role (the cron). No insert policy for clients.
-- Mark-as-read uses the update policy below (own rows only).
DROP POLICY IF EXISTS user_notif_update_own ON public.user_notifications;
CREATE POLICY user_notif_update_own ON public.user_notifications
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);


-- -----------------------------------------------------------------------------
-- 3. user_profile — notification preference columns
-- -----------------------------------------------------------------------------
ALTER TABLE public.user_profile
  ADD COLUMN IF NOT EXISTS notifications_in_app   boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notifications_email    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notifications_quiet_hours_utc int4range,
    -- e.g. '[22,7)'::int4range = quiet 22:00-07:00 UTC; null = always on
  ADD COLUMN IF NOT EXISTS notifications_last_email_at timestamptz;

COMMENT ON COLUMN public.user_profile.notifications_email IS
  'Opt-in (default false). When true and the user has unread notifications since notifications_last_email_at, the hourly digest cron includes them in a Brevo email.';


-- -----------------------------------------------------------------------------
-- 4. orca_traces — allow system-level 'alerts' traces (HARD RULE §0.6/§13)
-- -----------------------------------------------------------------------------
-- The alerts crons log one telemetry row per run with stage='alerts'. They
-- run server-side with the service role and are NOT tied to a single user or
-- chat message, so user_id / message_id must be nullable and the stage CHECK
-- must accept 'alerts'. This also un-breaks the inline-tile telemetry path
-- (app/api/orca/telemetry/route.ts inserts stage='inline_tile', previously
-- silently rejected by the original CHECK constraint).
ALTER TABLE public.orca_traces ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.orca_traces ALTER COLUMN message_id DROP NOT NULL;
ALTER TABLE public.orca_traces DROP CONSTRAINT IF EXISTS orca_traces_stage_check;
ALTER TABLE public.orca_traces ADD CONSTRAINT orca_traces_stage_check
  CHECK (stage IN (
    'router', 'planner', 'tool', 'writer', 'guardrails', 'orchestrator',
    'inline_tile', 'alerts'
  ));
