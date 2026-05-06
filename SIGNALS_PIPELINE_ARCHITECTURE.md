# Sonar Signals Pipeline — Architecture & Internals

> **Generated:** 2026-05-06 — for handoff to a research/upgrade agent.
> **Repo:** `sonar` (Next.js 14.2 App Router on Vercel; Supabase Postgres).
> **Scope:** every component that touches a signal, from raw data ingestion to user-visible label.
> **Author intent:** comprehensive enough that an external researcher can propose an upgrade without re-deriving any of the existing logic.

---

## 0. TL;DR for the researcher

Sonar emits one of `STRONG BUY / BUY / NEUTRAL / SELL / STRONG SELL` per token every 15 minutes. The label is the output of a **4-tier weighted score** ([0–100]) that goes through five sequential gates:

```
raw tier scores → weighted sum → calibration sign-flip → calibration confidence gate
                → regime-graded asymmetric label gate → per-direction circuit breaker
                → user-facing API
```

Outcomes (was the label right after 1h/6h/24h?) are written to `signal_outcomes`. A **daily calibrator** uses those outcomes to re-derive each token's `sign_multiplier` (does Tier-1 mean what we think it means for this token?) and a `confidence_score` (do we have enough evidence to fire on this token at all?). A **6-hourly watchdog** statistically tests for accuracy collapse and flips a kill-switch row in `signal_circuit_breaker`.

