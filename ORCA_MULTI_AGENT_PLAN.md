# ORCA Multi-Agent Architecture — Plan

**Status:** Proposal · **Author:** GitHub Copilot for @edusancheez2005 · **Date:** 2026-05-04

---

## Part 1 — Immediate fix: SOL / ETH (and the rest) news coverage

### Diagnosis (just run against prod)

```
news_items in last 7 days:
  BTC : 69 articles
  ETH :  0 articles
  SOL :  0 articles
  XRP :  0 articles
  DOGE:  0 articles
  LINK:  0 articles
```

Only `BTC` got per-ticker news. Why:

1. The new ingestion code (commit `3027529`, deployed today) hasn't completed a full cron cycle yet — schedule was just changed from `0 */2 * * *` to `0 */4 * * *`.
2. Old runs hit LunarCrush daily 429 quota on the very first ticker after burning the budget on 150 tickers.
3. The category-level pull (which we just added) is `ticker = NULL` so it doesn't show up in per-ticker counts but DOES feed the News Terminal main feed.

### What will happen automatically

The next cron run (top of next 4-hour boundary) will:
1. Pull 5 categories (`cryptocurrencies`, `defi`, `nfts`, `memecoins`, `layer-2`) — these contain mostly ETH/SOL/general crypto news.
2. Then loop through 30 tickers in priority order: `BTC, ETH, SOL, XRP, BNB, DOGE, ADA, …`. ETH is #2, SOL is #3.

That should land 100+ ETH and 100+ SOL articles within hours. If not, the issue is quota.

### Tactical actions to do NOW (cheap, mechanical)

1. **Trigger the cron manually once** so we don't wait 4 hours:
   ```
   POST https://www.sonartracker.io/api/cron/ingest-news
   Authorization: Bearer ${CRON_SECRET}
   ```

2. **Confirm `news_items` per-ticker count fills in**. If ETH/SOL still 0 after a full run, the ticker name in LunarCrush's `topic` endpoint may differ (e.g. `solana` vs `sol`). Add a topic-name override map.

3. **Promote category news in News Terminal**. `app/news/page.jsx` already pulls from `news_items` first — but it's currently filtered to rows that resolve to a ticker via `extractTokens()`. Category rows have `ticker = NULL`; relax the filter so they show up.

4. **Soft-cap the ticker loop with a quota budget**. Add `if (totalLcCalls >= 200) break;` so we never hit a hard 429 mid-run.

These four take ~30 minutes and give you the news coverage you want today.

---

## Part 2 — Multi-Agent ORCA: the full plan

You asked: "*can we dispatch a few agents with specific tasks, where one queries news very well, another is a quant that does deep graph analysis, and the other one does like wallet tracking, and then they all come together to make the output for ORCA?*"

**Yes. This is exactly the right design for what ORCA wants to be.** Below is the proposed architecture, contracts, infra, cost model, and rollout plan.

---

### 2.1 Why the current architecture is hitting a ceiling

`app/api/chat/route.ts` today:
- Builds a giant context block (`buildOrcaContext`) by calling 8 data sources sequentially-ish.
- Stuffs it ALL into one `grok-4-fast-reasoning` call.
- Hopes the model picks the right details from a 60–80 KB prompt.

Problems:
| Symptom | Root cause |
|---|---|
| Whale section sometimes empty when data exists | model loses the section under prompt weight |
| News section repeats what's in the whale section | no specialised summariser per domain |
| Sentiment number contradicts the news headlines | one pass, no cross-checking |
| Slow first paint | every source must finish before model sees anything |
| Expensive | one huge model call per question instead of cheap specialists |

A multi-agent system fixes all five.

---

### 2.2 Proposed agent topology

```
                         ┌────────────────────────────────┐
                         │         ORCA Orchestrator      │
                         │   (app/api/orca/v2/route.ts)   │
                         │  - parses ticker / intent      │
                         │  - dispatches sub-agents in    │
                         │    parallel                    │
                         │  - streams progress over SSE   │
                         │  - calls Synthesiser at end    │
                         └────┬───────────┬───────┬───────┘
                              │           │       │
        ┌─────────────┬───────┴────┬──────┴────┬──┴───────────┬──────────────┐
        ▼             ▼            ▼           ▼              ▼              ▼
 ┌────────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐ ┌────────────┐
 │ NewsAgent  │ │ Quant    │ │ Whale    │ │ Social   │ │ Macro      │ │ OnChain    │
 │            │ │ Agent    │ │ Agent    │ │ Agent    │ │ Agent      │ │ Agent      │
 │ LunarCrush │ │ price/TA │ │ whale_   │ │ social_  │ │ Fed/ETF/   │ │ Etherscan/ │
 │ + Crypto-  │ │ deriva-  │ │ alerts + │ │ posts +  │ │ regulation │ │ Helius/    │
 │ Panic +    │ │ tives +  │ │ ERC20    │ │ KOL      │ │ via xAI    │ │ Solscan    │
 │ web_search │ │ Galaxy   │ │ flows    │ │ tweets   │ │ web_search │ │ flow graph │
 └─────┬──────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └─────┬──────┘ └─────┬──────┘
       │             │            │            │             │              │
       └─────────────┴────────────┴────────────┴─────────────┴──────────────┘
                                  │
                                  ▼
                        ┌───────────────────────┐
                        │   Synthesiser Agent   │
                        │  takes 6 structured   │
                        │  JSON inputs and      │
                        │  writes the final     │
                        │  ORCA narrative       │
                        │  (streams to client)  │
                        └───────────────────────┘
```

