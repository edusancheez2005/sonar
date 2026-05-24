-- =====================================================
-- 20260526_orca_traces.sql
-- Step 4.C: persist orchestrator stage traces for auditability.
-- Each row captures one stage of one assistant turn (router, planner,
-- a tool call, the writer, or guardrails).
--
-- Privacy:
--   * payload jsonb may NEVER contain user_profile values in cleartext.
--     Store the userId only and join at read time.
--   * RLS limits every read to the trace's own user; admin role bypass
--     belongs in a separate policy added by ops, not here.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.orca_traces (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_id TEXT NOT NULL,
  stage TEXT NOT NULL CHECK (stage IN (
    'router', 'planner', 'tool', 'writer', 'guardrails', 'orchestrator'
  )),
  payload JSONB NOT NULL,
  latency_ms INT,
  model TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orca_traces_user_created
  ON public.orca_traces(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orca_traces_message
  ON public.orca_traces(message_id);

ALTER TABLE public.orca_traces ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS orca_traces_select_own ON public.orca_traces;
CREATE POLICY orca_traces_select_own
  ON public.orca_traces FOR SELECT
  USING (auth.uid() = user_id);

-- Writes are performed by the server using the service role, which bypasses
-- RLS. We still install an explicit policy so that if a future code path
-- ever uses an authenticated client to insert, only self-insert is allowed.
DROP POLICY IF EXISTS orca_traces_insert_own ON public.orca_traces;
CREATE POLICY orca_traces_insert_own
  ON public.orca_traces FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- No update / delete policy on purpose. Traces are immutable from the
-- end-user's perspective; GDPR deletion happens via the ON DELETE CASCADE
-- when the parent auth.users row is removed.
