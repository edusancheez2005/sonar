#!/usr/bin/env node
/**
 * H2 — 3-tier sign-agreement filter removes worst SELLs
 *
 * Hypothesis: when T1, T2, T3 all agree on direction (all negative for
 * SELL, all positive for BUY), the signal substantially outperforms the
 * mixed-sign case.
 *
 * Define `three_agree = 1` when sign(t1_score)=sign(t2_score)=sign(t3_score)
 * AND aligns with signal_type; else 0.
 *
 * PASS: AVG(alpha_24h | three_agree=1) − AVG(alpha_24h | three_agree=0)
 *        >= 500 bps                     → add sign-agreement gate to engine.
 * KILL: diff < 100 bps                  → no gating benefit.
 * INCONCLUSIVE: 100–500 bps, or either bucket n < 50.
 *
 * STATUS: STUB.
 * Read-only.
 */

console.error('[H2] STUB')
process.exit(2)
