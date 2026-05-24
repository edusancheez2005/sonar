#!/usr/bin/env node
/**
 * H1 — 24h SELL loss is concentrated in illiquid tokens
 *
 * Hypothesis: the −10.65% headline 24h SELL net loss is driven by the
 * bottom 1–2 liquidity quintiles. The top 2 volume quintiles' SELL net
 * is actually viable.
 *
 * Method:
 *   1. Pull all 24h SELL outcomes (suspect=false, correct not null) joined
 *      to a 30d trailing avg dollar-volume estimate per token. Sources for
 *      volume:
 *         a. coingecko_market_snapshots if it exists; OR
 *         b. token_signals.market_cap as a proxy (coarser).
 *   2. Bucket tokens into 5 volume quintiles.
 *   3. Compute AVG(price_change_pct - btc_change_pct) per quintile for
 *      signal_type IN ('SELL','STRONG SELL').
 *   4. Compute the same for AVG(price_change_pct) (raw, for comparison).
 *
 * PASS: top 2 volume quintiles AVG(alpha) > −200 bps  → liquidity-strata fix
 *        is viable; restrict SELL emission to top-2 quintiles.
 * KILL: all 5 quintiles within ±200 bps of each other AND all < −500 bps
 *        → SELL is uniformly broken, not a liquidity effect.
 * INCONCLUSIVE: anything in between, or n_per_quintile < 30.
 *
 * STATUS: STUB. Largest open question: which table carries trailing volume?
 * Inspect schema before implementing.
 *
 * Read-only.
 */

console.error('[H1] STUB — pick volume source first, then implement')
process.exit(2)
