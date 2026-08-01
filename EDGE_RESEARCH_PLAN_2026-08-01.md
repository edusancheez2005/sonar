# Sonar Edge-Research Program — Master Plan & Phase Prompts

**Date:** 2026-08-01
**Author:** Claude (Fable 5), with Eduardo
**Goal:** Determine whether Sonar's data can support a genuine, realistic market edge — and fix the data-quality problems that make the question unanswerable today.
**How to use this doc:** Each phase below ends with a self-contained prompt in a fenced block. Paste one prompt into a fresh Claude Code session when you're ready for that phase. Do them in order — each phase depends on the previous one's output.

---

## Part A — Classifier audit findings (2026-08-01)

Repo audited: `whale-transaction-monitor` (cloned at `/Users/edu/Desktop/Sonar/whale-transaction-monitor`).
Live classification path: `utils/classification_final.py` (5,425 lines, `WhaleIntelligenceEngine`), called from `chains/*.py` and `enhanced_monitor.py` via `process_and_enrich_transaction` (EVM), `enhanced_solana_classification` (Solana), `classify_xrp_transaction` (XRP), and the UTXO classifier in `chains/bitcoin_alchemy.py`.

### Confirmed junk sources, ranked by damage

| # | Where | What happens | Why it's junk |
|---|---|---|---|
| 1 | `classification_final.py:4075-4107` `_smart_high_value_reclassification` | Any tx ≥$50K that didn't resolve to BUY/SELL is reclassified **MODERATE_BUY** ("High-value accumulation signal"), conf ~0.44-0.65. If any phase's evidence contains the string "CEX"/"exchange" it becomes MODERATE_SELL — direction ignored. | Every large wallet-to-wallet move, custody rotation, or unlabeled internal transfer becomes a "buy". This is almost certainly the #1 source of phantom whale buys. |
| 2 | `utils/supabase_writer.py:90-96` | `MODERATE_BUY`/`BUY_MODERATE` collapse to plain **BUY** at write time. | Downstream (sonar-1 signal engine, ORCA, content) cannot distinguish verified DEX swaps from #1's guesses except via `confidence`. |
| 3 | `classification_final.py:706-713` | `if from_cex_data: BUY elif to_cex_data: SELL` — when **both** sides are exchanges (cold↔hot shuffles, the largest txs on-chain), classified as BUY. | Exchange internal rebalances become mega "whale buys". Explains "hot-to-cold buy" oddities in the weekly data. |
| 4 | `chains/bitcoin_alchemy.py:430-440` | 2-output tx → non-change output = **BUY** (rule 6); round amount ≥5 BTC = **BUY** (rule 7). Only path to SELL is a deposit to one of 177 known addresses. | Virtually every ordinary BTC payment and every round cold-storage move counts as a buy. BTC stats are structurally buy-biased. |
| 5 | `classification_final.py:5371-5390` `enhanced_solana_classification` | Fallback: received tokens → **buy** (conf 3), sent → **sell**; exception handler does the same at conf 2. Also `value_usd = abs(amount_change) * 1000` — a fabricated USD value (token units × $1000). | Plain SPL transfers become buys/sells; fabricated USD feeds the size-based confidence boosts. |
| 6 | `classification_final.py:738-809` `_institutional_cex_classification` | Substring matching on labels: `'mm'` matches "community", `'liquidity'` matches "liquidity pool", `'trading'`/`'spot'` match many DeFi labels → address marked as CEX/market-maker at conf 0.75-0.80. | DEX pools and DAO treasuries misidentified as exchanges → false SELL/BUY flows. |
| 7 | `classification_final.py:4109-4250` `_apply_behavioral_heuristics` | Confidence boosted by gas price ("urgency"), time-of-day ("peak hours"), and USD size ("conviction") — up to +0.25. | None of these carry directional information; they push weak guesses over BUY/SELL thresholds. |
| 8 | `classification_final.py:364-397` | When Supabase is connected, a no-match returns early — the hardcoded CEX fallback list (`_check_hardcoded_cex_addresses`) is **dead code**. | CEX coverage silently reduced to whatever's in the Supabase `addresses` table. |
| 9 | `chains/xrp.py:118-127` | DestinationTag → SELL; round ≥$500K → OTC_TRANSFER, counted as BUY on the frontend. | Dest tags are used by many services, not just exchange deposits; round numbers ≠ OTC buys. |
| 10 | Semantics (all chains) | CEX withdrawal labeled "BUY", deposit labeled "SELL" at conf 0.80-0.95. | Industry convention as *flow proxy*, but stated as fact at high confidence. A withdrawal is custody movement, not a purchase. |

### What the pros do differently (Arkham / Nansen / Chainalysis)