Each sub-agent is a **single-purpose, well-prompted LLM call** that:
- gets only the data it needs as input,
- outputs a tight JSON schema (≤ 800 tokens),
- uses the cheapest model that can do its job,
- runs in parallel with the others.

---

### 2.3 Agent contracts

Every agent implements the same interface:

```ts
interface OrcaAgent<I, O> {
  name: string                       // e.g. 'news', 'quant'
  inputSchema: z.ZodType<I>          // validated before call
  outputSchema: z.ZodType<O>         // validated after call
  model: ModelChoice                 // 'grok-4-fast-non-reasoning' | 'grok-3-mini' | …
  estimatedTokens: number            // for cost / budget gating
  estimatedLatencyMs: number
  run(input: I, deps: AgentDeps): Promise<O>
}
```

Per-agent JSON output schemas (sketch):

#### `NewsAgent` → `NewsBrief`
```json
{
  "headlines": [{"title":"…","url":"…","source":"…","published_at":"…","sentiment":"bullish|neutral|bearish"}],
  "narrative": "2–3 sentence what's-happening summary",
  "topical_themes": ["ETF inflows", "regulatory clarity"],
  "balance_check": {"bullish": 7, "neutral": 5, "bearish": 3}
}
```

#### `QuantAgent` → `QuantBrief`
```json
{
  "price": {"usd": 78950, "change_24h_pct": 2.1, "change_7d_pct": 5.4},
  "structure": {"trend": "up|down|range", "volatility_regime": "low|elevated|high"},
  "derivatives": {"funding_8h_pct": 0.012, "oi_change_24h_pct": 4.5},
  "tech_signals": ["above 200d SMA", "RSI 62"],
  "anomalies": ["volume +180% vs 30d avg"]
}
```

#### `WhaleAgent` → `WhaleBrief`
```json
{
  "net_flow_usd_24h": -12500000,
  "direction": "accumulation|distribution|mixed",
  "top_movements": [{"side":"in|out","entity":"Binance hot","amount_usd":4200000,"time":"…"}],
  "exchange_flow": {"in_usd":18000000,"out_usd":30500000},
  "confidence": "high|medium|low",
  "data_source": "whale_alerts|whale_transactions|both"
}
```

#### `SocialAgent` → `SocialBrief`
```json
{
  "lunarcrush": {"galaxy_score": 71, "alt_rank": 24, "social_dominance_pct": 4.1},
  "sentiment_pct_bullish": 64,
  "trending_creators": [{"handle":"@saylor","quote":"…","date":"…"}],
  "engagement_24h": 412000,
  "kol_consensus": "neutral|bullish|bearish"
}
```

#### `MacroAgent` → `MacroBrief`
Same shape as the existing `/api/social/macro` response (we already built it).

#### `OnChainAgent` → `OnChainBrief`
```json
{
  "active_addresses_24h": 1250000,
  "new_addresses_24h": 78000,
  "tx_count_24h": 480000,
  "fees_24h_usd": 12000000,
  "top_inflows": ["smart-money cluster A"],
  "developer_activity": {"commits_7d": 142, "active_devs": 38}
}
```

#### `Synthesiser` → final ORCA response (markdown, streamed)
Input: all six briefs + user question + ORCA's safety/legal system prompt (already in [app/api/chat/route.ts](app/api/chat/route.ts)).

Output: the human-readable answer the user sees, identical in tone/length to today's ORCA but with much higher factual density and zero hallucination because every claim must trace back to a brief.

---

### 2.4 Concrete implementation plan

#### Phase 0 — Foundation (no behavioural change yet)

1. Create `lib/orca/agents/` directory.
2. Add `lib/orca/agents/types.ts` with the `OrcaAgent`, `AgentDeps`, brief interfaces above.
3. Add `lib/orca/agents/registry.ts` — a registry that wraps each agent with:
   - timeout (default 8 s, configurable),
   - retry with exponential backoff (1 retry only),
   - JSON-schema validation of output (`zod.safeParse`),
   - structured logging `{agent, latency_ms, tokens_in, tokens_out, error}`,
   - per-request cost accumulator.
