-- =============================================================================
-- 20260603_orca_sessions.sql
-- =============================================================================
-- v4 of ORCA introduces a unified copilot that lives in three surfaces
-- (Drawer, Studio, Mini) backed by ONE conversation. Sessions and messages
-- give us a single source of truth so any surface can hydrate any thread.
--
-- See ORCA_UNIFIED_COPILOT_PROMPT_V4.md §3.1.
--
-- Privacy / safety:
--   * RLS pins every row to auth.uid(). Service-role writes from /api/chat
--     bypass RLS but the route still pins user_id from the verified JWT.
--   * No PII enters orca_messages.content beyond what the user typed; the
--     existing PII pre-filter in lib/orca/memory/extractor.ts continues to
--     guard the long-term memory layer.
--   * ON DELETE CASCADE on auth.users gives us GDPR right-to-erasure for
--     free.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.orca_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title         TEXT,
  surface_seed  TEXT CHECK (surface_seed IN ('drawer', 'studio', 'mini') OR surface_seed IS NULL),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived      BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_orca_sessions_user_updated
  ON public.orca_sessions (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_orca_sessions_active
  ON public.orca_sessions (user_id, updated_at DESC)
  WHERE archived = false;

ALTER TABLE public.orca_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS orca_sessions_select_own ON public.orca_sessions;
CREATE POLICY orca_sessions_select_own ON public.orca_sessions
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS orca_sessions_insert_own ON public.orca_sessions;
CREATE POLICY orca_sessions_insert_own ON public.orca_sessions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS orca_sessions_update_own ON public.orca_sessions;
CREATE POLICY orca_sessions_update_own ON public.orca_sessions
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS orca_sessions_delete_own ON public.orca_sessions;
CREATE POLICY orca_sessions_delete_own ON public.orca_sessions
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- orca_messages
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.orca_messages (
  id           BIGSERIAL PRIMARY KEY,
  session_id   UUID NOT NULL REFERENCES public.orca_sessions(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role         TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'tool', 'system')),
  content      TEXT NOT NULL,
  tool_calls   JSONB,
  sources      JSONB,
  follow_ups   JSONB,
  focus        JSONB,
  confirm      JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orca_messages_session
  ON public.orca_messages (session_id, id);

CREATE INDEX IF NOT EXISTS idx_orca_messages_user_created
  ON public.orca_messages (user_id, created_at DESC);

ALTER TABLE public.orca_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS orca_messages_select_own ON public.orca_messages;
CREATE POLICY orca_messages_select_own ON public.orca_messages
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS orca_messages_insert_own ON public.orca_messages;
CREATE POLICY orca_messages_insert_own ON public.orca_messages
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS orca_messages_delete_own ON public.orca_messages;
CREATE POLICY orca_messages_delete_own ON public.orca_messages
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- No UPDATE policy on messages: they are immutable once written.

-- -----------------------------------------------------------------------------
-- Bump orca_sessions.updated_at on every new message in the session.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.orca_sessions_bump_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.orca_sessions
    SET updated_at = now()
    WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_orca_messages_bump_session ON public.orca_messages;
CREATE TRIGGER trg_orca_messages_bump_session
  AFTER INSERT ON public.orca_messages
  FOR EACH ROW EXECUTE FUNCTION public.orca_sessions_bump_updated_at();

COMMENT ON TABLE public.orca_sessions IS
  'ORCA copilot conversation sessions. One row per chat thread, shared across Drawer/Studio/Mini surfaces. See ORCA_UNIFIED_COPILOT_PROMPT_V4.md.';
COMMENT ON TABLE public.orca_messages IS
  'Append-only ORCA copilot messages. Tool calls, sources, follow-ups stored as JSONB for cheap surface rendering.';
