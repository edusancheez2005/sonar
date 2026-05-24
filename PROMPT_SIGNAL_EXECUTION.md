# Sonar Signal Engine — Execution Build Prompt

**Source of truth:** the Opus 4.7 decision memo dated 2026-05-24 (recommendation: Path 4, sequenced 1 → 2 → 3) based on n=4,465 evaluated outcomes since the 2026-05-11 frozen-cache fix.
**Target agent:** an implementation-grade Claude/Copilot session with full repo access.
**Companion docs to attach:** `SONAR_STANCE_2026-05-13.md`, `SIGNAL_PIPELINE_2026-05-13.md`, `PROMPT_SIGNAL_RESEARCH.md`, and the Opus memo itself.
**Author intent:** turn the Opus memo into an executable engineering plan with concrete files, scripts, checkpoints, and pass/kill criteria. Do not redo strategy research. Execute.

---

## 0. Ground truth (do not relitigate)

- **Current accuracy.** Last 13 days, n=4,465, post-fix, suspect=false:
  - 1h BUY n=145 win=42.1% net=−0.24% alpha=−0.17%
  - 1h SELL n=1,212 win=49.3% net=−0.12% alpha=−0.04%
  - 6h BUY n=160 win=31.2% net=−0.82% alpha=−0.75%
  - 6h SELL n=1,311 win=46.8% net=−0.37% alpha=−0.29%
  - 24h BUY n=159 win=**5.0%** net=**−3.80%** alpha=−2.85%
  - 24h SELL n=1,344 win=50.5% net=**−10.65%** alpha=−10.97%
- **Both circuit breakers tripped.** Engine is correctly suppressing all output to NEUTRAL.
- **Regime over the window.** BTC fell ~5.5% ($81k → $76.7k) — a SELL tailwind the engine failed to capture.
- **Verdict.** The composite has no measurable alpha. The 24h SELL number is statistically robust negative edge, not noise. Do not surface BUY/SELL as actionable while this remains true.
- **Resource envelope.** Solo founder. UK student visa. ~$200/mo data budget cap. No GPU. No tick data. Postgres + Vercel cron. Decide-now timeline.

---

## 1. Sequenced execution plan

Execute three workstreams in this exact order. Do not start Workstream B until Workstream A is shipped to production. Workstream C runs in parallel with B from Day 2 onward.

| Workstream | Purpose | Calendar window | Blocking? |
|---|---|---|---|
| **A — Path 1: Demote** | Stop surfacing BUY/SELL as actionable in any UI | Tonight, ≤ 8h | YES — blocks B and C |
| **B — Path 2: Forensic** | Run the 10 cheap hypotheses; produce a defensible diagnosis | Days 2–6 | Non-blocking after A |
| **C — Path 3: Replace (multi-strategy ensemble)** | Build a real quant trading system: B-1 momentum + B-3 Kalman pairs + B-4 PCA residuals, gated by H11 HMM regime filter, sized by inverse-vol weighting | Weeks 1–16 build, weeks 17–28 shadow | Non-blocking, parallel to B |

A decision gate at the end of each workstream determines whether to proceed. Workstream C is the real product — the demote and the forensic exist to make C honest.

---

## 2. Workstream A — Demote signals tonight (Path 1)