- They spend their effort on **entity attribution**, not per-tx direction guessing: deposit-address clustering (per-user deposit addresses swept to hot wallets — the single most effective heuristic on both BTC and Ethereum), behavioral clustering, then **human/community verification** (Arkham: analyst team + Intel Marketplace with review; labels are "objective records of on-chain events", not inferred intent).
- ML is used for **leads, not facts** — flagged clusters go to analysts before becoming labels.
- Nobody reputable claims per-transfer "buy/sell" from transfer direction alone. Real buys/sells come from **decoded DEX swap events** (token-in/token-out is unambiguous); CEX deposits/withdrawals are reported as **inflow/outflow** (sentiment proxy), and plain transfers stay **transfers**.
- Our repo already has real swap decoding (`utils/real_time_classification.py`, Uniswap V2/V3, Curve, Balancer, 1inch, Jupiter) — the verified-swap path is the *good* part of the system and should be the only source of "BUY/SELL" at high confidence.

**North star for the fix:** three honest event classes — `VERIFIED_SWAP` (decoded DEX, real buy/sell), `CEX_FLOW` (inflow/outflow, sentiment proxy), `TRANSFER` (everything else) — plus deposit-address clustering to grow exchange coverage. Delete intent-guessing heuristics entirely.

---

## Part B — The four phases

### Phase 1 — Ground truth & data integrity
Fix the measurement layer before researching on top of it. Two workstreams: (a) verify what actually shipped from the June sonar-1 remediation and how many clean evaluated signals exist; (b) fix the classifier junk above in whale-transaction-monitor.

### Phase 2 — Research batch (repo + web)
Inventory every data asset we have; survey documented crypto anomalies (funding carry, cross-sectional reversal/momentum, event-driven); produce a ranked hypothesis list.

### Phase 3 — Deterministic backtest harness
Injectable clock, walk-forward evaluation, fees, per-token alpha-vs-BTC IC. The piece that was never built.

### Phase 4 — Hypothesis testing & paper trading
Run the top hypotheses out-of-sample; kill fast; paper-trade survivors before anything touches production.

---

## Phase 1 prompt

```
You are working on Sonar's edge-research program, Phase 1: Ground truth & data integrity.
Read /Users/edu/Desktop/Sonar/sonar-1/EDGE_RESEARCH_PLAN_2026-08-01.md first — especially
Part A (classifier audit findings with file:line references) — then execute:

WORKSTREAM A — sonar-1 pipeline state (repo: /Users/edu/Desktop/Sonar/sonar-1)
1. Verify which fixes from SIGNAL_REMEDIATION_2026-06-01_PROMPT.md actually shipped
   (git log + code inspection): EVAL-1 look-ahead fix, FETCH-2 silent-failure fix,
   system_health table, BTC-benchmark staleness guard.
2. Query production (keys in .env.local; see memory sonar-orca-audit-workflow.md for auth):
   how many signal_outcomes rows exist post-2026-06-01 with suspect=false and
   correct IS NOT NULL, per horizon and per side? Is fetch-prices currently healthy?
3. Deliverable: DATA_TRUST_REPORT.md — what data is trustworthy from which date,
   sample sizes per token/horizon, and any still-broken measurement paths.

WORKSTREAM B — classifier fixes (repo: /Users/edu/Desktop/Sonar/whale-transaction-monitor)
Fix the ranked junk sources from Part A of the plan doc. Principles:
- Only decoded DEX swaps (utils/real_time_classification.py) may emit BUY/SELL at high confidence.
- CEX interactions become flow labels (EXCHANGE_INFLOW / EXCHANGE_OUTFLOW) — keep writing
  BUY/SELL to Supabase for backward compat if the frontend needs it, but add an
  event_class column: VERIFIED_SWAP | CEX_FLOW | TRANSFER.
- Delete: the $50K default-MODERATE_BUY reclassification, BTC change-output and
  round-amount BUY rules, XRP round-amount OTC_TRANSFER, Solana amount-sign fallback,
  gas/timing/size confidence boosts, the value_usd = amount_change*1000 fabrication.
- Fix: both-sides-CEX → INTERNAL_EXCHANGE_TRANSFER; word-boundary matching (not substring)
  for exchange/market-maker vocabulary; restore the hardcoded-CEX fallback when
  Supabase has no match.
- Before/after validation: sample 500 recent all_whale_transactions rows, count the
  classification distribution shift, and eyeball 30 random reclassified rows.
Do NOT deploy without showing Eduardo the before/after distribution.

Constraints: no Node on this machine (deploy = push to origin/main for sonar-1;
whale-transaction-monitor deploys via Railway on push). Python is available.
Commit messages per repo convention. Report findings before pushing anything.
```

## Phase 2 prompt

