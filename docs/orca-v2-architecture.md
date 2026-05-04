# ORCA v2 — Multi-Agent Architecture

**Status:** Phase 0 + Phase 1 (3 agents + synthesiser) shipped behind new endpoint.
**Endpoint:** `POST /api/orca/v2`
**Old endpoint untouched:** `POST /api/chat` still works identically.

## Pipeline

```
extractTicker → checkRateLimit → buildOrcaContext (single fan-out) →
  Promise.allSettled([NewsAgent, QuantAgent, WhaleAgent]) →
  Synthesiser (streamed) → orca_runs telemetry insert
```

Per-agent timeout 8s (`AbortSignal.timeout`). Schema validation via `zod`.
The synthesiser is the only caller of `grok-4-fast-reasoning` and the only
agent that streams. The other agents use `grok-4-fast-non-reasoning` (news)
or `grok-3-mini` (quant, whale).

## Files

- `lib/orca/agents/types.ts` — Zod schemas (`NewsBriefSchema`, `QuantBriefSchema`, `WhaleBriefSchema`) + `AgentRun<T>` + SSE event types.
- `lib/orca/agents/registry.ts` — `runAgent` wrapper: timeout, 1× retry on transient failures, JSON cleaning, schema validation, structured log line per run. Never throws.
- `lib/orca/agents/news-agent.ts`, `quant-agent.ts`, `whale-agent.ts` — sub-agents.
- `lib/orca/agents/synth-agent.ts` — streaming synthesiser. Imports `ORCA_SYSTEM_PROMPT` verbatim.
- `lib/orca/agents/orchestrator.ts` — `runOrcaPipeline`.
- `lib/orca/agents/ai-client.ts` — local `getAgentClient()` (Grok primary, OpenAI fallback).
- `lib/orca/system-prompt.ts` — extracted single source of truth for `ORCA_SYSTEM_PROMPT`. Both `/api/chat` (v1) and `/api/orca/v2` (v2 synthesiser) import this same string.
- `app/api/orca/v2/route.ts` — endpoint. SSE: `status`, `token`, `done`, `error`.
- `supabase/migrations/20260504_orca_runs.sql` — telemetry table.
- `scripts/test-orca-v2.mjs` — SSE smoke tester (`--prod` flag for production).

## Apply telemetry migration

Manual step (Supabase migrations are not auto-applied here):

```sh
psql "$SUPABASE_DB_URL" -f supabase/migrations/20260504_orca_runs.sql
```

…or paste the SQL into the Supabase SQL editor. Until applied, the v2 endpoint
still works — telemetry insert fails silently and is logged as a warning.

## Future toggle

`ORCA_V2_ENABLED` env var is reserved for the eventual UI cut-over. The v2
endpoint is currently always on (no behaviour gating); only the UI default
should be flipped via this flag.

## Known limitations

- No auth on `/api/orca/v2` — required for curl-based verification per the build prompt. Add Supabase Bearer auth (mirror `/api/chat`) before wiring the UI.
- No intent classifier yet — every query runs all three agents. Phase 3 in [ORCA_MULTI_AGENT_PLAN.md](../ORCA_MULTI_AGENT_PLAN.md) §2.5.
- No caching layer — Phase 2 (per ORCA_MULTI_AGENT_PLAN.md §2.6) needs a Redis or `orca_agent_cache` table for per-brief TTLs.
- `SocialAgent`, `MacroAgent`, `OnChainAgent` not yet implemented.
