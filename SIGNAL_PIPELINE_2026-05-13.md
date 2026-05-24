# Sonar — End-to-End Signal Pipeline
**As of 2026-05-13. Honest, complete, math-included description of the current production signal pipeline. Written for downstream deep research with Claude Opus 4.7.**

---

## 0. TL;DR

Sonar's signal engine is a **hand-tuned linear weighted composite** of four (optionally five) feature tiers, computed every ~15 minutes for ~95 tokens, mapped to a 5-band label, and forward-evaluated at 1h / 6h / 24h horizons against the realized return and a BTC benchmark. It is not a machine learning model. It has no regime detection, no position sizing, no risk model, no exit logic. On clean data (post 2026-05-11 frozen-cache fix), it shows **no positive alpha at any horizon on either side**. The plumbing is correct; the alpha hypothesis is unproven.

---

## 1. Architecture overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          DATA INGESTION LAYER                            │
├──────────────────────────────────────────────────────────────────────────┤
│  cron: fetch-prices         */15 * * * *    Binance + CoinGecko          │
│    → price_snapshots        (~95 tokens)                                 │
│                                                                          │
│  cron: cache-derivatives    */5 * * * *     Binance Futures (fapi)       │
│    → derivatives_cache      (funding, OI, L/S, taker)                    │
│                                                                          │
│  cron: whale-alerts/sync    */10 * * * *    Whale tx feed                │
│    → all_whale_transactions (tier1 input)                                │
│                                                                          │
│  cron: ingest-news          0 */4 * * *     LunarCrush + CryptoPanic     │
│  cron: ingest-social        30 */2 * * *    LunarCrush social            │
│  cron: analyze-sentiment    15 */2 * * *    GPT-4o-mini sentiment        │
│  cron: aggregate-sentiment  0 * * * *       Per-ticker rollup            │
│    → news_items, sentiment_scores                                        │
└────────────────────────────┬─────────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                       SIGNAL COMPUTATION LAYER                           │
├──────────────────────────────────────────────────────────────────────────┤
│  cron: compute-signals      5,20,35,50 * * * *                           │
│                                                                          │
│   For each token in TICKER_MAP (~95):                                    │
│     1. Freshness gate (BTC price age < 30min, else 503)                  │
│     2. Compute 4 (or 5) tier scores                                      │
│     3. Apply per-token sign_multiplier from token_signal_calibration     │
│     4. Compute composite = tanh(weighted sum) → 0-100                    │
│     5. Apply BTC market beta dampening                                   │
│     6. Map to label via band thresholds                                  │
│     7. Apply circuit breaker suppression (if BUY/SELL breaker active)    │
│     8. Apply HIDE_BULLISH_SIGNALS env mask (currently TRUE)              │
│     9. Insert into token_signals                                         │
└────────────────────────────┬─────────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                       EVALUATION LAYER                                   │
├──────────────────────────────────────────────────────────────────────────┤
│  cron: evaluate-signals     30 * * * *                                   │
│                                                                          │
│   For each signal in last 1h, 6h, 24h windows where eval_time has passed:│
│     1. Fetch current price (Binance bulk ticker, cache:no-store)         │
│     2. price_change_pct = (price_at_eval - price_at_signal) / price_at_signal × 100 │
│     3. btc_change_pct  = same for BTC                                    │
│     4. alpha_pct       = price_change_pct - btc_change_pct (sign-flipped for SELL) │
│     5. Noise floor: if |price_change_pct| < 0.05% → correct = NULL       │
│     6. correct = (BUY: change > 0) | (SELL: change < 0)                  │
│     7. beat_benchmark = (BUY: token > BTC) | (SELL: token < BTC)         │
│     8. EVAL-4 frozen-feed guard: if currentPrice == price_at_signal AND  │
│        btcAtEval == btcAtSignal → SKIP (suspect_reason set)              │
│     9. Insert into signal_outcomes                                       │
└────────────────────────────┬─────────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                       FEEDBACK / SAFETY LAYER                            │
├──────────────────────────────────────────────────────────────────────────┤
│  cron: accuracy-watchdog    0 */6 * * *                                  │
│    Trip BUY/SELL circuit breaker if 6h acc < 35% on n>=25                │
│    Auto-clear at acc >= 45% (10pp hysteresis)                            │
│                                                                          │
│  cron: calibrate-signals    0 3 * * *                                    │
│    Per-token IC over 1h/6h/24h → token_signal_calibration                │
│    Sets sign_multiplier ∈ {-1, +1} to flip systematically wrong tokens   │
│                                                                          │
│  scripts/audit-pipeline-health.mjs (manual / on-demand)                  │
│    7 end-to-end sanity checks (see §10)                                  │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Token universe

