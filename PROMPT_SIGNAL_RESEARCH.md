# Deep Research Prompt — Make Sonar's Signals Actually Real

**Target model:** Claude Opus 4.7 (or any large reasoning model with strong quantitative finance familiarity).
**Companion docs to attach:** `SONAR_STANCE_2026-05-13.md` and `SIGNAL_PIPELINE_2026-05-13.md`.
**Author intent:** Get a rigorous, evidence-backed plan for turning Sonar's signal engine from a heuristic with no measured edge into something that genuinely produces alpha — or, if no such plan is realistic at the founder's resource level, an explicit recommendation to demote signals to a non-actionable feature.

---

## Read this first
Two documents are attached.
- `SONAR_STANCE_2026-05-13.md` — full product context, including resource constraints (solo founder, ~$1k spent, UK student visa).
- `SIGNAL_PIPELINE_2026-05-13.md` — complete math and architecture of the current engine, including the honest measured performance table showing no positive alpha at any horizon on either side (post-2026-05-11 clean data, n=966).

Internalize the constraints. The honest baseline is:
- 4-tier hand-tuned linear weighted composite.
- ~95 token universe.
- Free Binance + Coinbase + CoinGecko + LunarCrush + free chain RPCs (Helius/Alchemy paid for chain data, not for derivatives).
- Postgres + Vercel cron infrastructure (no GPU, no tick-data feed, no co-location).
- Solo developer time. No quant team. No PhD.
- Currently logs every signal forward into `signal_outcomes` with 1h/6h/24h evals and `suspect` quarantine flags.

Do not propose strategies that require infrastructure or expertise the founder doesn't have unless you also explicitly justify the cost/benefit of acquiring it.

---

## Your task
Produce a research report structured into the four phases below. Be empirical and skeptical. Every "edge" claim must be testable against the existing `signal_outcomes` data.

---

## Phase 1 — Diagnose the current engine

Using only the `SIGNAL_PIPELINE_2026-05-13.md` document and the measured PnL table within it:

1. **What does the measured performance imply about each tier?**
   - For each of T1 (CEX whale flow), T2 (momentum + volume), T3 (sentiment), T4 (on-chain activity), T5 (derivatives), produce a falsifiable hypothesis for whether that tier individually has, has not, or is irrelevant to producing alpha. Note where the data is too thin to conclude.
   - Highlight any tier whose contribution is most likely *negative* (subtracting from composite alpha rather than adding).

2. **What does the 24h SELL "64% win, −22% net" pattern tell us about the engine's risk profile?**
   - Diagnose this as a known finance phenomenon. Name it precisely (e.g. short-vol payoff, picking up nickels in front of a steamroller, etc.).
   - Recommend the specific structural fix (sizing, stops, exclusions) that would address it.

3. **List the top 5 weaknesses in the engine's design** that are most likely responsible for the lack of edge, ranked by suspected severity. For each, propose a falsifiable test.

4. **List 3 things that look like bugs but are probably actually design choices** the founder should understand the tradeoff on (e.g. arbitrary band thresholds, tanh saturation in tier composition, hand-tuned weights).

---

## Phase 2 — Tiered improvement roadmap

Produce a tiered roadmap with explicit cost/benefit honesty.

### Tier A — "Repair" (days of work, cheap, no new data feeds, plausibly converts -17bps to ~0bps)
For each item:
- The improvement and exact mechanism.
- Where in the pipeline (which file/section in `SIGNAL_PIPELINE_2026-05-13.md`) it changes.
- Estimated solo-founder time to implement.
- Most likely PnL impact range (be honest — many "obvious" fixes have zero impact in real markets).
- The specific test against `signal_outcomes` that would validate or kill the hypothesis before shipping.

Candidate items to evaluate (you may add others):
- Volume confirmation gate (require 1h volume ≥ 1.5× 20h average before non-NEUTRAL emission).
- Regime filter (refuse to fire non-NEUTRAL when 24h ATR / 7d ATR is in bottom quartile = chop).
- Composite-confidence gate (only emit when ≥3 tiers agree on direction).
- Empirical band recalibration (set STRONG/regular/NEUTRAL bands as percentiles of observed score distribution rather than 28/42/58/72).
- Logistic regression on observed outcomes to learn tier weights.
- Per-token learned weights (not a single global weight set).
- Drop Tier 4 entirely (likely zero or negative contribution).
- Position-sizing layer (Kelly-fractional based on confidence) for the SELL tail-risk problem.
- Time-of-day / weekend conditioning.
- Excluding low-liquidity tokens from emissions (focus on top 30 by 30d volume).

### Tier B — "Real strategies" (weeks of work, plausibly real edge)
For each, document:
- The strategy in formal terms (what positions, what universe, what rebalance, what sizing, what risk control).
- Academic or practitioner reference(s) if any (cite specific papers / blog posts).
- Reasonable Sharpe expectation in crypto majors (cite source).
- Capacity (in $ AUM) before the strategy degrades.
- Data feeds required (and whether Sonar already has them).
- Why this strategy specifically fits or doesn't fit Sonar's data + cron + Postgres setup.
- Validation plan: how you'd run it offline against `signal_outcomes` or `price_snapshots` before going live.
- Estimated solo-founder time to ship as a working strategy (not just a research notebook).