4. Add `lib/orca/agents/orchestrator.ts` — `runOrcaPipeline(ticker, question, userId, onProgress)` that:
   - selects which agents to run based on intent (see §2.5),
   - dispatches them with `Promise.allSettled`,
   - feeds successful briefs into the synthesiser,
   - yields SSE events `{agent, status, latency_ms}` for the UI.

Nothing about the user-facing endpoint changes in Phase 0; this is just scaffolding.

#### Phase 1 — Wrap existing data fetchers as agents

Each of the data-source functions in `lib/orca/context-builder.ts` already exists. Wrap them, don't replace them:

| Existing fetcher | Becomes |
|---|---|
| `fetchPrice`, `fetchDerivatives`, `fetchChartData` | input to `QuantAgent` |
| `fetchWhaleData`, `fetchWhaleAlerts` | input to `WhaleAgent` |
| `fetchSocial`, `fetchLunarCrushAI`, `fetchLunarCrushEnhanced` | input to `SocialAgent` |
| `fetchNews`, `fetchLunarCrushNews`, `fetchCryptoPanicNews` | input to `NewsAgent` |
| (new) | `MacroAgent` reuses `/api/social/macro` |
| (new) | `OnChainAgent` reuses Etherscan + LunarCrush dev/community blocks |

Each agent receives the **raw** data plus a tiny prompt and emits a JSON brief. This is where models specialise:

| Agent | Recommended model | Reasoning |
|---|---|---|
| News | `grok-4-fast-non-reasoning` | summarisation, no math |
| Quant | `grok-3-mini` | numeric reasoning is straightforward |
| Whale | `grok-3-mini` | aggregation + classification |
| Social | `grok-4-fast-non-reasoning` | text understanding |
| Macro | `grok-4-fast-reasoning` + `web_search` tool | needs live web |
| OnChain | `grok-3-mini` | numeric + classification |
| Synthesiser | `grok-4-fast-reasoning` | the only one that needs deep reasoning + voice |

Total cost per ORCA query (rough): 6 × cheap calls (~1k tokens each) + 1 reasoning call (~3k tokens) ≈ **30–40 % of current cost**, because the giant single-prompt approach pays for the reasoning model to read 60 KB of mostly irrelevant context every time.

#### Phase 2 — Migrate `/api/chat` to use orchestrator

Add a feature flag `ORCA_V2_ENABLED=true`. When set, `app/api/chat/route.ts` calls `runOrcaPipeline` instead of `buildOrcaContext` + single LLM call. Otherwise behaviour is unchanged. Roll out to ~10% of traffic, measure latency / completion rate / user satisfaction.

#### Phase 3 — Add intent-aware dispatch

User question: "What are whales doing with ETH?" → only run **WhaleAgent + QuantAgent + Synthesiser**. Skip news/macro/social. Cuts latency by ~40 %.

Implement a tiny intent classifier (one cheap LLM call) at the top of the orchestrator:

```ts
type Intent = 'overview' | 'whales' | 'news' | 'price' | 'sentiment' | 'macro'
const intent = await classifyIntent(message)  // ~150 tokens, ~200 ms
const agentsToRun = INTENT_AGENT_MAP[intent]
```

#### Phase 4 — Inter-agent communication (advanced)

Some questions need agents to talk to each other. Example: "Why did SOL drop today?"
1. `QuantAgent` says: dropped 6 % between 10:00 and 11:30 UTC.
2. Orchestrator forwards that window to `NewsAgent` and `WhaleAgent` with `time_window: ["10:00","11:30"]`.
3. `WhaleAgent` finds: 2 large outflows from Binance hot wallet at 10:14 UTC.
4. `NewsAgent` finds: Solana validator outage tweet at 10:09 UTC.
5. `Synthesiser` ties it together.

This is implemented as a 2-pass pipeline: pass 1 = breadth (all agents, basic context), pass 2 = depth (orchestrator picks 1–2 agents to re-run with refined input). Most queries don't need pass 2.

---

### 2.5 Intent → agent mapping

| User intent | Agents dispatched |
|---|---|
| Overview ("tell me about X") | News + Quant + Whale + Social + Synth |
| "What are whales doing" | Whale + Quant + Synth |
| "What's the news on X" | News + Macro + Synth |
| "Is X bullish" / "sentiment" | Social + News + Synth (no price target language!) |
| Macro-only ("Fed", "ETF flows") | Macro + Synth |
| Follow-up question | Synth only (uses cached briefs from prior turn) |

---

### 2.6 Caching & cost discipline

