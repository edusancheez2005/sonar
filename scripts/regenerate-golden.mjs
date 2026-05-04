/**
 * Engine regression-test fixture generator.
 *
 * Produces scripts/fixtures/signal-engine-golden.json by running
 * computeUnifiedSignal over a fixed set of synthetic inputs designed to
 * exercise:
 *   - raw direction (no calibration, no snapshot, default +1)
 *   - calibration override (signMultiplier = -1)
 *   - snapshot fallback (calibration null, snapshot != null)
 *   - calibration label gate (low confidence_score → NEUTRAL)
 *   - new token with no overrides (default +1)
 *
 * Run: `node --experimental-strip-types scripts/regenerate-golden.mjs`
 *
 * After regenerating, REVIEW the diff carefully — the golden file is the
 * contract for /scripts/test-signal-engine.mjs. If the diff is intentional
 * (e.g. you raised a tier weight on purpose), commit both the engine change
 * and the golden update in the SAME commit with a justifying message.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { computeUnifiedSignal } from '../app/lib/signalEngine.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FIXTURE_PATH = path.join(__dirname, 'fixtures', 'signal-engine-golden.json')

// Fixed nowMs so the engine's time-derived computations are deterministic.
const NOW_MS = Date.UTC(2026, 4, 4, 12, 0, 0)
const FIXED_TS = (offsetHours) => new Date(NOW_MS - offsetHours * 3600_000).toISOString()

function whaleSet({ buys, sells, conf = 0.8, venueHint = 'cex_classification' }) {
  const out = []
  for (let i = 0; i < buys; i++) {
    out.push({
      transaction_hash: `b${i}`,
      timestamp: FIXED_TS(1 + (i % 12)),
      classification: 'BUY',
      usd_value: 250000 + i * 1000,
      whale_address: `wb${i}`,
      reasoning: `${venueHint} buy from upstream`,
      confidence: conf,
    })
  }
  for (let i = 0; i < sells; i++) {
    out.push({
      transaction_hash: `s${i}`,
      timestamp: FIXED_TS(1 + (i % 12)),
      classification: 'SELL',
      usd_value: 250000 + i * 1000,
      whale_address: `ws${i}`,
      reasoning: `${venueHint} sell from upstream`,
      confidence: conf,
    })
  }
  return out
}

const baseInputs = [
  {
    name: 'BTC_raw_default_bullish_flow',
    input: {
      tokenSymbol: 'BTC',
      transactions: whaleSet({ buys: 30, sells: 10 }),
      priceChanges: { change_1h: 0.5, change_6h: 1.2, change_24h: 3.4, change_7d: 6.0, change_30d: 12.0 },
      volumeData: { volume_24h: 5e10, avg_volume_7d: 4e10, market_cap: 1.3e12 },
      sentimentData: { score: 0.4, count: 200 },
      socialData: null, communityVotes: null, devActivity: null,
      technicalSignals: null, derivativesData: null,
      calibration: null, snapshot: null,
      nowMs: NOW_MS,
    },
  },
  {
    name: 'ETH_calibration_inverts_to_minus_one',
    input: {
      tokenSymbol: 'ETH',
      transactions: whaleSet({ buys: 25, sells: 5 }),
      priceChanges: { change_1h: 0.2, change_6h: 0.8, change_24h: 1.5, change_7d: 3.0, change_30d: 5.0 },
      volumeData: { volume_24h: 2e10, avg_volume_7d: 1.5e10, market_cap: 4e11 },
      sentimentData: { score: 0.2, count: 100 },
      socialData: null, communityVotes: null, devActivity: null,
      technicalSignals: null, derivativesData: null,
      calibration: { signMultiplier: -1, confidenceScore: 70, ic: -0.22, nOutcomes: 120 },
      snapshot: null,
      nowMs: NOW_MS,
    },
  },
  {
    name: 'SOL_snapshot_fallback_zero_mute',
    input: {
      tokenSymbol: 'SOL',
      transactions: whaleSet({ buys: 12, sells: 8 }),
      priceChanges: { change_1h: -0.3, change_6h: -0.7, change_24h: -1.2, change_7d: 2.0, change_30d: -4.0 },
      volumeData: { volume_24h: 3e9, avg_volume_7d: 2.5e9, market_cap: 8e10 },
      sentimentData: { score: 0.0, count: 50 },
      socialData: null, communityVotes: null, devActivity: null,
      technicalSignals: null, derivativesData: null,
      calibration: { signMultiplier: null, confidenceScore: 10, ic: 0.05, nOutcomes: 30 },
      snapshot: { signMultiplier: 0, confidenceScore: 80, ic: 0.0, nOutcomes: 200 },
      nowMs: NOW_MS,
    },
  },
  {
    name: 'NEW_TOKEN_no_overrides_uses_default_plus_one',
    input: {
      tokenSymbol: 'NEW',
      transactions: whaleSet({ buys: 8, sells: 22 }),
      priceChanges: { change_1h: -1.0, change_6h: -3.0, change_24h: -5.0, change_7d: -10.0, change_30d: -15.0 },
      volumeData: { volume_24h: 5e7, avg_volume_7d: 4e7, market_cap: 1e9 },
      sentimentData: null, socialData: null, communityVotes: null, devActivity: null,
      technicalSignals: null, derivativesData: null,
      calibration: null, snapshot: null,
      nowMs: NOW_MS,
    },
  },
  {
    name: 'LOW_CONFIDENCE_calibration_gates_to_neutral',
    input: {
      tokenSymbol: 'XYZ',
      transactions: whaleSet({ buys: 28, sells: 3 }),
      priceChanges: { change_1h: 1.0, change_6h: 2.0, change_24h: 4.0, change_7d: 8.0, change_30d: 14.0 },
      volumeData: { volume_24h: 1e9, avg_volume_7d: 8e8, market_cap: 5e9 },
      sentimentData: { score: 0.5, count: 80 },
      socialData: null, communityVotes: null, devActivity: null,
      technicalSignals: null, derivativesData: null,
      calibration: { signMultiplier: 1, confidenceScore: 5, ic: 0.02, nOutcomes: 40 },
      snapshot: null,
      nowMs: NOW_MS,
    },
  },
]

function main() {
  const cases = []
  for (const c of baseInputs) {
    const out = computeUnifiedSignal(c.input)
    cases.push({
      name: c.name,
      input: c.input,
      expected: {
        signal: out.signal,
        score: out.score,
        confidence: out.confidence,
        rawScore: out.rawScore,
        timeframe: out.timeframe,
        sign_decision: out.sign_decision,
      },
    })
  }
  fs.mkdirSync(path.dirname(FIXTURE_PATH), { recursive: true })
  fs.writeFileSync(
    FIXTURE_PATH,
    JSON.stringify({ generated_at: new Date().toISOString(), now_ms: NOW_MS, cases }, null, 2),
  )
  console.log(`[regenerate-golden] wrote ${cases.length} cases to ${FIXTURE_PATH}`)
}

main()