- ~95 tokens, defined in `app/api/cron/fetch-prices/route.ts` `TICKER_MAP`
- Top ~90 by market cap + memecoins (PEPE, SHIB, BONK, WIF, FLOKI)
- Hard skiplist: `BINANCE_USDT_SKIPLIST = {'MATICUSDT'}` — frozen at $0.3794 since POL migration
- 35 tokens have CoinGecko fallback in `evaluate-signals/route.js` `CG_ID_FALLBACK`
- Excluded from derivatives tier (no Binance perpetuals): MKR, LRC, FXS, WBTC, WETH

---

## 3. Price feed layer

### Primary: Binance
- Endpoint: `https://data-api.binance.vision/api/v3/ticker/price` (all USDT pairs)
- Klines: `https://data-api.binance.vision/api/v3/klines?symbol={X}USDT&interval=1h&limit=N`
- No API key required (CDN-fronted public endpoint)
- **All fetch calls use `{ cache: 'no-store', next: { revalidate: 0 } }`** (see §11)

### Canary: Coinbase
- Endpoint: `https://api.exchange.coinbase.com/products/{TOKEN}-USD/ticker`
- Used for ≤1% drift cross-check on BTC, ETH, SOL during fetch-prices runs
- Logs `canary` block to `system_health.details` JSONB
- Tolerance: `CANARY_DRIFT_TOL = 0.01` (1%)

### Fallback: CoinGecko
- Endpoint: `https://pro-api.coingecko.com/api/v3/simple/price`
- Used when Binance USDT pair unavailable or thin
- Demo/expired key in Vercel prod is a known weak point

### Derivatives: Binance Futures
- Endpoint: `https://fapi.binance.com/fapi/v1/...`
- Funding (`/premiumIndex`), OI (`/openInterest`), L/S ratio (`/futures/data/globalLongShortAccountRatio`), top trader L/S (`/futures/data/topLongShortAccountRatio`), taker volume (`/futures/data/takerlongshortRatio`)
- All cached 5 min in `derivatives_cache`

### Freshness gate
In `compute-signals` v8 (2026-04-26): if `(now() - latestBtc.timestamp) / 60000 > 30`, return HTTP 503. Prevents poisoned signals when fetch-prices is dead.

---

## 4. Tier composition (the actual feature engineering)

### Tier 1 — CEX whale flow

**Source:** `all_whale_transactions` table, last 24h, filtered by token.

**Features per tx:**
- USD value
- `from_label`, `to_label` (parsed for CEX hot/cold wallet matching: Binance, Coinbase, Kraken, Bybit, OKX, KuCoin, Gate.io, HTX, Crypto.com, Bitfinex, Gemini, Bitstamp, MEXC)
- `reasoning` field (parsed for "deposit"/"withdrawal"/"transfer")
- Per-tx classifier `confidence` ∈ [0,1]
- Hard filter: `MIN_TX_CONFIDENCE = 0.5` (drops contested rows)

**Per-tx sign:**
- CEX deposit (whale → CEX): bearish, multiplied by `cexBoost = 1.5`
- CEX withdrawal (CEX → whale): bullish, multiplied by `cexBoost = 1.5`
- DEX swap: neutral lean, `dexBoost = 1.0`
- Other transfer: weakest, `otherBoost = 0.85`

**Aggregation:** Net signed USD flow over the window, then `tier1_raw = tanh(net_flow / scale)` → ∈ [−1, +1].

