-- =====================================================
-- 20260611_orca_traces_agentic_plan_stage.sql
-- §6.9 of ORCA_NANSEN_LEVEL_COPILOT_PROMPT.md.
--
-- The agentic tool-calling loop (ORCA_AGENTIC_TOOLS) writes one trace row per
-- planning hop with stage='agentic_plan'. The orca_traces.stage CHECK
-- constraint (last set in 20260603_user_alerts_and_notifications.sql) does not
-- include that value, so the per-turn trace batch insert would be rejected by
-- Postgres (a single CHECK violation fails the whole multi-row INSERT) — which
-- would silently empty the observability the loop's roll-out gate depends on.
--
-- This migration is purely additive: it only widens the allowed stage set. No
-- data back-fill is needed (no rows use the new value yet). Idempotent.
-- =====================================================

ALTER TABLE public.orca_traces DROP CONSTRAINT IF EXISTS orca_traces_stage_check;
ALTER TABLE public.orca_traces ADD CONSTRAINT orca_traces_stage_check
  CHECK (stage IN (
    'router', 'planner', 'agentic_plan', 'tool', 'writer', 'guardrails',
    'orchestrator', 'inline_tile', 'alerts'
  ));
