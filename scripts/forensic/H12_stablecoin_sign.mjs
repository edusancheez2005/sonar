#!/usr/bin/env node
/**
 * H12 — Stablecoin-vs-native flow sign asymmetry
 *
 * Hypothesis: SELL signals driven by stablecoin outflows have different
 * forward-alpha behaviour than SELL signals driven by native-asset outflows
 * (e.g. WBTC, WETH flows out of CEX).
 *
 * DATA-GAP FINDING:
 *   token_signals.tier1_factors JSONB contains aggregate flow metrics
 *   (buys, sells, buyVol, sellVol, netFlow, cexBuyVol, cexSellVol,
 *    weightedFlowSignal, velocitySignal, volumeChangeVsPrev,
 *    largeTxBuyVol, largeTxSellVol, uniqueWhales, recent3h volumes,
 *    buyRatio) but does NOT carry stablecoin-vs-native breakdown.
 *
 *   The raw classification lives at the transaction level (`transactions`
 *   table — from_addr / to_addr / token_symbol). Stratifying H12 properly
 *   requires either:
 *     (a) extending compute-signals/route.js to write
 *         stablecoinSellVol / nativeSellVol into tier1_factors going
 *         forward (PR-1c style addition),
 *     (b) running a one-off backfill that walks every signal's contributing
 *         transactions and tags stablecoin-flow share, then joining to
 *         signal_outcomes.
 *
 *   Both are >2h of work and produce only future-data results until
 *   backfill completes.
 *
 * Verdict: INCONCLUSIVE (data-gap) — record and defer to PR-1c.
 *
 * Read-only.
 */

import { writeResult, appendFinding, FORENSIC_WINDOW_START } from './_lib.mjs'

const HYPOTHESIS = 'H12 — Stablecoin-vs-native sign asymmetry'
const verdict = 'INCONCLUSIVE'
const summary = 'tier1_factors does not carry stablecoin/native flow breakdown. Requires PR-1c (writer extension) or transaction-level backfill — see H12 header for remediation paths.'

writeResult('H12_stablecoin_sign', {
  hypothesis: HYPOTHESIS,
  window_start: FORENSIC_WINDOW_START,
  verdict,
  summary,
  data_gap: true,
  remediation: [
    'PR-1c: extend compute-signals tier1_factors writer to include stablecoinSellVol / nativeSellVol / stablecoinShare. Wait 4 weeks for data, then implement H12 properly.',
    'Backfill: walk transactions table per signal_id, classify token_symbol as stablecoin (USDT/USDC/DAI/BUSD/TUSD/FDUSD/PYUSD) or native, aggregate to per-signal share.',
  ],
})
appendFinding({ hypothesis: HYPOTHESIS, verdict, summary, resultsFile: 'results/H12_stablecoin_sign.json' })
console.log(`[H12] ${verdict} — ${summary}`)