**Per-token override:** Multiplied by `sign_multiplier` from `token_signal_calibration` (set by `calibrate-signals` cron based on observed IC).

**Weight in composite:** 30% (with derivatives) / 40% (without).

**Known fragility:**
- Classifier upstream (separate `whale-transactions` repo) — if BUY/SELL labels are systematically backwards for a token, no amount of weight tuning fixes it.
- 2026-04-30 fix replaced a deprecated `is_cex_transaction` column path; current path parses `reasoning` + labels. Pre-fix, this tier was effectively zero.

---

### Tier 2 — Price momentum + volume

**Source:** `price_snapshots` rolling window + Binance klines.

**Features:**
- Price changes: 1h, 6h, 24h, 7d, 30d (in %)
- Volume: 24h, average 7d
- Volume / market cap ratio
- Taker buy pressure from klines (signed aggregator)
- RSI(14), SMA(20), Bollinger Bands

**Aggregation:** Weighted blend of momentum and volume confirmation, `tanh()`-damped to [−1, +1].

**Weight:** 30% (with derivatives) / 40% (without).

---

### Tier 3 — Sentiment + social

**Source:** `news_items` (last 24h sentiment_llm) + `sentiment_scores` (per-ticker hourly aggregate).

**Features:**
- Aggregate news sentiment (LunarCrush provider score blended with GPT-4o-mini per-article sentiment)
- LunarCrush Galaxy Score (overall social activity)
- LunarCrush Alt Rank (relative strength vs other alts)
- Mention volume

**Aggregation:** Linear scale 0-100 → mapped to [−1, +1].

**Weight:** 5% (capped — per-token IC is positive (~+0.14) but n is small (4-6 tokens), so weight intentionally kept low to avoid overfit).

---

### Tier 4 — On-chain activity + community

**Source:** Largely incomplete. Intended features:
- Active addresses (14d, 30d)
- Dev activity (GitHub commits, contributors)
- Community votes
- On-chain participations

**Aggregation:** Sparse; mostly fallback / zero in practice.

**Weight:** 5% (with derivatives) / 10% (without).

**Honest:** Tier 4 is mostly cosmetic right now.

---

### Tier 5 — Derivatives (optional)

**Availability:** Only when `derivativesData.ts` returns a valid block (token has Binance perpetuals).

**Features and sub-weights inside the tier:**

| Sub-feature | Weight | Sign convention |
|---|---:|---|
| Funding rate (8h) | 30% | High positive funding → bearish (overleveraged longs) |
| L/S ratio (all accounts) | 25% | High ratio (crowded long) → bearish (contrarian) |
| Top trader L/S | 20% | Smart-money divergence vs retail L/S |
| Taker buy/sell ratio | 25% | Direct aggression measure (bullish if buyers aggress) |

Composite tier output: `tanh(weighted sum) ∈ [−1, +1]`.

**Weight in full composite:** 25-30%.

**Code:** `app/lib/derivativesData.ts` (line ~179, `fetchWithTimeout` patched 2026-05-11 to add `cache:no-store`).

---

## 5. Composite score

```
weights_with_derivs   = { T1: 0.30, T2: 0.30, T3: 0.05, T4: 0.05, T5: 0.30 }
weights_no_derivs     = { T1: 0.40, T2: 0.40, T3: 0.05, T4: 0.10 }

raw_score   = Σ wi · tier_i_raw                    // each tier_i_raw ∈ [-1, +1]
composite   = ((tanh(raw_score) + 1) / 2) · 100    // ∈ [0, 100]
```

`composite = 50` is neutral. Greater than 50 → bullish, less than 50 → bearish.