- Every brief is cached in Redis (or Supabase `orca_agent_cache` table) keyed by `(agent, ticker, hour_bucket)`.
- TTLs: News 5 min, Quant 2 min, Whale 1 min, Social 10 min, Macro 1 h, OnChain 15 min.
- Synthesiser is NEVER cached — it depends on user question and is the cheap part anyway.
- Add a `?fresh=1` bypass for debugging.

Estimated daily cost at 1,000 ORCA queries/day:
- 1k synthesiser calls × $0.005 = $5
- 1k news briefs × $0.002 = $2 (mostly cache hits, real number ~$0.50)
- 1k quant briefs × $0.001 = $1 (mostly cache hits, real ~$0.20)
- 1k whale briefs × $0.001 = $1
- 1k social briefs × $0.002 = $2
- 1k macro briefs × $0.01 (web_search) = $10 → **but** macro is shared globally, so actually ~24 calls/day = $0.24
- 1k on-chain × $0.001 = $1
- **Total: ~$10–15/day**, vs current "shove everything into reasoning model" which is ~$30–40/day at the same volume.

---

### 2.7 Observability

Add `lib/orca/telemetry.ts`. Every pipeline run writes one row to `orca_runs`:

```sql
create table orca_runs (
  id uuid primary key default gen_random_uuid(),
  ticker text,
  intent text,
  user_id text,
  agents jsonb,           -- [{name,latency_ms,tokens,error,from_cache}]
  total_latency_ms int,
  total_tokens_in int,
  total_tokens_out int,
  total_cost_usd numeric,
  synth_output_chars int,
  user_rating smallint,   -- filled later via 👍/👎 button
  created_at timestamptz default now()
);
```

This unlocks:
- "which agent is slow" dashboards,
- "which agent's brief got the user a 👎" → refine that prompt,
- A/B testing model choices per agent.

---

### 2.8 Risks & mitigations

| Risk | Mitigation |
|---|---|
| One slow agent blocks the whole pipeline | Hard 8 s timeout per agent + `Promise.allSettled` (synth runs with partial briefs) |
| Synthesiser hallucinates from missing brief | Synthesiser prompt: "If a brief is missing, say so. Never invent." |
| 6× more API calls = 6× more failure surface | Each agent has 1 retry + cached fallback; circuit breaker on repeated 429s |
| Harder to debug than one big prompt | Telemetry table + per-agent SSE events surface every step |
| Schema drift breaks synth | `zod` validation rejects bad briefs before they reach synth |
| Regression vs current ORCA | Feature flag + side-by-side eval on 50 fixed questions before flip |

---

### 2.9 Migration timeline (suggested)

| Week | Deliverable |
|---|---|
| 1 | Phase 0 scaffolding (types, registry, orchestrator stub, telemetry table) |
| 2 | Phase 1: NewsAgent + QuantAgent + Synthesiser working end-to-end behind feature flag for `BTC` only |
| 3 | Phase 1 cont.: WhaleAgent + SocialAgent + MacroAgent + OnChainAgent, all tickers |
| 4 | Phase 2: feature-flag rollout to 10 % → 50 % → 100 %. Tear down old single-prompt path |
| 5 | Phase 3: intent classifier + per-intent dispatch |
| 6+ | Phase 4: 2-pass pipeline for "why did X happen" questions |

---

### 2.10 What I'd do FIRST if you say go

Smallest possible end-to-end slice that proves the architecture works:

1. `lib/orca/agents/news-agent.ts` — wraps existing `fetchNews` + `fetchLunarCrushNews`, prompts `grok-4-fast-non-reasoning` for a `NewsBrief`, returns validated JSON.
2. `lib/orca/agents/quant-agent.ts` — wraps `fetchPrice` + `fetchDerivatives`, prompts `grok-3-mini` for a `QuantBrief`.
3. `lib/orca/agents/synth-agent.ts` — takes the two briefs + user question, streams the final ORCA answer with the existing safety/legal prompt.
4. New endpoint `app/api/orca/v2/route.ts` (no flag, just a new URL) that runs only those three.
5. Add a "Try v2 (beta)" toggle in the ORCA UI for ~10 lines of JSX.

That's ~400 lines of new code, all behind a new URL, zero risk to existing ORCA. If it feels right, expand.

---

## Summary

- **Part 1**: SOL/ETH news will fill in on the next 4-hour cron. If you want it instantly, hit `/api/cron/ingest-news` with `Bearer $CRON_SECRET`. The architecture is already correct; we just changed it 30 min ago and haven't run a full cycle.
- **Part 2**: Multi-agent ORCA is absolutely the right move. Proposed 6 specialist agents + 1 synthesiser, all parallel, all cheaply specialised, with intent-aware dispatch and caching. Total estimated cost is ~50–70 % LOWER than today, latency is comparable to lower (after caching), and the output quality should jump substantially because each agent owns one domain instead of one model trying to be good at everything from inside a 60 KB prompt.

Tell me which slice to build first and I'll start writing code.
