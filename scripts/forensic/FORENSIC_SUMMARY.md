# Forensic Sweep — Workstream B Summary

**Window:** signals since `2026-05-11T10:00:00Z` (≈2 weeks post Demote-BUY fix).
**Sample:** 5,722 clean 24h `signal_outcomes` (suspect=false, correct not null).
**Joined sample after dropping missing scores:** 1,592 rows.

## Headline Finding

**The engine's composite `score` is anti-predictive at the 24h horizon.**

Spearman ρ(`score`, `alpha_pct_24h`) = **−0.141** across all 1,592 paired signals
(H4 baseline). High score → token *underperforms* benchmark; low score → token
*outperforms*. This is the structural problem the rest of the findings refine.

---

## Verdict Table

| ID  | Hypothesis | Verdict | Headline Number |
|-----|------------|---------|-----------------|
| H1  | Liquidity strata explain SELL loss | **PASS** | SELL α_norm uniform across mcap quintiles (+0.2,−0.0,−0.4,+0.6,+0.4 pp). SELL side is NOT broken by liquidity. |
| H2  | 3-tier sign-agreement gate | **PASS** | Lifts mean α_norm by **11.72 pp** (agree −0.42, disagree −12.14; n_a=348, n_d=1244). |
| H3  | Tier 5 sign flipped post-2026-04-01 | INCONCLUSIVE (data-gap) | `tier5_score` not persisted as a column. |
| H4  | Drop Tier 4 | **KILL** | \|Δρ\|=0.115 > 0.03. T4 carries info — partly *counteracts* broken T1+T2. |
| H5  | Drop Tier 3 | **KILL** | \|Δρ\|=0.141 > 0.03. T3 carries info — same pattern as T4. |
| H6  | Logistic regression on tier features | DEFERRED | Python + sklearn TimeSeriesSplit; calendar-bound. |
| H7  | Empirical percentile bands | INCONCLUSIVE | Only 47 current STRONG_SELL signals — insufficient for benchmarking. |
| H8  | Score saturation in tanh band | **PASS** | Combined STRONG share = **2.97%** < 5% (n=1615). Tanh saturation confirmed. |
| H9  | BUY 24h win-rate CI | **PASS** | win=**5.7%** (n=159), 95% CI=[2.6%, 10.5%]. CI upper < 30% → BUY side statistically broken. Demote is correct. |
| H12 | Stablecoin-vs-native flow sign | INCONCLUSIVE (data-gap) | `tier1_factors` JSONB lacks stablecoin/native breakdown. |

---

## Synthesised Interpretation

Combining H1, H2, H4, H5, H8, H9:

1. **The engine emits two qualitatively different signal types:**
   - **3-tier-agree signals (22% of volume)**: roughly break-even (−0.42 pp).
   - **Mixed-sign signals (78% of volume)**: deeply negative (−12.14 pp).

2. **BUY signals (n=159) win 5.7% at 24h** — far below the ~50% baseline of
   "random direction". The current Demote-BUY action is the right band-aid;
   structural fix needs root-cause work in T1 (CEX whale flow) and T2 (price
   momentum), because dropping T3/T4 (H4/H5 KILL) makes ρ *more* negative,
   meaning T3/T4 are partially absorbing T1/T2's bad signal.

3. **SELL signals are working** (H1 quintile mean −α ≈ 0–0.6 pp ⇒ actual α
   ≈ −0.6 pp = token correctly drops slightly more than benchmark) — except
   they get drowned in the mixed-direction noise that the 3-tier gate would
   filter out.

4. **Score saturation (H8) explains why the engine "rarely commits"** — only
   ~3% of signals reach STRONG bands, so most of the negative alpha lives in
   BUY/SELL bands, not STRONG bands.

---

## Recommended Actions (ranked by leverage × tractability)

### Tier 1 — Implement now

- **A. Add 3-tier-agree gate to compute-signals/route.js** *(H2)*
  When `sign(tier1_score) !== sign(tier2_score) || sign(tier2_score) !== sign(tier3_score)`,
  force `signal = NEUTRAL`. Projected impact: removes 78% of signals; surviving
  22% have mean α_norm ≈ −0.4pp (≈ break-even) vs current ≈ −9pp blended.

### Tier 2 — Investigate before implementing

- **B. Diagnose why ρ(score, alpha) is negative** *(headline finding from H4)*
  Top suspects:
    - sign convention bug in T1 (CEX flow): is `weightedFlowSignal` sign-correct?
      Spec says SELL=inflow=bearish but H1 shows SELL works → flow sign may be OK.
      The negative ρ may be entirely BUY-driven (H9 corroborates).
    - T2 (price momentum) may be trend-following at the wrong horizon
      (chasing already-extended moves). Compare ρ(tier2_score, alpha_24h) split
      by signal_type to isolate.
  Add a 1-line forensic: per-tier Spearman ρ vs alpha — call it H13.

- **C. Land PR-1c: extend tier1_factors with stablecoinShare** *(H12 unblocker)*
  4-week wait then re-run H12 to test whether stablecoin-driven outflows
  carry different forward alpha than native-asset outflows.

### Tier 3 — Backlog

- **D. Add tier5_score column + backfill** *(H3 unblocker)*
- **E. Run H6 logistic regression** once tier5 column exists (≥1 month of data
  on the post-Demote-BUY regime).
- **F. Re-run H7 (empirical bands)** after STRONG_SELL n ≥ 200 accumulates.

---

## What This Tells Us For Workstream C

The negative-ρ finding **invalidates the assumption** that the current engine
is "directionally correct but mis-calibrated". It is *directionally inverted*
on at least the BUY side and possibly elsewhere. Workstream C (new engine) should:

- Not anchor on the current composite formula.
- Treat T1/T2/T3/T4 as candidate features and let H6's logreg pick weights from data.
- Use 3-tier sign-agreement as a strong prior for any direction-emitting model.
- Validate against forward alpha, not historical "correct" labels, since the
  current `correct` flag inherits the broken composition.

---

**Generated:** 2026-05-24
**Scripts:** `scripts/forensic/H{1,2,3,4,5,7,8,9,12}_*.mjs`
**Per-hypothesis JSON:** `scripts/forensic/results/`
**Append-only log:** `scripts/forensic/FINDINGS.md`