### Market beta dampening
Applied at label-emission time:
- If BTC 24h change > +2%, dampen the SELL family (don't fight a tailwind).
- If BTC 24h change < −2%, dampen the BUY family (don't fight a headwind).

---

## 6. Score → label mapping (5 bands)

```
composite ≥ 72   →  STRONG BUY
composite ≥ 58   →  BUY
43 ≤ composite ≤ 57   →  NEUTRAL
composite ≤ 42   →  SELL
composite ≤ 28   →  STRONG SELL
```

**Known issue:** `tanh()` in the aggregation saturates each tier near ±1, so `raw_score` rarely reaches the magnitudes required to push `composite` past 72 or below 28. STRONG bands almost never fire. Thresholds were set arbitrarily, not empirically (no percentile fit to observed score distribution).

---

## 7. Suppression layers (between composite and emission)

Two gates can downgrade the published label after computation:

### 7.1 Circuit breaker
- `signal_circuit_breaker` table has one row per direction (BUY, SELL).
- If a row has `active = TRUE`, `compute-signals` downgrades that side's labels to NEUTRAL with a `traps[]` entry: `"auto_suppress: BUY acc 26.5% on n=34 over last 6h (< 35%)"`.
- Trip condition: 6h trailing accuracy < 35% on n ≥ 25.
- Auto-clear condition: 6h trailing accuracy ≥ 45% (10pp hysteresis).
- Manual override: REST `PATCH /rest/v1/signal_circuit_breaker?signal_type=eq.BUY` with `{active:false, reason:'manual_clear...'}`.

### 7.2 HIDE_BULLISH_SIGNALS env flag
- When `HIDE_BULLISH_SIGNALS=true`, all BUY/STRONG BUY emissions are flipped to NEUTRAL with `muted_reason: 'bullish_under_review'`.
- Currently set to `true` in production, pending post-2026-04-30 IC re-audit.
- Bypass for ops debugging: `GET /api/signals/accuracy?include_muted=true`.

---

## 8. Evaluation layer

`/api/cron/evaluate-signals` runs hourly at minute 30.

### Window targeting
Evaluates each unevaluated signal whose `signal_time + window` has passed for windows `1h`, `6h`, `24h`.

### Per-row computation
```javascript
price_change_pct = (price_at_eval - price_at_signal) / price_at_signal * 100
btc_change_pct   = (btc_at_eval - btc_at_signal)     / btc_at_signal     * 100

// Sign convention: positive alpha = trade was profitable
alpha_pct = (signal_type starts with 'BUY')
            ? price_change_pct - btc_change_pct
            : btc_change_pct - price_change_pct

// Correctness (directional, ignores magnitude)
correct = (signal_type starts with 'BUY')  ? (price_change_pct > 0)
        : (signal_type starts with 'SELL') ? (price_change_pct < 0)
        : null   // NEUTRAL not evaluated

beat_benchmark = (signal_type starts with 'BUY')  ? (price_change_pct > btc_change_pct)
               : (signal_type starts with 'SELL') ? (price_change_pct < btc_change_pct)
               : null
```

### Noise floor
If `|price_change_pct| < 0.05%`, `correct = NULL`. Sub-5bps moves are below typical bid-ask + fee thresholds and indistinguishable from data jitter.

### EVAL-4 frozen-feed guard (added 2026-05-11)
Skip the row entirely if both:
- `Number(currentPrice) === Number(sig.price_at_signal)` AND
- `btcAtEval === btcAtSignal`

This catches the case where the evaluator's price-fetch was served from cache and would produce a row that always says `correct = false` and `change = 0%`.

---

## 9. Quarantine pattern (`suspect` flag)

Forward-only data integrity model: never DELETE, always quarantine.

### Schema
```sql
ALTER TABLE signal_outcomes
  ADD COLUMN suspect BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN suspect_reason TEXT;

CREATE INDEX signal_outcomes_suspect_idx
  ON signal_outcomes (computed_at)
  WHERE suspect = FALSE;   -- partial index for fast clean queries
```

### Quarantines applied to date

| Migration | Rows | Reason |
|---|---:|---|
| `20260506b_quarantine_frozen_feed_outcomes.sql` | 267 | fetch-prices Next.js fetch-cache froze BTC at $76,876 |
| `20260511a_quarantine_evaluator_frozen_cache.sql` | 1040 | evaluate-signals Next.js fetch-cache froze BTC for 4+ days |

### Default query pattern
All audit and PnL scripts filter `WHERE suspect IS FALSE`. Original rows are preserved for post-mortem.

---

## 10. Pipeline-health audit (`scripts/audit-pipeline-health.mjs`)

Seven end-to-end checks. Currently passes; runs in ~30s.

| # | Check | Pass condition |
|--:|---|---|
| 1 | Live BTC ground truth | Binance public API responds with current price |
| 2 | `price_snapshots` BTC latest 3 | Drift vs live < 0.5%, age < 30 min |
| 3 | `system_health` fetch-prices last 5 runs | All `status='ok'`, canary `agreed`, drift < 0.1% |
| 4 | `evaluate-signals` `btc_price_at_eval` per hour bucket | No 3+ consecutive identical hourly values when recent rows drift > 2% from live |
| 5 | `signal_circuit_breaker` state | Reports active/clear for BUY and SELL |
| 6 | `token_signals` last 10 freshness + BTC drift | Most recent < 15 min old; BTC signal price within 0.5% of live |
| 7 | Arithmetic sanity | Stored `price_change_pct` recomputed from `(price_at_eval - price_at_signal)/price_at_signal*100` agrees within 5bps for 20 sample rows |

Final summary: ✅ PASS or ❌ FAIL with detailed per-check output.

---

## 11. The two cache bugs (chronicle and lesson)

**Root cause for both:** Next.js automatically wraps `fetch()` and applies framework-level caching with default `force-cache` semantics for some build modes. Routes calling `fetch()` without `{ cache: 'no-store', next: { revalidate: 0 } }` are silently served stale snapshots, sometimes for days.

### Bug 1: 2026-05-06, fetch-prices
- File: `app/api/cron/fetch-prices/route.ts`
- Symptom: BTC stuck at $76,876 from 2026-05-06 onward
- Detection: BTC moved ~$5k in real markets while price_snapshots stayed flat
- Fix: commit `ac98405`, added `cache:no-store` to `binancePriceFn`, `binance24Fn`, `cgFn`
- Quarantine: 267 rows in `signal_outcomes` flagged `suspect=true`

### Bug 2: 2026-05-11, evaluate-signals (root cause was the same, code was different file)
- File: `app/api/cron/evaluate-signals/route.js`
- Missed by the May 6 sweep because the May 6 fix only patched the file it was in
- Symptom: `btc_price_at_eval` clustered at $76,876 in ~47% of post-May-7 evaluator runs
- **Inverted the engine verdict:** the contaminated PnL audit had reported BUY 85% win / +4.42% net at 24h. After quarantining 1040 contaminated rows, the truth was BUY 5% win / −2.85% alpha at 24h.
- Detection: user falsified a derived claim ("BTC is down 10%") against actual market — it wasn't.
- Fix: commit `508a1aa`, added `cache:no-store` to Binance bulk-ticker fetch (line 71) and CoinGecko fallback (line 124).
- Plus EVAL-4 guard (see §8).
- Quarantine: 1040 rows.

### Bug 3 sweep: same day, 7 more files
After two strikes, same-day audit found the same pattern in:
- `app/api/cron/compute-signals/route.js` — fetchMarketBeta BTC 24h fetch (line ~548), ticker 24hr fetch (~738), 4 parallel Binance fetches in `fetchBinanceLivePrice` (~779). **This was poisoning signal SCORES, not just outcomes.**
- `app/lib/derivativesData.ts` (~179) — feeds 25-30% of composite weight.
- `app/api/cron/whale-whisper/route.js` — 5 Binance fetches.
- `app/api/dashboard/smart-money/route.js` (~31).
- `app/api/token/price/route.js` — 3 Binance fetches (CoinGecko metadata kept at `revalidate:300` intentionally — metadata not price).
- `app/api/token/comprehensive-data/route.js` — 3 Binance + 1 CG fetches.
- `app/api/ticker/route.js` — 24hr ticker.

All fixed in commit `21bde0b`.

### Lessons codified to `/memories/repo/signal-engine.md`
1. When adding `cache:'no-store'` to one route, audit EVERY other cron/route same day.
2. Always falsify against the underlying market. "SELL +4%/trade while BTC is flat-to-up" is mathematically impossible without short alpha — should trigger reflexive falsification.
3. Migration pattern: quarantine, never delete.
4. TODO: add concentration guardrail to `audit-engine-skill.mjs` refusing to print PnL when `btc_price_at_eval` shows >5% concentration on any single $1 bucket.

---

## 12. Honest measured performance (post-fix)

**Sample period:** 2026-05-11T10:00:00Z onward (post `21bde0b`), `suspect=false`, `correct IS NOT NULL`.
**Sample size:** n=966 evaluated signal-windows.
**Fee assumption:** 10 bps round-trip per trade.

| Window | Side | n | Win rate | Net per trade | Alpha vs BTC |
|---|---|---:|---:|---:|---:|
| 1h | BUY | 145 | 42.1% | −0.24% | −0.17% |
| 1h | SELL | 182 | 52.2% | −0.06% | +0.05% |
| 6h | BUY | 160 | 31.2% | −0.82% | −0.75% |
| 6h | SELL | 184 | 48.4% | −0.29% | −0.10% |
| **24h** | **BUY** | **159** | **5.0%** | **−3.80%** | **−2.85%** |
| **24h** | **SELL** | **119** | **63.9%** | **−21.94%** | **−22.54%** |

### Interpretation
- **BUY at 24h: 5% win rate.** Engine systematically buys local tops at the 1-day horizon. Watchdog correctly tripped on 2026-05-13.
- **SELL at 24h: 64% win rate but −22% net.** Classic short-vol payoff: many small wins, occasional catastrophic losses from alt/memecoin pumps. Win rate is misleading; expected PnL is bad.
- **No horizon and no side has positive measured alpha.**

These are the numbers. The plumbing is correct (audit script passes 7/7). The conclusion is that the current heuristic has no edge in the current regime on the current token universe.

---

## 13. Calibration loop (`/api/cron/calibrate-signals`, daily)

Daily at 03:00 UTC, recomputes per-token Information Coefficient (IC) over rolling windows.

### IC definition (used here)
```
ic(token, window) = corr(rank(score - 50), rank(price_change_pct))
```

### Output
Writes one row per token to `token_signal_calibration`:
- `ic_1h`, `ic_6h`, `ic_24h`
- `confidence_score` (function of n and t-stat)
- `sample_size`
- `sign_multiplier ∈ {-1, +1}` — flips a token whose Tier 1 sign is systematically backwards
- `updated_at`

### Use
`compute-signals` reads `sign_multiplier` and applies it to the Tier 1 contribution before the composite. This is the production mechanism for handling the case where the upstream whale-transactions classifier is consistently wrong on a specific token.

### Operator backup
`signal_calibration_snapshot` allows manual override via admin UI. Used when calibration data is too thin (n < 30) to trust automated multiplier.

---

## 14. Watchdog logic (`/api/cron/accuracy-watchdog`, every 6h)

Five checks, in order:

1. **Headline accuracy regression:** trailing 24h vs 7d baseline. Alert if drop > 10 percentage points.
2. **Distribution shift:** BUY/SELL/NEUTRAL share 24h vs 7d. Alert if any category shifts > 25pp.
3. **Z-score anomaly:** trailing 30d mean/std of accuracy. Alert if today's 24h is > 2σ below mean.
4. **CUSUM drift:** cumulative deviation crossing 5σ.
5. **Per-direction circuit breaker (the real safety):** see §7.1.

Output: one row to `accuracy_baseline` always; webhook POST (Slack/Discord) on alert.

---

## 15. Honest list of known design weaknesses

1. **Linear weighted composite of features** — no interactions, no non-linearities except per-tier `tanh()`. Misses anything regime-dependent.
2. **Hand-tuned weights** — never empirically fit. Could be off by a lot.
3. **Score → label thresholds (28/42/58/72) are arbitrary** — never percentile-fit to observed distribution. STRONG bands rarely fire as a result.
4. **No regime detection** — engine fires the same heuristic in chop, trend, crash, and pump regimes. Almost certainly losing money in chop.
5. **No volume confirmation gate** — fires on tiny moves with no volume backing.
6. **No position sizing or risk model** — every signal is treated as a unit trade for accounting; no Kelly, no vol-targeting.
7. **No exit logic beyond fixed time horizons (1h/6h/24h)** — real strategies have stop-losses and trailing exits.
8. **24h SELL has terrible expected payoff despite 64% win rate** — short-vol payoff with no protection.
9. **Tier 4 is mostly inert** — 5-10% weight allocated to features that aren't actually computed.
10. **Tier 1 depends on upstream classifier** in a separate `whale-transactions` repo. If that classifier is wrong on a token, no amount of weight tuning fixes it.
11. **No cross-sectional view** — engine treats each token independently. Misses the well-documented crypto cross-sectional reversal effect.
12. **No funding-rate carry strategy** — even though funding data is in Tier 5, it's a feature, not a strategy.
13. **No pairs / cointegration** — most-liquid pairs (ETH/BTC, SOL/ETH) are obvious targets.
14. **Sentiment tier is held back at 5% weight** out of overfit fear, but the per-token IC suggests it might deserve more on liquid tokens.
15. **Backtests are forward-evaluation only** — no walk-forward analysis, no out-of-sample test, no cross-validation, no regime-conditional analysis.

---

## 16. What would need to be true for the engine to have edge

The honest answer is: at least one of these would need to be the case, and right now none of them are demonstrated.

1. **Tier 1 signal carries genuine alpha after fees** — needs n ≥ 200 clean evaluated signals per side per horizon (currently we're just past that for 1h, not for 24h).
2. **Regime gating** — the engine only fires in the regimes where it works (e.g. trending, not chop). Requires identifying which regime each historical signal was in and conditional accuracy.
3. **Better label thresholds** — STRONG BUY only on the top-decile of historical scores rather than at composite ≥ 72.
4. **Cross-sectional ranking** — instead of independent per-token labels, rank all 95 tokens daily and emit "buy top decile, sell bottom decile" with daily rebalance.
5. **Replace Tier 4 with something real** — e.g. funding-rate carry across the perp universe.
6. **Add a real strategy alongside the heuristic** — e.g. cross-sectional 1-day reversal on liquid majors. Cheap to build, well-documented edge in academic literature, no new data feeds needed.

These are the specific testable hypotheses to put in front of a research model. See `PROMPT_SIGNAL_RESEARCH.md`.

---

## 17. File map (where everything lives in the repo)

| Concern | File |
|---|---|
| Signal compute cron | `app/api/cron/compute-signals/route.js` |
| Signal evaluate cron | `app/api/cron/evaluate-signals/route.js` |
| Price fetch cron | `app/api/cron/fetch-prices/route.ts` |
| Calibrate cron | `app/api/cron/calibrate-signals/route.js` |
| Watchdog cron | `app/api/cron/accuracy-watchdog/route.js` |
| Derivatives data | `app/lib/derivativesData.ts` |
| Public accuracy API | `app/api/signals/accuracy/route.js` |
| Pipeline-health audit | `scripts/audit-pipeline-health.mjs` |
| Engine skill audit | `scripts/audit-engine-skill.mjs` |
| Engine regression test | `scripts/test-signal-engine.mjs` (runs in `npm prebuild`) |
| IC audit (walk-forward) | `scripts/ic-audit.js` |
| Quarantine migrations | `supabase/migrations/20260506b_*.sql`, `supabase/migrations/20260511a_*.sql` |
| Repo memory note | `/memories/repo/signal-engine.md` |
| Signal pipeline hardening prompt | `SIGNAL_PIPELINE_HARDENING_PROMPT.md` |

---

## 18. What this document is for

This is the source-of-truth pipeline description for Sonar's signal engine as of 2026-05-13. It is intentionally complete — including failure modes, contaminated history, measured (negative) performance, and design weaknesses — so that downstream deep-research (with Claude Opus 4.7 or any other model) can reason about what to change without first having to discover the truth themselves.

The companion document `SONAR_STANCE_2026-05-13.md` describes the broader product and business context.
