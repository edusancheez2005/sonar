/**
 * scripts/forensic/_lib.mjs
 *
 * Shared utilities for Workstream B (5-day forensic sweep, H1–H15).
 *
 * Contract (per PROMPT_SIGNAL_EXECUTION.md §3.1):
 * - Load .env.local manually (avoid dotenv dependency mismatch).
 * - Query Supabase via PostgREST with Range header pagination
 *   (supabase-js .range() sends Range; postgrest caps ?limit= at 1000).
 * - Filter: signal_time >= 2026-05-11T10:00:00Z, suspect=false,
 *   correct IS NOT NULL.
 * - Write JSON results to scripts/forensic/results/HX_<name>.json.
 * - Append one-line markdown summary to scripts/forensic/FINDINGS.md.
 *
 * All scripts here are READ-ONLY on Supabase. Never insert/update/delete.
 */

import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// ─── env loader ──────────────────────────────────────────────────────────
function loadEnvLocal() {
  const candidates = [
    resolve(__dirname, '../../.env.local'),
    resolve(process.cwd(), '.env.local'),
  ]
  for (const p of candidates) {
    if (!existsSync(p)) continue
    const raw = readFileSync(p, 'utf8')
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i)
      if (!m) continue
      const [, k, vRaw] = m
      if (process.env[k]) continue
      // Strip surrounding quotes if present
      const v = vRaw.replace(/^['"]|['"]$/g, '')
      process.env[k] = v
    }
    return p
  }
  return null
}

// ─── supabase client ─────────────────────────────────────────────────────
export function makeClient() {
  loadEnvLocal()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('[forensic] missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }
  return createClient(url, key, { auth: { persistSession: false } })
}

// ─── shared filter constants (PROMPT_SIGNAL_EXECUTION.md §3.1) ───────────
export const FORENSIC_WINDOW_START = '2026-05-11T10:00:00Z'
export const RESULTS_DIR = resolve(__dirname, 'results')
export const FINDINGS_PATH = resolve(__dirname, 'FINDINGS.md')

// ─── paged fetch via Range header ────────────────────────────────────────
/**
 * Fetch all rows from a query in chunks of `pageSize` using .range().
 * Pass a builder fn that produces a fresh query each call (supabase-js
 * queries are not reusable after the first .range()).
 *
 * Example:
 *   await fetchAll(() => client
 *     .from('signal_outcomes')
 *     .select('signal_id, eval_window, price_change_pct, alpha_pct, signal_type')
 *     .eq('suspect', false)
 *     .not('correct', 'is', null)
 *     .gte('signal_time', FORENSIC_WINDOW_START)
 *     .order('signal_time'))
 */
export async function fetchAll(queryBuilder, pageSize = 1000) {
  const rows = []
  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1
    const { data, error } = await queryBuilder().range(from, to)
    if (error) {
      console.error('[forensic] supabase error:', error.message)
      throw error
    }
    if (!data || data.length === 0) break
    rows.push(...data)
    if (data.length < pageSize) break
  }
  return rows
}

// ─── result writers ──────────────────────────────────────────────────────
function ensureResultsDir() {
  if (!existsSync(RESULTS_DIR)) mkdirSync(RESULTS_DIR, { recursive: true })
}

export function writeResult(name, payload) {
  ensureResultsDir()
  const path = resolve(RESULTS_DIR, `${name}.json`)
  writeFileSync(path, JSON.stringify(payload, null, 2) + '\n', 'utf8')
  return path
}

/**
 * verdict ∈ { 'PASS', 'KILL', 'INCONCLUSIVE' }
 * summary: short one-line markdown-safe string
 */
export function appendFinding({ hypothesis, verdict, summary, resultsFile }) {
  const ts = new Date().toISOString()
  const v = verdict.toUpperCase()
  if (!['PASS', 'KILL', 'INCONCLUSIVE'].includes(v)) {
    throw new Error(`bad verdict: ${verdict}`)
  }
  const line = `- **${hypothesis}** — ${v} — ${summary} _(${ts}, ${resultsFile})_\n`
  if (!existsSync(FINDINGS_PATH)) {
    writeFileSync(FINDINGS_PATH, '# Forensic findings (Workstream B)\n\n', 'utf8')
  }
  appendFileSync(FINDINGS_PATH, line, 'utf8')
}

// ─── tiny stats helpers ──────────────────────────────────────────────────
export function mean(arr) {
  if (arr.length === 0) return null
  let s = 0
  for (const v of arr) s += v
  return s / arr.length
}

export function stdev(arr) {
  if (arr.length < 2) return null
  const m = mean(arr)
  let s2 = 0
  for (const v of arr) s2 += (v - m) ** 2
  return Math.sqrt(s2 / (arr.length - 1))
}

/**
 * Exact (Clopper–Pearson) binomial 95% CI without a numeric beta dep.
 * Bisects the incomplete beta via a 50-iter binary search on the
 * regularised incomplete beta computed by series — accurate to ~1e-6
 * for k,n up to a few thousand. Adequate for forensic CIs.
 */
export function binomialCI95(k, n) {
  if (n === 0) return { lo: 0, hi: 1, point: 0 }
  const point = k / n
  // Bracket-search lower and upper bounds.
  const tail = (p, target) => {
    // Pr[X >= k | n, p] (for lower) and Pr[X <= k | n, p] (for upper).
    // Use direct binomial PMF sum — fine for n up to a few thousand.
    let logP = Math.log(p), logQ = Math.log(1 - p)
    let logBinom = 0
    // log(n choose j) recurrence.
    const logChoose = new Array(n + 1)
    logChoose[0] = 0
    for (let j = 1; j <= n; j++) logChoose[j] = logChoose[j - 1] + Math.log((n - j + 1) / j)
    let sum = 0
    if (target === 'lo') {
      for (let j = k; j <= n; j++) sum += Math.exp(logChoose[j] + j * logP + (n - j) * logQ)
    } else {
      for (let j = 0; j <= k; j++) sum += Math.exp(logChoose[j] + j * logP + (n - j) * logQ)
    }
    return sum
  }
  // lower bound: smallest p such that Pr[X >= k] >= 0.025
  let lo = 0, hi = point
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2
    if (tail(mid, 'lo') < 0.025) lo = mid; else hi = mid
  }
  const ciLo = (lo + hi) / 2
  // upper bound: largest p such that Pr[X <= k] >= 0.025
  lo = point; hi = 1
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2
    if (tail(mid, 'hi') < 0.025) hi = mid; else lo = mid
  }
  const ciHi = (lo + hi) / 2
  return { lo: ciLo, hi: ciHi, point }
}
