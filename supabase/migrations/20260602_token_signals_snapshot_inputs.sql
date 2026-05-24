-- =============================================================================
-- token_signals.snapshot_inputs
-- =============================================================================
-- Forward-compatible column for §4.F signal research kit. Stores the
-- FamilyInput shape (see lib/signal-research/families.ts) at signal-emission
-- time so the backtest harness can replay candidate families against historic
-- signals without leakage.
--
-- This migration is the SCHEMA half of PR-1 in docs/SCHEMA_GAP_4F.md. The
-- writer half (populating the column from compute-signals/route.js) is a
-- separate focused commit. Until the writer lands, every new row carries
-- snapshot_inputs = NULL and the harness will skip it.
--
-- All existing rows remain NULL — no backfill is attempted because
-- reconstructing the engine's per-tick feature vector from raw tables
-- would risk look-ahead leakage (see SCHEMA_GAP_4F.md "Decision log").

ALTER TABLE public.token_signals
  ADD COLUMN IF NOT EXISTS snapshot_inputs JSONB;

COMMENT ON COLUMN public.token_signals.snapshot_inputs IS
  'FamilyInput shape captured at signal-emission time. Required by §4.F backtest harness. NULL on all rows pre-PR-1 (see docs/SCHEMA_GAP_4F.md).';