```
You are working on Sonar's edge-research program, Phase 2: Research batch.
Prerequisite: Phase 1 complete — read DATA_TRUST_REPORT.md and
EDGE_RESEARCH_PLAN_2026-08-01.md in /Users/edu/Desktop/Sonar/sonar-1 first.

REPO RESEARCH (both repos + Supabase):
1. Data asset inventory: every feed we have, its history depth, granularity, and trust level
   — price_snapshots, all_whale_transactions (post-Phase-1 event_class), derivatives/funding
   (Tier 5 in signalEngine.ts), aggregate_sentiment, Arkham labels (~cache tables),
   BigQuery public chain data access, Binance API (spot + perps), CoinGecko Pro.
2. Post-mortem: re-read SIGNAL_AUDIT_REPORT.md, SIGNAL_PIPELINE_2026-05-13.md
   sections 15-16, PROMPT_SIGNAL_RESEARCH.md. List every hypothesis already tried,
   its result, and whether the negative result is still valid now that measurement is fixed.

WEB RESEARCH:
3. Survey documented, still-live crypto return anomalies as of 2026: funding-rate carry,
   cross-sectional reversal and momentum, basis trades, listing/unlock/ETF-flow event
   studies, on-chain flow predictive studies (academic + practitioner). For each: expected
   Sharpe/capacity at retail size, decay evidence, data requirements.
4. Competitive scan: what do Nansen Smart Money, Arkham, Glassnode actually validate
   about whale-flow predictiveness? Any published hit-rates?

DELIVERABLE: HYPOTHESIS_BACKLOG.md — ranked list. Each entry: hypothesis, data needed
(vs what we have), horizon, expected effect size, capacity, falsification test, and a
priority score. Include regime-gated whale flow (does CEX_FLOW predict returns only in
certain regimes?) and the section-16 list from SIGNAL_PIPELINE_2026-05-13.md.
No code changes in this phase. End with your top-3 recommendation and why.
```

## Phase 3 prompt

```
You are working on Sonar's edge-research program, Phase 3: Deterministic backtest harness.
Prerequisites: Phases 1-2 complete. Read EDGE_RESEARCH_PLAN_2026-08-01.md,
DATA_TRUST_REPORT.md, HYPOTHESIS_BACKLOG.md in /Users/edu/Desktop/Sonar/sonar-1.

Build a standalone backtest harness (Python, scripts/backtest/ in sonar-1) with:
1. Injectable clock — no Date.now()/time.time() in any scoring path; all features
   computed as-of T using only data timestamped < T (the DET-1 fix, as architecture).
2. Data layer reading from Supabase exports or local parquet snapshots (make a
   snapshot script; backtests must run offline and be byte-reproducible).
3. Walk-forward evaluation: train/fit windows strictly before test windows; no
   refitting inside a test window; configurable embargo gap.
4. Costs: 10 bps round-trip default, configurable; slippage scaled by token liquidity tier.
5. Metrics, per the two non-negotiable lessons in SIGNAL_AUDIT_REPORT.md section 0:
   per-token Spearman IC (never pooled), alpha-vs-BTC labels (never raw return),
   plus hit rate, net PnL per trade, max drawdown, and turnover.
6. A null-model gate: every strategy result must be compared against (a) random-signal
   permutation and (b) buy-and-hold BTC. Print nothing without the comparison.
7. Determinism test in CI style: run the same config twice, assert identical output hashes.

Validate the harness by reproducing a KNOWN result: the May 2026 measured performance
(SIGNAL_PIPELINE_2026-05-13.md section 12) from stored signal_outcomes — if the harness
can't roughly reproduce those numbers from raw data, find out why before proceeding.
Deliverable: working harness + HARNESS_VALIDATION.md.
```

## Phase 4 prompt

```
You are working on Sonar's edge-research program, Phase 4: Hypothesis testing & paper trading.
Prerequisites: Phases 1-3 complete. Read EDGE_RESEARCH_PLAN_2026-08-01.md,
HYPOTHESIS_BACKLOG.md, HARNESS_VALIDATION.md in /Users/edu/Desktop/Sonar/sonar-1.

1. Take the top 3-4 hypotheses from HYPOTHESIS_BACKLOG.md. For each: pre-register the
   test in a file BEFORE running it (hypothesis, exact metric, success threshold,
   sample split) — no peeking, no threshold-moving after results.
2. Run each through the Phase 3 harness with walk-forward splits. A hypothesis survives
   only if: positive net alpha-vs-BTC after costs in the out-of-sample window, per-token
   IC consistent in sign across the majority of tokens, and it beats the permutation null
   at p < 0.05. Kill everything else and record the kill in the backlog.
3. For survivors: build a paper-trading runner (cron-compatible, no real orders) that
   logs intended trades + live prices to a paper_trades table. Minimum 3 weeks of
   paper results before any production discussion.
4. Deliverable: EDGE_VERDICT.md — for each hypothesis: survived/killed, the numbers,
   and an honest paragraph on capacity and decay risk. If nothing survives, say so
   plainly and recommend the best descriptive-signal use of the data for product/content
   (e.g., validated "whales were early on X% of moves" stats for ORCA and the emails).

Rules: never relax a pre-registered threshold; never report pooled IC; nothing goes
to production or real money from this phase.
```

---

## Standing constraints (all phases)

- No Node on this machine; Python 3 available. sonar-1 deploys by pushing to origin/main (Vercel); whale-transaction-monitor deploys via Railway.
- Keys live in `sonar-1/.env.local` (gitignored). Arkham API has two metered budgets — see memory `sonar-arkham-api.md` before spending label lookups.
- Confirm with Eduardo before: deploying classifier changes, any schema migration, anything user-visible.
- Every phase ends with a written deliverable committed to sonar-1 so the next session can pick up cold.
