/**
 * Engine regression test (Stage 4 hardening, 2026-05-04).
 *
 * Runs every case in scripts/fixtures/signal-engine-golden.json through
 * the LIVE engine and asserts the output matches the recorded `expected`
 * block byte-for-byte (after JSON normalisation). Exit code:
 *   0 — every case matches
 *   1 — at least one case diverged (engine drifted; either the change is
 *       intentional and the developer must regenerate the golden file via
 *       `node --experimental-strip-types scripts/regenerate-golden.mjs`,
 *       OR the change is a regression and must be reverted)
 *   2 — fixture missing or malformed
 *
 * Wired into `npm run build` via the `prebuild` hook so a broken engine
 * cannot reach `main`. Run locally:
 *   node --experimental-strip-types scripts/test-signal-engine.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { computeUnifiedSignal } from '../app/lib/signalEngine.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FIXTURE_PATH = path.join(__dirname, 'fixtures', 'signal-engine-golden.json')

if (!fs.existsSync(FIXTURE_PATH)) {
  console.error(`[test-signal-engine] FIXTURE MISSING: ${FIXTURE_PATH}`)
  console.error('  → Run: node --experimental-strip-types scripts/regenerate-golden.mjs')
  process.exit(2)
}

let fixture
try {
  fixture = JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf8'))
} catch (e) {
  console.error('[test-signal-engine] FIXTURE MALFORMED:', e.message)
  process.exit(2)
}

if (!Array.isArray(fixture.cases) || fixture.cases.length === 0) {
  console.error('[test-signal-engine] FIXTURE has no cases')
  process.exit(2)
}

function pickActual(out) {
  return {
    signal: out.signal,
    score: out.score,
    confidence: out.confidence,
    rawScore: out.rawScore,
    timeframe: out.timeframe,
    sign_decision: out.sign_decision,
  }
}

function diff(a, b) {
  const A = JSON.stringify(a)
  const B = JSON.stringify(b)
  if (A === B) return null
  return { expected: A, actual: B }
}

let failed = 0
const failures = []
for (const c of fixture.cases) {
  const out = computeUnifiedSignal(c.input)
  const actual = pickActual(out)
  const d = diff(c.expected, actual)
  if (d) {
    failed++
    failures.push({ name: c.name, ...d })
  }
}

if (failed === 0) {
  console.log(`[test-signal-engine] ✓ ${fixture.cases.length}/${fixture.cases.length} cases matched golden`)
  process.exit(0)
}

console.error(`[test-signal-engine] ✗ ${failed}/${fixture.cases.length} cases diverged from golden`)
for (const f of failures) {
  console.error(`\n  case: ${f.name}`)
  console.error(`  expected: ${f.expected}`)
  console.error(`  actual:   ${f.actual}`)
}
console.error('\n  If this change is intentional, regenerate the golden file:')
console.error('    node --experimental-strip-types scripts/regenerate-golden.mjs')
console.error('  and commit the diff with a justifying message.')
process.exit(1)