### 2.1 Scope
Strip every UI surface and every API response of language that implies BUY/SELL is actionable. Replace with neutral "context" framing. Keep the underlying engine running (it's already self-suppressed by the breakers) so data collection continues for Workstream B.

### 2.2 Concrete changes

**Discovery step (do first, ~30 min):**
- Run a repo-wide grep for: `STRONG BUY`, `STRONG SELL`, `BUY signal`, `SELL signal`, `win rate`, `accuracy`, `signal_label`, `BUY`, `SELL` (case-sensitive). Produce a file list before editing.
- Identify every component that renders `token_signals.signal` to the user.
- Identify every API route under `app/api/` that returns `signal` or `signal_label` in its payload.

**Edit pattern (apply consistently):**
- Replace user-facing labels:
  - `STRONG BUY` / `BUY` → `BULLISH context`
  - `STRONG SELL` / `SELL` → `BEARISH context`
  - `NEUTRAL` → `NEUTRAL`
- Strip all "win rate", "accuracy %", "expected return", "X% historical win" copy. Do not replace; delete.
- Add a small `experimental` badge to every signal-derived UI element. Tailwind class: `inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded bg-amber-500/10 text-amber-600 border border-amber-500/20 uppercase tracking-wide`.
- Add a methodology tooltip on every signal element with this exact copy: *"Sonar's composite aggregates whale flow, momentum, derivatives positioning, and sentiment into a contextual score. It is a research tool, not investment advice. Historical accuracy has been mixed; use as input to your own analysis, not as a trade trigger."*
- API responses: keep the `signal` field for backward compat, add a `display_label` field with the BULLISH/NEUTRAL/BEARISH mapping, and add `"actionable": false` to every signal object.

**Asymmetry rule:** demote BUY and SELL together. Do not demote SELL only. Opus memo §4 explicitly: asymmetric demotion is a worse UI story than full demotion.

### 2.3 ORCA copy change
Wherever ORCA currently says "Sonar recommends X" or "Signal: BUY", change to: *"Current composite context for {token}: {BULLISH|NEUTRAL|BEARISH}. Three reasons the score is what it is: [...]. Three reasons it could be wrong: [...]."* Pull these from existing `top_factors` and add a "counter-evidence" generation step using the tier sub-scores that disagree with the composite direction.

### 2.4 Files likely to touch
Use the discovery grep to confirm, but expect changes in roughly:
- `app/components/` — signal chips, dashboard cards, token detail panels
- `app/dashboard/` — main signal display
- `app/token/[symbol]/` — token detail page
- `app/api/signals/route.{ts,js}` and any other route returning signals
- `components/orca/` — ORCA prompt builder
- `lib/orca/system-prompt.ts` — already-modified ORCA system prompt
- Marketing pages: `app/page.jsx`, `app/HomeClient.jsx`, `README.md`, hero copy that promises "AI signals with X% accuracy"

### 2.5 Pre-deploy checklist
- [ ] `npm run build` passes.
- [ ] Manual smoke test: load `/dashboard`, `/token/BTC`, `/token/SOL`, `/whales`, `/`. No BUY/SELL words visible. No win-rate numbers visible. Every signal element has the experimental badge.
- [ ] ORCA: ask "should I buy BTC?" → response uses BULLISH/BEARISH framing and lists counter-evidence.
- [ ] API: `curl /api/signals` returns `display_label` and `actionable: false`.
- [ ] Git: commit on `feat/signal-demote-2026-05-24`. PR title: `feat: demote signals to non-actionable context (Path 1)`. Body links the Opus memo.
- [ ] Deploy to Vercel. Verify on production.

### 2.6 Decision gate A
**Pass condition:** all of the above ship cleanly. Proceed to B and C.
**Kill condition:** none — Workstream A is non-optional.

---

## 3. Workstream B — 5-day forensic sweep (Path 2)

### 3.1 Setup
Create `scripts/forensic/` directory. All scripts in this workstream must:
- Load `.env.local` via the established PowerShell loader pattern (see `repo memory: signal-engine`).
- Query Supabase via PostgREST with `Range` header pagination (NOT `?limit=` — postgrest caps at 1000).
- Filter: `signal_time >= '2026-05-11T10:00:00Z'`, `suspect = false`, `correct IS NOT NULL`.
- Write results to `scripts/forensic/results/HX_<name>.json` and append a one-line markdown summary to `scripts/forensic/FINDINGS.md`.

### 3.2 Hypothesis execution order
Run in this order. Each script must print PASS / KILL / INCONCLUSIVE according to the criteria in the Opus memo §3.

| # | Hypothesis | File | Est. hours | Pass criterion | Kill criterion |
|---|---|---|---|---|---|
| H8 | STRONG bands almost never fire (tanh saturation) | `H8_band_distribution.mjs` | 0.25 | STRONG_* combined share < 5% | > 15% |
| H4 | Tier 4 contributes ~zero info | `H4_drop_tier4.mjs` | 1 | composite-Δρ vs net_24h \|<\| 0.01 | > 0.03 |
| H5 | Tier 3 contributes ~zero info | `H5_drop_tier3.mjs` | 1 | Δ net_return < 10 bps | > 30 bps |
| H1 | 24h SELL loss concentrated in illiquid tokens | `H1_liquidity_strata.mjs` | 2 | top 2 vol quintiles AVG(net) > −200 bps | all quintiles within 200 bps AND all < −500 bps |
| H9 | 24h BUY 5% win rate has CI excluding ≥30% | `H9_buy_24h_ci.mjs` | 0.5 | exact binomial 95% CI upper < 30% | CI includes ≥ 40% |
| H2 | 3-tier sign-agreement filter removes worst SELLs | `H2_three_tier_gate.mjs` | 3 | three_agree=1 AVG(net) ≥ 500 bps better than three_agree=0 | diff < 100 bps |
| H3 | Tier 5 flipped sign post-2026-04-01 | `H3_tier5_sign_flip.mjs` | 1 | \|ρ_pre − ρ_post\| > 0.2 with sign flip | < 0.05 |
| H7 | Empirical bands lift STRONG-band performance | `H7_empirical_bands.mjs` | 3 | STRONG_SELL_new mean ≥ 300 bps better AND n ≥ 100 | no improvement |
| H6 | L2 logistic regression beats hand-tuned weights | `H6_logreg.py` | 6 | 5-fold CV McFadden R² ≥ 0.02 better than hand-tuned | learned R² ≤ hand-tuned |
| H12 | Tier 1 reads stablecoin flows with wrong sign | `H12_stablecoin_sign.mjs` | 4 | sign flip between stablecoin and native-coin strata | same sign |

**Note on H6:** Python script. Use `pandas`, `scikit-learn`, `statsmodels`. The `.venv` is already activated. Features = `[t1_raw, t2_raw, t3_raw, t4_raw, t5_raw]`. Target = `correct` (binary). 5-fold time-series CV (TimeSeriesSplit, not KFold). Compare McFadden pseudo-R² of learned LogisticRegression(penalty='l2', C=1.0) vs the implied logistic of the hand-tuned composite mapped through identity. Save coefficients to `scripts/forensic/results/H6_learned_weights.json`.

### 3.3 Day-by-day allocation

- **Day 2 (morning):** H8, H4, H5, H9 — all four are <1.5h each. Most likely outcome: delete T3 and T4.
- **Day 2 (afternoon):** H1 + H2.
- **Day 3 (morning):** H3 + H7.
- **Day 3 (afternoon) + Day 4:** H6 logistic regression. Most diagnostically valuable.
- **Day 5:** H12 if budget remains. Otherwise: write `FINDINGS_SUMMARY.md` aggregating all H-results.

Skipped from the memo's original 15: H10, H11, H13, H14, H15. Reasons:
- H10 is the B-1 backtest itself — belongs in Workstream C.
- H11, H13 require regime/vol labelling work — defer to post-forensic if Workstream C falls through.
- H14 confirms what we already know (the fix moved magnitudes). Low marginal value.
- H15 (signal-vs-momentum agreement) is implicitly answered by H6 + Workstream C.

### 3.4 Decision gate B (end of Day 6)
Aggregate findings into `scripts/forensic/FINDINGS_SUMMARY.md` with these explicit decisions:
- **Delete from engine** (tiers whose H-test PASSED their "drop" criterion): list.
- **Recalibrate** (bands, weights — items whose H-test PASSED): list.
- **No-fix-found** (items whose H-test KILLED): list.

**Pass condition:** at least one repair lifts 24h SELL net from −10.65% to better than −5%. → Permanent demote stays, repaired engine becomes background "context" feature.
**Kill condition:** no repair gets 24h SELL net above −5%. → Engine is structurally broken. Demote is permanent. All hope rides on Workstream C.

Either way, the diagnosis is the deliverable. Do not retreat from the demote.

---

## 4. Workstream C — Build the SONAR multi-strategy quant ensemble (Path 3)

### 4.0 Why an ensemble, not a single strategy
A single strategy at net Sharpe ~0.8 is good. Three uncorrelated strategies at net Sharpe ~0.7 each, equal-risk-weighted, target portfolio Sharpe ~1.2–1.4 with materially lower drawdowns. That is what a credible "AI signals" product looks like in 2026 — not a magic predictor, but a disciplined multi-strategy book with measured live performance and an HMM regime gate that turns it off when the market becomes pathological.

This is the **real product**. The demote (Workstream A) and the forensic (Workstream B) exist so the founder can ship Workstream C with intellectual honesty.

### 4.1 The four strategies

**S-1: SONAR-CSM-1W — Cross-Sectional 7-Day Momentum**
- Universe: top 30 Sonar tokens by trailing 30d median Binance USDT spot volume.
- Long top 6 by trailing-7d return, short bottom 6 (USDT-M futures), equal-weighted within each leg.
- Weekly rebalance, Monday 00:00 UTC.
- Citation: Borri/Liu/Tsyvinski/Wu (2025), arXiv 2510.14435v4, Table 2 Panel B. Weekly long-short +2.1%, t=3.70 in post-2020 subsample.
- Expected net Sharpe: 0.6–1.0. Capacity: low millions.

**S-2: SONAR-KPAIRS — Kalman Filter Pairs Trading**
- Pairs: ETH/BTC, SOL/ETH, BNB/BTC (3 cointegrated majors). Run cointegration ADF test on 90d window monthly; drop any pair whose p > 0.05.
- Kalman filter time-varying hedge ratio (state-space model on log prices). Standard deviation bands ±2σ on the spread residual.
- Entry: spread > +2σ → short the rich leg, long the cheap leg. Exit at spread = 0 or stop at ±3.5σ.
- Position sizing: vol-targeted at 8% annualised per pair.
- Citation: Roshan (2023), Medium; classic Engle-Granger / Vidyamurthy pairs framework adapted with Kalman per Hamilton (1994) State-Space Models.
- Expected net Sharpe: 0.6–1.2 (PRIOR — confirmed by S-2 backtest). Capacity: very high.

**S-3: SONAR-PCA-RES — PCA Factor-Neutral Residual Mean-Reversion**
- Universe: top 25 Sonar tokens by 30d median volume.
- Daily, compute 60d rolling PCA on log returns; first 3 components ≈ market / size / momentum factors.
- For each token: residual = actual_return − projection_onto_first_3_PCs. Z-score residual over rolling 20d.
- Entry: |z| > 1.5 → short positive residuals (rich), long negative residuals (cheap). Beta-neutral basket.
- Daily rebalance. Hold time 2–5 days average.
- Citation: Avellaneda & Lee (2010), "Statistical Arbitrage in the U.S. Equities Market," Quantitative Finance 10(7), adapted to crypto.
- Expected net Sharpe: 0.5–1.0. Capacity: low-mid millions.

**S-4: HMM-GATE — 2-State Regime Filter (meta-layer, not a standalone strategy)**
- Fit `hmmlearn.GaussianHMM(n_components=2)` on BTC 1h log-returns, refit weekly on rolling 180d window.
- Decode each 1h observation into "low-vol trending" vs "high-vol jumpy" state.
- Gate rule: if current state = high-vol-jumpy AND realised 24h vol > 80% annualised → halve all S-1/S-2/S-3 position sizes for the next 24h. Full kill switch if both conditions hold AND BTC drawdown > 8% in last 48h.
- Citation: Machimbo et al. (2025), Asian J. Probability & Statistics; Hamilton (1989) regime-switching framework.
- Expected lift: +0.2–0.4 to ensemble Sharpe (PRIOR), mostly by avoiding the worst drawdown weeks.

### 4.2 Portfolio construction (the ensemble layer)

After each strategy is independently validated (per its decision gate), combine into a single portfolio:

- **Risk weights:** inverse of trailing 60d realised vol of each strategy's PnL series, normalised. Rebalance monthly.
- **Net leverage cap:** 1.0× (no leverage in v1). Strategies are zero-beta long-short by construction, so gross leverage will be ~2.0× but net dollar exposure stays near zero.
- **HMM gate** applied as size multiplier on top of risk weights.
- **Daily PnL writeup:** one row per strategy per day to a new `strategy_outcomes` table for live attribution.

### 4.3 Build phases — calendar

This is a 16-week build to first promotion-eligible state, then 8–12 weeks of live paper-shadow before any strategy goes actionable in the UI. ~24–28 weeks total.

| Phase | Weeks | Workstreams running |
|---|---|---|
| **C-1: Data infrastructure** | 1–2 | Build a unified `lib/quant/data_loader.py` that pulls + caches Binance spot 1h OHLCV (free), Binance USDT-M futures funding (free), and writes Parquet to `scripts/quant/data/`. Universe selection script (top-30 by 30d volume, refreshed monthly). |
| **C-2: S-1 backtest** | 3–4 | `scripts/quant/strategies/csm_1w.py` + `scripts/quant/backtests/run_csm_1w.py`. Period: 2024-01-01 → 2026-05-01. Output: equity curve, Sharpe, MDD, turnover, tear sheet. Decision gate C-2 below. |
| **C-3: S-2 backtest** | 5–7 | `scripts/quant/strategies/kpairs.py` using `pykalman`. Cointegration test, Kalman state estimation, spread z-score, entry/exit. Same backtest harness. Decision gate C-3 below. |
| **C-4: S-3 backtest** | 8–10 | `scripts/quant/strategies/pca_res.py`. Rolling PCA, residual z-score, beta-neutral basket construction. Same harness. Decision gate C-4 below. |
| **C-5: S-4 HMM gate** | 11–12 | `scripts/quant/strategies/hmm_gate.py`. Fit on BTC log-returns, validate state stability. Backtest the gate **on each surviving S-1/S-2/S-3 strategy** — must show Sharpe lift or MDD reduction to keep. |
| **C-6: Ensemble construction** | 13 | `scripts/quant/portfolio/ensemble.py`. Risk-weighted combination of surviving strategies. Full backtest 2024-01-01 → 2026-05-01 with gate applied. Tear sheet for the **portfolio**, not each strategy. |
| **C-7: Walk-forward + out-of-sample test** | 14 | Refit walk-forward (12-month train / 3-month test rolling). Confirm Sharpe holds out-of-sample. **This is the hardest test** — most backtests die here. |
| **C-8: Live shadow infrastructure** | 15–16 | Supabase migration: `strategy_outcomes` table. Vercel cron routes per strategy. Internal-only `/quant` dashboard gated to `ADMIN_EMAILS`. Each cron writes its decisions live but executes nothing. |
| **C-9: Paper shadow** | 17–28 | 8–12 weeks of live shadow. Track live-vs-backtest Sharpe and tracking error weekly. Single decision gate at end. |
| **C-10: Promotion** | 29+ | If gate passes, promote to ORCA-integrated actionable recommendations with full citation and live performance disclosure. |

### 4.4 Decision gates

Each strategy has its own gate. Strategies that fail their gate are killed, not "tweaked until they pass" (that's overfitting).

**Gate C-2 (S-1 momentum, end of week 4):**
- PASS: net annualised Sharpe ≥ 0.6 AND max drawdown ≤ 30% AND positive in both 2024 and 2025 sub-samples.
- KILL: net Sharpe < 0.3 OR MDD > 50% OR sign-flips between sub-samples.

**Gate C-3 (S-2 Kalman pairs, end of week 7):**
- PASS: net Sharpe ≥ 0.5 AND MDD ≤ 25% AND at least 2 of 3 pairs remain cointegrated through the full window.
- KILL: net Sharpe < 0.2 OR cointegration fails on majority of pairs.

**Gate C-4 (S-3 PCA residuals, end of week 10):**
- PASS: net Sharpe ≥ 0.5 AND MDD ≤ 25% AND average hold time ≥ 2 days (turnover not eating fees).
- KILL: net Sharpe < 0.2 OR turnover so high fees > 50% of gross return.

**Gate C-5 (HMM gate, end of week 12):**
- PASS: applying the gate to surviving strategies lifts ensemble Sharpe by ≥ 0.15 OR reduces MDD by ≥ 20%.
- KILL: no improvement. Drop the gate, keep the underlying strategies.

**Gate C-7 (walk-forward, end of week 14):**
- PASS: out-of-sample Sharpe ≥ 70% of in-sample Sharpe for the ensemble. This is the discipline gate.
- KILL: OOS Sharpe < 50% of IS — system is overfit, do not deploy.

**Gate C-9 (live shadow, end of week 28):**
- PROMOTE: live Sharpe within 50% of backtest Sharpe AND live MDD within 1.5× backtest MDD AND ≥ 8 weeks of data.
- EXTEND: tracking is OK but < 8 weeks. Continue shadow.
- KILL: live diverges > 50% from backtest. Investigate; do not promote.

### 4.5 Survival math
Realistic outcome: 2 of 3 strategies survive Gate C-2/3/4. Walk-forward kills another ~30% of survivors. **Base rate expectation: 1–2 strategies make it to live shadow.** If zero survive, the verdict is "the academic edges have decayed enough in your specific universe and timeframe that even disciplined replication doesn't work" — at which point Sonar permanently demotes signals and pivots to whale-tracker-first positioning. That outcome is also acceptable and is itself a credible YC narrative.

### 4.6 What "promoted" looks like in the UI
Once any strategy passes Gate C-9:
- New section in dashboard: "SONAR Quant Strategies (live)."
- Per strategy: current positions, live Sharpe (rolling 8w and inception-to-date), live MDD, tracking error vs backtest, citation link.
- ORCA: when asked "should I buy X?", ORCA reports (i) X's current weight across all live strategies, (ii) which strategy is long/short/neutral on X and why, (iii) the strategy's live Sharpe and confidence interval, (iv) the cited paper.
- Marketing copy: *"SONAR runs N peer-reviewed quantitative strategies live. Current ensemble Sharpe (last 90 days): X.XX. Max drawdown: Y.Y%. Methodology and live performance: [link]."* Honest, defensible, hard for competitors to copy without doing the work.

---

## 5. Cross-cutting requirements (apply to every workstream)

1. **Cache discipline.** Every `fetch()` in any signal-affecting route must include `{ cache: 'no-store', next: { revalidate: 0 } }`. See `/memories/repo/signal-engine.md`.
2. **Quarantine, never delete.** Any anomalous outcome row: set `suspect=true, suspect_reason='...'`. Never `DELETE FROM signal_outcomes` or `momentum_outcomes`.
3. **Pagination.** All Supabase PostgREST reads above 1,000 rows must use the `Range` header batch pattern (see Workstream B §3.1).
4. **Honesty.** No commit message, no code comment, no UI string may claim measured edge that does not exist. If unsure, default to "experimental, not investment advice."
5. **Visa-safe.** No paid acquisition, no commercial-trading services, no "money managed" language. SONAR-CSM-1W is a research/educational shadow until the founder's status changes.
6. **Audit.** After each workstream, run `node scripts/audit-pipeline-health.mjs`. All 7 checks must remain ✅ PASS (breaker-tripped is expected, not a failure).

---

## 6. What success looks like

By end of week 28 the founder has:
1. A live production UI with no actionable BUY/SELL surface anywhere — the legacy composite is honestly framed as research context.
2. A signed-off `FINDINGS_SUMMARY.md` saying which tiers were deleted, recalibrated, or unsalvageable — the engine's autopsy.
3. **The SONAR multi-strategy ensemble** running live in shadow: 1–3 surviving strategies (S-1 momentum / S-2 Kalman pairs / S-3 PCA residuals) optionally gated by S-4 HMM regime filter, with ≥ 8 weeks of measured live performance.
4. A `/quant` dashboard surfacing live Sharpe, drawdown, current positions, and tracking error vs backtest.
5. An ORCA narrative that lands cleanly for any investor conversation: *"We discovered our original signal heuristic had no measured alpha. We demoted it within 48 hours, ran a 5-day forensic, then spent 16 weeks building a peer-reviewed multi-strategy quant ensemble. The system has been running live in shadow for 8+ weeks at an ensemble Sharpe of X.XX with max drawdown Y%. Methodology and live performance are public. ORCA is the explanation layer; the strategies are the substrate."*

## 6.1 Honest probability table

| Outcome at week 28 | Subjective probability | What it means |
|---|---|---|
| All 3 strategies survive backtest, walk-forward, and shadow | ~10% | Best case. Promote ensemble. Real product. |
| 2 of 3 survive shadow | ~25% | Good case. Promote ensemble of 2. Still real product. |
| 1 of 3 survives shadow | ~30% | Acceptable. Promote single strategy. Modest product. |
| 0 survive | ~25% | Verdict: published edges have decayed in this universe. Signals stay demoted permanently. Pivot product narrative fully to ORCA + whale-tracking. |
| Walk-forward never passes (overfit kill) | ~10% | Same as 0-survive: permanent demote. |

Combined: ~65% chance at least one strategy makes it to live promotion. This is dramatically better odds than "fix the existing composite," which is ~0%. It is dramatically worse odds than "build a magic bot," which is 0% for everyone, including hedge funds.

---

## 7. What this prompt is NOT

- Not a research prompt. The research is done. This is an execution spec.
- Not a permission slip to relitigate Path 1 vs Path 2 vs Path 3. Path 4 sequenced is the verdict.
- Not a license to build any Tier-C ML strategy (transformers, RL, GANs). Opus explicitly killed those for this resource envelope.
- Not a license to upgrade to Glassnode Professional or Kaiko. Budget cap is $200/mo; CryptoQuant Advanced ($29) + Tardis.dev pay-as-you-go is the maximum spend, and only if Workstream B finding H12 says the stablecoin sign-correction is worth chasing.

---

## 8. First action

**Begin Workstream A discovery grep now.** Output the file list before touching a single line of code. The first commit on `feat/signal-demote-2026-05-24` must be a `DEMOTE_SCOPE.md` artifact enumerating every file and line that needs to change. That file is the contract for the rest of the workstream.