Known limitations (good upgrade targets):
1. Tier weights are static; no ML or per-regime weight schedule.
2. Regime detection is BTC-only and threshold-based (no HMM/clustering).
3. The calibrator collapses three windows (1h/6h/24h) into one sign — windows can disagree.
4. No portfolio view — every token is scored independently, no cross-sectional ranking on the live path (xrank exists in factors but isn't used for sizing).
5. STRONG bands rarely fire (`tanh` saturation in tiers + 16-pt NEUTRAL band at 42–58).
6. Trap detection is heuristic if-then; not learned.
7. No execution model (we score, we don't size or risk-budget).

---

## 1. Stack & cron schedule

| Component | Tech |
|---|---|
| Web | Next.js 14.2.35 App Router on Vercel (`maxDuration: 120` for compute-signals) |
| DB | Supabase Postgres (PostgREST) |
| Compute | Vercel serverless (per-cron) |
| External data | Binance Spot + Futures (free, no key), CoinGecko Pro (paid, fallback), LunarCrush, internal `whale-transactions` repo |

[vercel.json](vercel.json) crons relevant to signals:

| Cron | Schedule (UTC) | Purpose |
|---|---|---|
| [`/api/cron/fetch-prices`](app/api/cron/fetch-prices/route.js) | `*/15 * * * *` | Writes `price_snapshots` (BTC + ~50 alts). Hard-fails on zero inserts under `FETCH_PRICES_FAILOVER=on`. |
| [`/api/cron/cache-derivatives`](app/api/cron/cache-derivatives/route.js) | `*/5 * * * *` | Snapshots Binance Futures funding/L-S to `derivatives_snapshots`. |
| [`/api/cron/ingest-news`](app/api/cron/ingest-news/route.js) | `0 */4 * * *` | News RSS → raw rows. |
| [`/api/cron/analyze-sentiment`](app/api/cron/analyze-sentiment/route.js) | `15 */2 * * *` | LLM scores → per-article sentiment. |
| [`/api/cron/aggregate-sentiment`](app/api/cron/aggregate-sentiment/route.js) | `0 * * * *` | Per-token rolling sentiment score. |
| [`/api/cron/ingest-social`](app/api/cron/ingest-social/route.js) | `30 */2 * * *` | LunarCrush social pull. |
| [`/api/cron/compute-signals`](app/api/cron/compute-signals/route.js) | `5,20,35,50 * * * *` | **THE engine driver.** Runs every 15 min, ~2 min after fetch-prices. |
| [`/api/cron/evaluate-signals`](app/api/cron/evaluate-signals/route.js) | `30 * * * *` | Hourly outcome evaluation (1h/6h/24h windows). |
| [`/api/cron/calibrate-signals`](app/api/cron/calibrate-signals/route.js) | `0 3 * * *` | Daily per-token IC + sign-multiplier refresh. |
| [`/api/cron/accuracy-watchdog`](app/api/cron/accuracy-watchdog/route.ts) | `0 */6 * * *` | Statistical watchdog + circuit breaker upserts. |

Cadence diagram (one BTC/ETH cycle):
```
00:00 fetch-prices ── 00:05 compute-signals ── 00:30 evaluate-signals (yesterday's signals → outcomes)
00:00 accuracy-watchdog (every 6h)
03:00 calibrate-signals (once daily, after enough fresh outcomes)
```

---

## 2. Data sources (inputs to the engine)

### 2.1 Whale transactions (`all_whale_transactions`)
Owned by an upstream repo (`whale-transactions`); Sonar treats it as read-only.
Schema fields the engine actually uses:
- `classification` ∈ `{BUY, SELL, TRANSFER, ...}` — upstream's directional label.
- `usd_value` — trade size in USD.
- `whale_address`, `from_address`, `to_address` — for unique-whale counting.
- `timestamp` — exposure time.
- `confidence` — per-tx classifier confidence in `[0, 1]`. **Sonar drops rows with `confidence < 0.5`** (matches upstream's own Stage-1 threshold; rejects "Stage 1 contested" rows that are explicitly flagged as noise).
- `reasoning`, `from_label`, `to_label` — string hints used by Sonar's `classifyVenue()` to infer CEX vs DEX vs OTHER. The legacy `counterparty_type` column is empty on 100% of recent rows; we use these instead.

**Pitfall:** the upstream classifier IS the source of truth on direction. If it mislabels CEX deposits as BUY (instead of SELL), Sonar's Tier-1 inverts. This is what motivated the per-token `sign_multiplier` infrastructure (§5).

### 2.2 Prices (`price_snapshots` + Binance live)
Written every 15 min by [fetch-prices](app/api/cron/fetch-prices/route.js). Fields used downstream:
- `price_usd`, `volume_24h`, `market_cap`, `price_change_24h` — historical reference points.
- `taker_buy_pressure` (Binance klines) — fraction of last bar's volume that was taker-buy.
- `change_1h`, `change_6h` — derived from rolling-window Binance ticker.

Engine-time price (`price_at_signal`) is always pulled **live from Binance** at compute time, not from `price_snapshots`. This was a critical fix (v7) — using the cached value caused a 30-min systematic look-back in the entry price.

**Freshness gate**: compute-signals refuses to run if BTC's latest snapshot is >30 min old. Returns `503 stale`. Prevents the disaster of producing 49h of signals on frozen prices (happened pre-v8).

### 2.3 Derivatives (`derivatives_snapshots` + Binance Futures live)
[`app/lib/derivativesData.ts`](app/lib/derivativesData.ts):
- **Funding rate** (8h interval): positive = longs pay shorts = market overleveraged long. Mapped to `fundingSignal ∈ [-100, +100]`.
- **Long/short ratio** (account count): >1 = more longs. **Treated CONTRARIAN** — extreme longs = bearish (overcrowded trade).
- **Top trader L/S ratio** (position-weighted, top 20% accounts): treated **PRO-TRADE** (smart money).
- **Taker buy/sell ratio**: aggressive buyers vs aggressive sellers (last bar).
- **`compositeSignal`**: weighted blend of the four above.

Not all tokens have futures markets. PEPE/SHIB previously erroreed (`NO_FUTURES`); the v7 fetcher gracefully returns `available: false` and the engine downweights to the no-derivatives weights (§4.2).

### 2.4 Sentiment + Social
- News sentiment: LLM-scored articles → `aggregate_sentiment_per_token`. Fields: `score ∈ [0, 1]`, `count`.
- Social: LunarCrush — `galaxy_score ∈ [0, 100]`, `alt_rank`, `sentiment ∈ [0, 100]`, `interactions_24h`.

### 2.5 Community + Dev
- `community_votes`: bullish/bearish/neutral counts (in-app voting).
- `dev_activity`: GitHub commits in last 4 weeks (when available; absent for most alts).

---

## 3. Engine internals: [`app/lib/signalEngine.ts`](app/lib/signalEngine.ts)

Pure function (under DET-1 nowMs injection): `computeUnifiedSignal(params) → UnifiedSignal`.

### 3.1 Tier 1 — CEX Whale Flow ([line 316](app/lib/signalEngine.ts#L316))
**Input:** filtered whale transactions in last 24h (with prev-24h for change-of-volume).

Pipeline per tx:
1. Filter: `classification ∈ {BUY, SELL}` AND `confidence ≥ 0.5` AND `timestamp ≥ now-24h`.
2. Classify venue: CEX (1.5×) | DEX (1.0×) | OTHER (0.85×). Hints in reasoning/labels.
3. Per-tx weight = `usd × decay × sizeWeight × venueBoost × confWeight`:
   - `decay = exp(-(now-tx.ts) / 6h)` (half-life 6h)
   - `sizeWeight = sqrt(max(1, usd/10000))`
   - `venueBoost` per above
   - `confWeight = 0.3 + 1.0 × tx.confidence` (so 0.5-conf → 0.80 weight, 1.0-conf → 1.30)

Aggregates:
- `weightedFlowSignal = tanh((buyVolWeighted - sellVolWeighted) / (totalWeighted * 0.4))`
- `largeTxSignal` (txs > $500k): half-weight.
- `velocitySignal`: are last-3h whales accelerating vs prior 21h? Quarter-weight.
- `breadthBonus` + `surgeBonus`: amplify (multiplicative `directionMultiplier`), not additive — a v3 fix to stop bias-toward-buy.

**Final raw**: `(weightedFlow * 0.55 + largeTx * 0.20 + velocity * 0.15) * directionMultiplier`, clamped × 100.

**Confidence**: `txCountConf*0.5 + whaleCountConf*0.3 + largeTxConf*0.2`, all in [0,1].

Surfaced factors (persisted to `tier1_factors` JSONB): buyRatio, netFlow, cex/dex sub-volumes, uniqueWhales, large-tx volumes, recentBuyVol3h, weightedFlowSignal, velocitySignal, avgClassifierConfidence.

### 3.2 Tier 2 — Price Momentum + Volume ([line 493](app/lib/signalEngine.ts#L493))
Pure technical view from price changes + volume:
- `m1h, m6h, m24h, m7d, m30d` = `tanh(change / scale) × 100` (scales: 5, 8, 10, 20, 30 — longer windows tolerate larger %).
- `momentumScore = m1h*.15 + m6h*.20 + m24h*.30 + m7d*.25 + m30d*.10`.
- `volRatio = vol24h / avgVol7d`, `volSignal = tanh((volRatio-1) × 2)`.
- `volConfirmation = sameDirection(momentum, volSignal) ? 1.2 : 0.85`.

**Final**: `momentumScore × volConfirmation`.

When `technicalSignals.compositeConfidence > 20` (the TA module fired), Tier 2 score is rewritten as `0.3*momentum + 0.7*TA_composite`. TA is preferred because it uses RSI/SMA/Bollinger from real OHLCV.

### 3.3 Tier 3 — News Sentiment + Social ([line 553](app/lib/signalEngine.ts#L553))
- `sentimentScore = (news_score - 0.5) × 200`, sentiment confidence ∝ article count.
- `socialScore = (galaxy-50)*2 * 0.5 + (sentiment-50)*2 * 0.5`, attenuated by interaction volume.
- Combined `0.4*sentiment + 0.6*social`.

### 3.4 Tier 4 — EOA Activity + Community + Dev ([line 619](app/lib/signalEngine.ts#L619))
Weak-signal sleeve:
- EOA flow change (24h vs prev 24h).
- Community vote net.
- Dev commits step function (>10 = +5, >50 = +10, >100 = +15).

### 3.5 Technical Analysis ([`app/lib/technicalAnalysis.ts`](app/lib/technicalAnalysis.ts))
Computed from `price_snapshots` history (last ~25h at 15-min cadence). Outputs:
- `rsi14`, `rsiSignal` (overbought/oversold)
- `sma20/50`, `priceVsSma20/50`, `smaSignal`
- `bbUpper/Middle/Lower`, `bbWidth`, `bbPosition`, `bbSignal`
- `adx14` — trend strength
- `compositeScore`, `compositeConfidence`
- `regime ∈ {trending_up, trending_down, ranging, high_volatility, low_volatility}` — **per-token**, not BTC.

**This per-token regime is currently used only to apply a confidence penalty (15-20 pts), NOT to gate label.** Compare with §6 (the new BTC-regime gate, which IS label-affecting).

### 3.6 Trap detection ([line 660](app/lib/signalEngine.ts#L660))
Heuristic post-hoc adjustments to `rawScore`:
- **BULLISH_TRAP** (–30): T2>20 but T1<–20 → distribution into rally.
- **DEAD_CAT_BOUNCE** (–20): 1h>+3% but 7d<–15% with no volume confirmation.
- **SOCIAL_PUMP_DIVERGENCE** (–15): T3>40 but |T1|<10 → social pump w/o whale activity.
- **BEARISH_TRAP** (+20): T2<–20 but T1>20 → accumulation into dump.
- **LOW_LIQUIDITY** (no score adjustment, –30 confidence): vol/mcap < 2%.

---

## 4. Composition: `computeUnifiedSignal` ([line 752](app/lib/signalEngine.ts#L752))

### 4.1 Sign multiplier (Tier 1 only)
Tier-1's score is multiplied by `tier1Sign ∈ {-1, 0, +1}`. Resolution order:
1. **Live calibration** row (`token_signal_calibration`, refreshed daily).
2. **Operator snapshot** (`signal_calibration_snapshot`, manual approval).
3. **Default +1** (raw direction).
4. **Kill switch** `SIGNAL_ENGINE_IC_FIX=off` → forces +1 everywhere.

The static 16-token sign map was **deleted 2026-05-04** (Stage 2 hardening); it was generated from outcomes corrupted by the April fetch-cache bug and was muting healthy tokens.

`SignDecision { source, multiplier, raw_score }` is persisted on every row so audits can ask "which layer flipped this?" without re-running the engine.

### 4.2 Tier weights (current as of 2026-04-30)
```js
IC_FIX_ENABLED + derivatives:    { t1: 0.30, t2: 0.30, t3: 0.10, t4: 0.05 }  + deriv 0.25
IC_FIX_ENABLED no derivatives:   { t1: 0.40, t2: 0.40, t3: 0.10, t4: 0.10 }
LEGACY (kill switch on, deriv):  { t1: 0.20, t2: 0.30, t3: 0.15, t4: 0.05 }  + deriv 0.30
LEGACY no derivatives:           { t1: 0.25, t2: 0.40, t3: 0.25, t4: 0.10 }
```

Unavailable tiers redistribute proportionally to those that ARE available (`effectiveWeight`).

**Why these weights?** (See [`/memories/repo/signal-engine.md`](../signal-engine.md) for the audit log.)
The 60d alpha-IC audit on 2026-04-29 showed:
- T1: alpha-IC +0.20 (best individual-token edge), but 7d IC swung to −0.25 by 2026-05-04.
- T2: alpha-IC −0.21 (raw IC was +0.17 — pure beta capture, no alpha).
- T3: very small-n; sign-unstable.
- Confidence (composite, used as gate not weight): IR 1.18-1.66.

Conservative balanced weights pending re-audit after 2026-05-07 (7 days post the tier-1 transform fix).

### 4.3 Composition math
```js
rawScore = Σ tier.score × tier.effectiveWeight
         + (deriv.compositeSignal × 0.30  if deriv available)
         + Σ trap.adjustment
         + smartMoneyBonus  // disabled under IC_FIX_ENABLED

confluenceMultiplier = 0.6 + (agreementCount / availableTiers) × 0.4   // 0.6–1.0
tierDisagreementPenalty = 10  if T1 and T2 disagree
regimeConfidencePenalty = 15 (downtrend) | 20 (high_vol)  // from per-token TA regime

confidence = clamp(baseConfidence × confluenceMultiplier
                   - confidenceReduction
                   - tierDisagreementPenalty
                   - regimeConfidencePenalty,  0, 100)

score = round((rawScore + 100) / 2)   // remap −100..+100 → 0..100
```

### 4.4 Calibration confidence gate (label-affecting)
```js
const CALIBRATION_LABEL_GATE = 20
if (calibration.nOutcomes >= 20 && calibration.confidenceScore < 20) {
   signal = 'NEUTRAL'   // override label regardless of score
}
```
Tokens whose own track record is near-coinflip with no IC magnitude don't get to fire.

### 4.5 Default label thresholds ([`getSignalLabel`](app/lib/signalEngine.ts#L1066))
```js
if (confidence < 15) → 'NEUTRAL'
score ≥ 72 → 'STRONG BUY'
score ≥ 58 → 'BUY'
42 < score < 58 → 'NEUTRAL'   // 16-pt deadband
score ≤ 28 → 'STRONG SELL'
score ≤ 42 → 'SELL'
```

These get **overridden by the regime gate** in compute-signals (§6).

---

## 5. Calibration loop: [`/api/cron/calibrate-signals`](app/api/cron/calibrate-signals/route.js)

Daily 03:00 UTC. Per-token, per-window (1h/6h/24h):

1. Pull last **14 days** of `signal_outcomes` rows (excluding NEUTRAL, excluding `correct=null`).
2. Group by `(token, eval_window)`.
3. Compute:
   - `IC = pearson(signal_score, price_change_pct)`
   - `bootstrap CI` (200 resamples, percentile method)
   - `hit_rate = correct / n_directional`
4. **Hit-rate-first sign proposal** (`proposeSign`):
   - `n < 50` → null (no proposal — leave existing as-is)
   - `hit_rate ≤ 0.40` → propose −1
   - `hit_rate ≥ 0.60` → propose +1
   - else → propose 0 (mute)
5. **Confirmation gates** (only for non-+1 proposals):
   - `|IC| ≥ 0.15` (point estimate above noise floor)
   - `IC bootstrap CI excludes 0` (statistically distinguishable)
6. **Hysteresis** (`isFlipConfirmed`): the same proposal must repeat **3 consecutive nightly runs** before the live `sign_multiplier` row flips.
7. Compute `confidence_score = f(IC, hitRate, n, CI)`, clamped 0..100.

Writes:
- `token_signal_calibration` (live row, one per (token, window))
- `calibration_proposal_log` (every nightly proposal, for hysteresis history + audit)

**Why the engine uses median-across-windows:** [`loadCalibrationByToken`](app/api/cron/compute-signals/route.js#L168) collapses the 3 window rows into a single per-token sign by taking the median (so 2/3 windows must agree to flip). Confidence is sqrt(n)-weighted mean across windows under `CALIBRATION_V2=on` (otherwise MAX-of-windows, which over-weighted 1h).

---

## 6. Regime-graded label gate (NEW 2026-05-06, [compute-signals](app/api/cron/compute-signals/route.js))

After the engine returns, BEFORE the circuit breaker:

### 6.1 BTC regime classification
```js
fetchMarketBeta() → { btc24hChange, btc6hChange, regime }
```
24h from Binance live ticker (Supabase fallback). 6h from `price_snapshots` (latest minus snapshot ≤6h ago).

```
bear_strong:  btc24h ≤ -3%  OR  btc6h ≤ -1.5%
bear_mild:    btc24h ≤ -1%  OR  btc6h ≤ -0.5%
bull_mild:    btc24h ≥ +1%  OR  btc6h ≥ +0.5%
bull_strong:  btc24h ≥ +3%  OR  btc6h ≥ +1.5%
chop:         otherwise
```
The 6h trend matters because 24h smooths over fresh dumps (May 6 morning was exactly that — flat 24h, ugly 6h).

### 6.2 Asymmetric thresholds
| Regime | BUY | STRONG BUY | SELL | STRONG SELL |
|---|---|---|---|---|
| bear_strong | 72 (was 58) | 85 | 48 | 34 |
| bear_mild   | 65 | 78 | 45 | 31 |
| chop        | 58 | 72 | 42 | 28 |
| bull_mild   | 55 | 69 | 35 | 22 |
| bull_strong | 48 | 65 | 28 | 15 |

### 6.3 One-way only
The gate ONLY applies if the relabel moves *with* the regime:
- `bear`: suppress bullish (BUY → NEUTRAL/SELL), promote bearish (NEUTRAL → SELL)
- `bull`: mirror.

If the relabel would amplify a wrong-way bet (e.g. bear regime + bullish-was → more bullish), the original label stays. **Score is never modified** — only the label and `original_signal_pre_regime` is recorded.

### 6.4 BTC/WBTC bypass
They ARE the regime; gating them creates self-referential loops.

---

## 7. Per-direction circuit breaker (NEW 2026-05-04 evening)

[`signal_circuit_breaker`](supabase/migrations/20260504d_signal_circuit_breaker.sql) table, two rows (`BUY`, `SELL`). Each: `active`, `reason`, `acc_pct`, `sample_size`, `triggered_at`, `cleared_at`.

### 7.1 Watchdog ([`/api/cron/accuracy-watchdog`](app/api/cron/accuracy-watchdog/route.ts))
Every 6h. Computes:
- 24h vs 7d headline accuracy delta (pp).
- Distribution shift (BUY/SELL/NEUTRAL share, max abs delta).
- 30-day baseline mean + std → z-score of today.
- 56-sample CUSUM (Page 1954, k=0.5σ slack, h=5σ alert).
- **Per-direction 6h accuracy** (BUY family = BUY+STRONG BUY; SELL family = SELL+STRONG SELL).

Breaker transitions (constants in [route.ts L65-68](app/api/cron/accuracy-watchdog/route.ts#L65)):
```
LOOKBACK = 6h
MIN_SAMPLES = 25       // was 40 (lowered after May 6 near-miss at n=39)
SUPPRESS_PCT = 35      // was 30 — trip if 6h dir-acc < 35%
CLEAR_PCT = 45         // hysteresis band: 35→45 (10pp gap)
```

Upserts the breaker row on transition; pushes alert reasons (`circuit_breaker_tripped:BUY` / `_cleared:`) with level `critical`/`warn`.

### 7.2 Compute-signals enforcement ([route.js L94](app/api/cron/compute-signals/route.js))
On every 15-min run:
1. `loadCircuitBreaker()` reads both rows (fail-open on Supabase error).
2. After engine returns, if family is suppressed: `signal.original_signal = signal.signal; signal.signal = 'NEUTRAL'; push Circuit Breaker trap`.

Watchdog clears the breaker automatically when 6h dir-acc recovers above 45%.

### 7.3 Manual override
Direct SQL:
```sql
UPDATE signal_circuit_breaker
SET active=true, reason='manual: ...', triggered_at=now(), updated_at=now()
WHERE signal_type='BUY';
```
Used today (2026-05-06) when the n=39 near-miss left BUYs flowing through to users.

---

## 8. Outcome evaluation: [`/api/cron/evaluate-signals`](app/api/cron/evaluate-signals/route.js)

Hourly. For every `token_signals` row whose `computed_at` is exactly 1h/6h/24h ago and which doesn't yet have an outcome row at that window:

1. Determine `target_eval_time = computed_at + window`.
2. Get `price_at_eval`:
   - **`EVAL_NEAREST_NEIGHBOR=on`** (live since 2026-05-01): nearest-snapshot to target inside ±15min, per token. Removes the (window+15min) fuzz that the live priceMap introduces.
   - Fallback: live priceMap (Binance bulk → CG fallback → price_snapshots last-resort).
3. `price_change_pct = (price_eval - price_signal) / price_signal × 100`.
4. **Noise floor**: if `|price_change_pct| < NOISE_FLOOR_PCT` (5 bps, [`lib/quant/constants.ts`](lib/quant/constants.ts)) → `correct = NULL` (excluded from accuracy/IC math; below taker-fee threshold = unprofitable noise).
5. Same logic for BTC benchmark to compute `alpha_pct = price_change_pct - btc_change_pct`.
6. `correct = (signal_type ∈ BUY-family ? change > 0 : change < 0)`.

Writes `signal_outcomes` (one row per (signal_id, eval_window) — UNIQUE constraint).

### 8.1 Special handling
- `signal_type = 'NEUTRAL'`: skipped entirely, no outcome row.
- Stale-price detection: if `price_at_signal == price_at_eval` exactly, that's a data-feed gap (5bps floor catches it).
- BTC benchmark uses nearest-neighbour BTC price at the eval target, NOT live BTC (eliminates look-ahead bias in alpha calc).

### 8.2 Skip reasons
The evaluator emits `skip_reasons` counters in its response: `no_eval_price`, `noise_floor`, `noise_floor_btc`, `stale_token_price`, `stale_btc_price`, `no_btc_price`. Useful for spot-checking pipeline health.

---

## 9. Storage schema (the tables that matter)

### 9.1 [`token_signals`](supabase/migrations/20260220_token_signals.sql) — engine output
| Column | Notes |
|---|---|
| `id` BIGSERIAL PK | |
| `token`, `signal`, `score` (0-100), `confidence` (0-100), `raw_score` (-100..100) | Core. |
| `price_at_signal`, `market_cap` | For backtest. |
| `tier1_score`, `tier1_confidence`, ... `tier4_*` | Per-tier breakdown. |
| `top_factors` JSONB | Array of `{name, score, weight, contribution}`, top 5. |
| `traps` JSONB | Array of `{type, severity, description, adjustment?, confidenceReduction?}`. |
| `tier1_factors` JSONB | Whale-flow diagnostics. Includes `_xranks` (cross-sectional rank z-scores). |
| `computed_at` | Sort key. |

**Look-ahead-prone columns** (`price_24h_later`, `price_3d_later`, `return_24h`, etc.) were **dropped 2026-05-02** ([migration `20260502_drop_lookahead_columns.sql`](supabase/migrations/20260502_drop_lookahead_columns.sql)). Outcomes live in `signal_outcomes` only.

### 9.2 [`signal_outcomes`](supabase/migrations/20260404_create_signal_outcomes.sql) — evaluator output
| Column | Notes |
|---|---|
| `signal_id` FK → `token_signals(id)` | |
| `signal_type`, `signal_score`, `signal_confidence` | Snapshot at signal-time. |
| `price_at_signal`, `price_at_eval`, `price_change_pct` | |
| `correct` BOOL | `NULL` when below noise floor or stale price. |
| `eval_window` ∈ `{1h, 6h, 24h}` | |
| `signal_time`, `eval_time` | |
| Added later (`20260420_signal_outcomes_benchmark.sql`): `btc_price_at_signal`, `btc_price_at_eval`, `btc_change_pct`, `alpha_pct`. | |
| Added later (`20260504a_signal_outcomes_raw_columns.sql`): `raw_signal_type`, `raw_score`, `tier1_sign_source`, `tier1_sign_multiplier` — for "what did the engine think before our overrides?" audits. | |

UNIQUE `(signal_id, eval_window)`.

### 9.3 [`token_signal_calibration`](supabase/migrations/20260425000000_token_signal_calibration.sql)
PK `(token, eval_window)`. Holds:
- `ic`, `hit_rate`, `n_outcomes`, `n_directional`, `mean_alpha`, `mean_change`
- `sign_multiplier ∈ {-1, 0, 1, NULL}` ← **what the engine reads**
- `confidence_score` (0-100) ← **the label gate**
- `lookback_days`, `computed_at`

### 9.4 [`signal_calibration_snapshot`](supabase/migrations/20260504b_signal_calibration_snapshot.sql)
Same shape as `token_signal_calibration`. **Operator-curated.** Cron NEVER writes it. Acts as a slow-moving fallback when live calibration hasn't reached confidence.

### 9.5 [`signal_circuit_breaker`](supabase/migrations/20260504d_signal_circuit_breaker.sql)
Two rows (`BUY`, `SELL`). Auto-managed by watchdog; manual SQL override possible.

### 9.6 [`accuracy_baseline`](supabase/migrations/) — watchdog history
One row per watchdog tick: `accuracy_pct`, `sample_size`, `distribution_share_*`, `signal_time`. Source of truth for the 30-day baseline mean/std and CUSUM.

### 9.7 [`calibration_proposal_log`](supabase/migrations/) — calibrator history
One row per (token, window, run) calibrator proposal: `proposed_sign`, `proposed_at`, plus the IC/CI/hitRate that justified it. Read by `isFlipConfirmed` for hysteresis.

### 9.8 Supporting tables
- `price_snapshots` (15-min cadence)
- `derivatives_snapshots` (5-min cadence)
- `system_health` (HEALTH-1 instrumentation; cron health writes here)
- `aggregate_sentiment_per_token`, `social_metrics`, `community_votes`, `dev_activity`

---

## 10. User-facing APIs

### 10.1 [`/api/signals`](app/api/signals/route.js)
List of latest signals. **`HIDE_BULLISH_SIGNALS = true`** mutes BUY/STRONG BUY → NEUTRAL with `muted_reason: 'bullish_under_review'`. Pre-existing bullish-IC remediation; should be removed when the new regime gate proves itself in the IC audit.

### 10.2 [`/api/signals/accuracy`](app/api/signals/accuracy/route.js)
Headline + per-window stats. Returns:
- `overall: { total, correct, accuracy, p_value }` (binomial vs 50%)
- `by_window: { '1h': {...}, '6h': {...}, '24h': {...} }`
- `by_type`
- `low_confidence` flag when n < `MIN_N_FOR_TRUST`
- `pnl` block (gross, after-fee net, alpha vs BTC)
- `vs_benchmark`
- `disclaimers` (auto-generated based on flags)
- `freshness` (from `system_health` view)
- `signal_visibility: { bullish_muted, note }`

`?include_muted=true` overrides the bullish mute for admin/audit.

---

## 11. Feature flags / kill switches

| Flag | Default | Purpose |
|---|---|---|
| `SIGNAL_ENGINE_IC_FIX` | `on` | Enables per-token sign multipliers + balanced weights. `off` forces all multipliers to +1 + legacy weights. |
| `SIGNAL_ENGINE_DEBUG` | `off` | Enables per-row `sign_decision` JSON logs. |
| `EVAL_NEAREST_NEIGHBOR` | `on` | Use nearest-snapshot for eval prices instead of live priceMap. |
| `CALIBRATION_V2` | `on` | Use sqrt(n)-weighted confidence collapse instead of MAX. |
| `FETCH_PRICES_FAILOVER` | `on` | Provider retry + hard-503 on zero inserts. |

---

## 12. The audit trail

### 12.1 Scripts
- [`scripts/ic_audit.js`](scripts/ic_audit.js) — per-token Pearson IC, walk-forward mode, alpha-vs-BTC labels.
  - `node scripts/ic_audit.js 30 alpha` (requires `vercel env pull` first)
  - `--pooled-only` for legacy single-number output.
  - `--json` for machine-readable.
- [`scripts/analyze_signal_distribution.js`](scripts/analyze_signal_distribution.js) — Score × BUY×BTC trend cross-tab.
- [`scripts/audit_label_sanity.js`](scripts/audit_label_sanity.js) — descriptive bucket × token × 24h hit rate.

### 12.2 Operational queries
```pwsh
# Live accuracy
Invoke-RestMethod "https://www.sonartracker.io/api/signals/accuracy?days=30" | ConvertTo-Json -Depth 6

# Force a watchdog tick
curl.exe -H "Authorization: Bearer $env:CRON_SECRET" "https://www.sonartracker.io/api/cron/accuracy-watchdog"

# Breaker state
curl.exe -H "apikey: $key" -H "Authorization: Bearer $key" \
  "$url/rest/v1/signal_circuit_breaker?select=signal_type,active,acc_pct,reason,triggered_at"
```

---

## 13. Known weaknesses / upgrade targets

These are the highest-leverage research questions for the upgrade prompt. Ranked by expected lift.

### 13.1 (BIG) Tier weights are static and one-size-fits-all
- No regime-conditional weighting (e.g. T2 momentum is high-IC in trends, ~0 in chop).
- No per-token weighting (BTC's whale flow is meaningless; SHIB's is everything).
- Candidate fixes: ridge regression of tier scores → next-period return, fit per-(token, regime) bucket; or hierarchical Bayesian with per-token shrinkage.

### 13.2 (BIG) Regime detection is BTC + thresholds only
- Ignores per-token regime, ignores volatility regime (high-vol = mean revert, low-vol = trend), ignores cross-asset regime (BTC.D, ETH/BTC, stables flow).
- Candidate: HMM on BTC + a "risk-on/off" indicator (BTC.D + DXY + funding). Output: regime probabilities, not hard buckets.

### 13.3 (MEDIUM) Engine is per-token, no cross-sectional ranking
- Live signal labels don't account for "BTC just went BUY 92, ETH just went BUY 60 — only BTC is interesting".
- We DO compute `_xranks` but don't surface them to the user-facing signal label or any rank-based gating.
- Candidate: cross-sectional z-score on `score` within each refresh batch, only top-K per direction get to fire.

### 13.4 (MEDIUM) STRONG bands rarely fire
- `tanh` saturates each tier near ±1, so `rawScore` rarely exceeds ±70 → `score` rarely exceeds 85.
- Candidate: replace tanh with a softer transform (e.g. arctan or piecewise linear) and re-derive thresholds from observed score percentiles, not arbitrary 72/85.

### 13.5 (MEDIUM) Trap detection is heuristic
- Five if-then rules. No statistical test. No learning from outcomes.
- Candidate: fit a logistic regression of `correct ~ trap_features` on `signal_outcomes` and use the predicted P(wrong) as a continuous penalty.

### 13.6 (MEDIUM) The calibrator collapses windows badly
- Median sign across 1h/6h/24h means a strong 6h signal can be vetoed by two noisy 1h windows.
- Candidate: per-window separate sign multiplier; engine consumes the window matching its current dominant tier (T1 ≈ 6h, T2 ≈ 1h, T3 ≈ 24h).

### 13.7 (SMALL) Whale-tx feed is single-source
- Upstream `whale-transactions` is the sole arbiter of BUY/SELL classification. If it mislabels, Sonar inverts.
- Candidate: cross-validate with on-chain DEX trade direction (token0/token1 swap-direction) for DEX flows.

### 13.8 (SMALL) Confidence is noisy
- `tier_disagreement_penalty` and `regime_confidence_penalty` are constants, not learned.
- Confidence ≠ probability — calibrate it (Platt scaling vs realized accuracy in `signal_outcomes`).

### 13.9 (SMALL) No execution model
- A signal is a label, not a position. No size, no holding period (we use 1h/6h/24h post-hoc but never tell the user "hold 6h").
- Candidate: add `recommended_horizon_hours` and `kelly_fraction_at_25%_kelly` to the API.

### 13.10 (TINY) The bullish hide-mute is a sledgehammer
- `HIDE_BULLISH_SIGNALS=true` masks all BUYs in `/api/signals` regardless of regime/breaker. Was a 2026-04 emergency response. Should be retired now that we have the breaker + regime gate.

---

## 14. Today's incident context (2026-05-04 → 2026-05-06)

For the researcher: this is what triggered the most recent layer of safety work.

| Date | Event | Response |
|---|---|---|
| 2026-05-04 10:00 UTC | BUY accuracy started collapsing into a regime turn | Watchdog detected, only alerted (no auto-suppression yet) |
| 2026-05-04 14:18 UTC | Three new commits deployed: deleted static sign map, added hysteresis gate, added LunarCrush 30-min cache | Coincidence in time but not cause |
| 2026-05-04 evening | BUY at 14.8% trailing 6h (>3σ below coinflip) | **Shipped per-direction circuit breaker + watchdog auto-trip** |
| 2026-05-05 | Full mean reversion to 64.8% day acc on the same engine | Confirmed engine not broken; was regime |
| 2026-05-06 morning | BUY regression returned, 19.3% day, 5.1% trailing 6h on n=39 | Breaker didn't auto-trip (n=39 < 40 threshold) |
| 2026-05-06 10:22 UTC | Manual SQL flip of BUY breaker | Suppression effective within 15 min |
| 2026-05-06 ~10:30 UTC | **Tightened breaker: MIN_SAMPLES 40→25, SUPPRESS 30%→35%** | Commit `8f17926` |
| 2026-05-06 ~10:45 UTC | **Shipped regime-graded asymmetric label gate** | Commit `ffcd4d0` |

The pattern: engine emits ~87% BUYs into a bear tape because it has no real regime gate. Old "market beta" block was too weak (capped ±10 score points, threshold > -1% BTC didn't fire). Replaced with the regime classifier + asymmetric thresholds described in §6.

---

## 15. File index (for the researcher)

| Path | Role |
|---|---|
| [`app/lib/signalEngine.ts`](app/lib/signalEngine.ts) | Pure engine (`computeUnifiedSignal`, all 4 tiers, traps, label fn) |
| [`app/lib/technicalAnalysis.ts`](app/lib/technicalAnalysis.ts) | RSI/SMA/Bollinger/ADX + per-token regime |
| [`app/lib/derivativesData.ts`](app/lib/derivativesData.ts) | Funding/L-S/top-trader/taker fetcher |
| [`app/lib/calibration-math.ts`](app/lib/calibration-math.ts) | `pearsonIC`, `bootstrapICConfidenceInterval`, `deriveConfidenceScore` |
| [`lib/quant/constants.ts`](lib/quant/constants.ts) | `NOISE_FLOOR_PCT`, `MIN_N_FOR_TRUST`, `MIN_N_FOR_SIGN`, `ROUND_TRIP_BPS` (single source of truth) |
| [`scripts/lib/quant-constants.cjs`](scripts/lib/quant-constants.cjs) | CJS mirror for scripts |
| [`app/api/cron/compute-signals/route.js`](app/api/cron/compute-signals/route.js) | Engine driver, regime gate, breaker enforcement |
| [`app/api/cron/evaluate-signals/route.js`](app/api/cron/evaluate-signals/route.js) | Outcome writer |
| [`app/api/cron/calibrate-signals/route.js`](app/api/cron/calibrate-signals/route.js) | Daily per-token calibrator |
| [`app/api/cron/accuracy-watchdog/route.ts`](app/api/cron/accuracy-watchdog/route.ts) | Statistical watchdog + breaker upserter |
| [`app/api/cron/fetch-prices/route.js`](app/api/cron/fetch-prices/route.js) | Price snapshot writer |
| [`app/api/cron/cache-derivatives/route.js`](app/api/cron/cache-derivatives/route.js) | Derivatives snapshot writer |
| [`app/api/signals/route.js`](app/api/signals/route.js) | User-facing signal list |
| [`app/api/signals/accuracy/route.js`](app/api/signals/accuracy/route.js) | User-facing stats |
| [`scripts/ic_audit.js`](scripts/ic_audit.js) | Per-token IC audit |
| [`scripts/analyze_signal_distribution.js`](scripts/analyze_signal_distribution.js) | Score × regime distribution |
| [`vercel.json`](vercel.json) | Cron schedule |
| [`/memories/repo/signal-engine.md`](.memories/repo/signal-engine.md) | Audit log of every weight/threshold change with rationale |

---

## 16. Suggested research prompt (template)

> *"You are a quant researcher upgrading the Sonar signal engine. Read [`SIGNALS_PIPELINE_ARCHITECTURE.md`](SIGNALS_PIPELINE_ARCHITECTURE.md) end-to-end. Then answer:*
> *(1) Which of §13's 10 weaknesses would you tackle first to maximize alpha-IC, given that Sonar has 14 days of fresh post-2026-05-04 outcomes available in `signal_outcomes`?*
> *(2) Design the upgrade as a phased plan: each phase must be (a) shippable behind a kill-switch env var, (b) measurable via the existing `signal_outcomes` table, (c) backward-compatible with the engine's pure-function signature.*
> *(3) For Phase 1 specifically, output the exact code diffs for `app/lib/signalEngine.ts` and `app/api/cron/compute-signals/route.js`, plus the SQL for any new tables and the IC-audit script invocation that would prove the upgrade was net-positive after 7 days.*
> *Constraint: do NOT touch `signal_outcomes` schema or `evaluate-signals` logic — those are the audit ground truth and must remain untouched."*

---

*End of architecture doc. ~3,400 words / 16 sections.*
