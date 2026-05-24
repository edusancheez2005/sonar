#!/usr/bin/env node
/**
 * H12 — Tier 1 reads stablecoin flows with wrong sign
 *
 * Hypothesis: when the whale transaction's token is a stablecoin (USDT,
 * USDC, DAI, etc.), the Tier 1 net-flow → directional-bias mapping has the
 * opposite sign vs the native-coin case. A stablecoin INFLOW to a CEX is
 * bearish (deposits to sell), while a native-coin INFLOW to a CEX is also
 * bearish — but the engine may currently treat them symmetrically as
 * BULLISH on the "net flow" axis without accounting for asset class.
 *
 * Method:
 *   1. Join signal_outcomes to token_signals.tier1_factors (JSONB; carries
 *      stablecoin vs native segmentation in dexBuyVol/dexSellVol fields per
 *      repo memory: signal-engine 2026-04-30 fix).
 *   2. Stratify by whether the underlying signal's primary flow asset was
 *      stablecoin or native.
 *   3. Compute Spearman ρ(tier1_score → alpha_24h) per stratum.
 *
 * PASS: stable-stratum ρ and native-stratum ρ have OPPOSITE SIGNS (clear
 *        mis-routing). Add `flow_asset_class` term to T1.
 * KILL: same sign in both strata → T1 sign convention is OK; the broken
 *        signal lives elsewhere.
 * INCONCLUSIVE: one stratum n < 100.
 *
 * STATUS: STUB. Need to first inspect what tier1_factors actually carries
 * per-token in production — the schema isn't 1:1 with the codepath comments.
 *
 * Read-only.
 */

console.error('[H12] STUB')
process.exit(2)