Candidate strategies to evaluate (you may add others):
- **Cross-sectional 1-day reversal** on liquid majors (rank top/bottom decile of 1d returns, beta-neutral basket, daily rebalance).
- **Funding-rate carry** (long perps with deeply negative funding, short perps with deeply positive funding, neutralized).
- **Kalman filter pairs trading** on cointegrated majors (ETH/BTC, SOL/ETH).
- **PCA factor-neutral long/short** on a 20-30 token panel (decompose returns into market/size/momentum, trade residuals).
- **Volatility risk premium** in BTC/ETH options (sell strangles, hedge with futures) — flag if data feed barriers make this infeasible.
- **HMM regime gating** as a meta-layer over the existing heuristic (don't replace the heuristic, just gate when it's allowed to fire).
- **CEX flow + funding combination** — combine Tier 1 with funding-rate sign to filter false flow signals.

### Tier C — "ML-flavored" (months of work, mostly noise unless done seriously)
For each, document:
- What it actually is (not the hype version).
- Why it's hard.
- Specific failure modes the founder will hit.
- The minimum infrastructure cost to even attempt it (e.g. tick data feed at $1-3k/mo, GPU at $X, ML engineer hire).
- The honest probability that solo-founder execution beats Tier B alternatives.
- Recommendation: pursue, defer, or kill outright.

Candidates: VPIN order-flow toxicity, transformer-based price models, RL execution agents, GAN-based synthetic data augmentation, deep RL portfolio optimization, on-chain-LLM hybrid signals.

---

## Phase 3 — Prioritized testable hypotheses

Output a single ordered list of 10-15 testable hypotheses, ranked by expected information value per unit of solo-founder time. For each hypothesis:

```
HYPOTHESIS: [one sentence]
TEST: [exact SQL / Python procedure against signal_outcomes or price_snapshots]
PASS CRITERION: [the specific number / p-value that would mean "ship it"]
KILL CRITERION: [the specific number that would mean "abandon"]
ESTIMATED HOURS: [solo-founder time for the test]
IF PASS, NEXT STEP: [what gets built]
IF FAIL, WHAT WE LEARN: [the negative result still has to be useful]
```

The point: produce a research backlog the founder can grind through one item at a time without needing further LLM consultation.

Hypotheses should include both repair-tier (Phase 2A) and strategy-tier (Phase 2B) items. Include at least 3 hypotheses whose pass condition is "this part of the engine should be deleted."

---

## Phase 4 — Verdict and roadmap

Make a clear recommendation in the form:

### Path 1: Demote signals to a non-actionable feature
Conditions under which this is the right call. Specific UI/copy changes (replace BUY/SELL labels with neutral momentum chips, remove win-rate language, add methodology page). Time to ship: ~1 week.

### Path 2: Repair only (Tier A items)
Conditions under which this is the right call. The 3-5 items that have the highest expected value. Time to ship: ~3-4 weeks. Expected outcome: −17bps → ~flat alpha.

### Path 3: Replace with a real strategy
The single strategy from Tier B you'd recommend the founder build first, with full justification for why that one. Time to first version: ~2-4 weeks. Validation plan before going live: ~1-2 weeks of offline backtesting against price_snapshots / signal_outcomes.

### Path 4: Some combination of the above
The specific combination, in execution order.

State your recommendation clearly. The founder will respect "I recommend Path 1 because the data shows the heuristic has no edge and the founder doesn't have the time/capital to build real strategies in the 6-month window" more than they will respect "all paths have merit."

---

## Cross-cutting requirements

- **Every claim about edge must be testable against the existing `signal_outcomes` schema** (or `price_snapshots` for strategies that don't depend on the existing engine output). The schema is in `SIGNAL_PIPELINE_2026-05-13.md` §5 and §8.
- **Honor the LLM strategy-research bias warnings:** LLMs systematically describe edges that don't survive fees and out-of-sample testing. Cite published research where possible. Flag any claim where you're inferring rather than citing.
- **Quantify expected Sharpe / expected alpha in basis points wherever possible** — not "this would help" but "in published crypto literature this strategy returns ~X% annualized net of fees with Sharpe ~Y, capacity ~$Z."
- **Acknowledge negative results:** if cross-sectional reversal in crypto only worked 2018-2021 and has been arbitraged out since 2023, say so.
- **Account for the 10bps round-trip fee assumption used in the existing PnL table.** Crypto fees are higher than equities; many academic strategies don't survive transition.
- **Account for funding costs and slippage** in any leveraged or perp strategy.

---

## Output format
Single deep-research document, ~8,000-12,000 words, with:
- Clear phase headers (Phase 1 / 2A / 2B / 2C / 3 / 4).
- Tables for comparative content.
- Code blocks for any SQL or pseudocode.
- Citations as inline links to academic papers, practitioner blogs, or competitor whitepapers.
- A "what I am uncertain about and what would change my recommendation" section at the end.

## Tone
- Quant-rigorous. No hype.
- Treat the founder as technically literate but not a quant PhD.
- Default to skepticism — assume any edge claim is wrong until proven by data.
- Where you're using your prior rather than evidence, label it explicitly: "PRIOR (not evidence-backed)".

## What success looks like for this prompt
The founder finishes reading and knows:
1. Whether the current engine is fixable in the founder's resource window (yes / no / partly).
2. Which 3-5 specific tests to run this week to make that decision empirically.
3. The single best replacement strategy if "fix" fails, with a buildable spec.
4. The exact moment they should give up on signals as a product feature and demote them.

The unhelpful outcome is "there are many promising avenues to explore" — do not produce that.
