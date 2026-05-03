import { NextRequest, NextResponse } from 'next/server'
import { runBacktest } from '@/lib/wallet-backtest/engine'
import type { BacktestChain, BacktestResponse } from '@/lib/wallet-backtest/types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

const VALID_CHAINS = new Set<BacktestChain>(['ethereum', 'polygon', 'solana'])

// ─── Address shape validation (cheap, no network) ────────────────────────
const EVM_ADDRESS = /^0x[a-fA-F0-9]{40}$/
const SOL_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

function isValidAddress(address: string, chain: BacktestChain): boolean {
  if (chain === 'solana') return SOL_ADDRESS.test(address)
  return EVM_ADDRESS.test(address)
}

// ─── Date parsing ───────────────────────────────────────────────────────
function parseDate(raw: string | null, fallbackMs: number): number {
  if (!raw) return fallbackMs
  // Accept either YYYY-MM-DD or full ISO. Reject anything else so we
  // never accidentally feed NaN to the engine.
  const ms = Date.parse(raw)
  if (Number.isNaN(ms)) return fallbackMs
  return ms
}

// ─── Rate limit (5 / minute / IP) ───────────────────────────────────────
// In-memory token bucket. Vercel splits load across lambdas so this is
// per-instance, not strictly global; good enough for a paid feature.
interface Bucket { count: number; resetAt: number }
const ipBuckets = new Map<string, Bucket>()
const RATE_LIMIT = 5
const RATE_WINDOW_MS = 60_000

function checkRateLimit(ip: string): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now()
  const cur = ipBuckets.get(ip)
  if (!cur || cur.resetAt <= now) {
    ipBuckets.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return { ok: true }
  }
  if (cur.count >= RATE_LIMIT) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((cur.resetAt - now) / 1000)) }
  }
  cur.count += 1
  return { ok: true }
}

function getIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return req.headers.get('x-real-ip') || 'unknown'
}

// ─── In-memory result cache (1h, keyed on full request shape) ───────────
// Same keying as the would-be Supabase cache; we can swap storage later
// without changing the contract.
interface ResultCacheEntry { fetchedAt: number; payload: BacktestResponse }
const resultCache = new Map<string, ResultCacheEntry>()
const RESULT_TTL_MS = 60 * 60 * 1000

function cacheKey(parts: string[]) { return parts.join('|') }

// ─── Handler ────────────────────────────────────────────────────────────
export async function GET(
  req: NextRequest,
  { params }: { params: { address: string } }
) {
  const t0 = Date.now()

  const url = new URL(req.url)
  const chainRaw = String(url.searchParams.get('chain') || '').toLowerCase().trim()
  if (!VALID_CHAINS.has(chainRaw as BacktestChain)) {
    return NextResponse.json(
      { error: `chain must be one of: ${[...VALID_CHAINS].join(', ')}` },
      { status: 400 }
    )
  }
  const chain = chainRaw as BacktestChain

  const addressRaw = decodeURIComponent(String(params?.address || '').trim())
  // EVM addresses are case-insensitive; normalize for cache hits.
  const address = chain === 'solana' ? addressRaw : addressRaw.toLowerCase()
  if (!isValidAddress(address, chain)) {
    return NextResponse.json({ error: 'Invalid address for chain' }, { status: 400 })
  }

  const capitalRaw = Number(url.searchParams.get('capital') ?? '10000')
  const capital_usd = Number.isFinite(capitalRaw) && capitalRaw > 0
    ? Math.min(Math.max(capitalRaw, 100), 10_000_000)
    : 10000

  const now = Date.now()
  const ninetyDaysAgo = now - 90 * 86400000
  const start_ms = parseDate(url.searchParams.get('start_date'), ninetyDaysAgo)
  const end_ms = parseDate(url.searchParams.get('end_date'), now)

  if (end_ms <= start_ms) {
    return NextResponse.json({ error: 'end_date must be after start_date' }, { status: 400 })
  }
  if (end_ms - start_ms > 730 * 86400000) {
    return NextResponse.json({ error: 'date range capped at 730 days' }, { status: 400 })
  }

  // Cache check (before rate-limit so cached hits are free for users).
  // Bucket dates to the day so the cache works even with slightly
  // different request timestamps.
  const dayBucket = (ms: number) => Math.floor(ms / 86400000)
  const key = cacheKey([
    address,
    chain,
    String(capital_usd),
    String(dayBucket(start_ms)),
    String(dayBucket(end_ms)),
  ])
  const cached = resultCache.get(key)
  if (cached && now - cached.fetchedAt < RESULT_TTL_MS) {
    return NextResponse.json(
      { ...cached.payload, cache_hit: true, computed_in_ms: Date.now() - t0 },
      { headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=600' } }
    )
  }

  // Rate limit only applies to cache misses (where we'd actually pay
  // for upstream calls).
  const ip = getIp(req)
  const rl = checkRateLimit(ip)
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Rate limit exceeded. Retry in ${rl.retryAfterSec}s.` },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
    )
  }

  try {
    const out = await runBacktest({ address, chain, capital_usd, start_ms, end_ms })
    const payload: BacktestResponse = {
      address,
      chain,
      capital_usd,
      start: new Date(start_ms).toISOString(),
      end: new Date(end_ms).toISOString(),
      trades_count: out.trades_count,
      equity_curve: out.equity_curve,
      result: out.result,
      benchmarks: out.benchmarks,
      computed_in_ms: Date.now() - t0,
      cache_hit: false,
      warnings: out.warnings,
    }
    resultCache.set(key, { fetchedAt: now, payload })
    return NextResponse.json(payload, {
      headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=600' },
    })
  } catch (e: any) {
    // Common upstream failures: missing ALCHEMY_API_KEY, COINGECKO 429,
    // Helius 401. Surface a generic message to clients but log details.
    console.error('wallet-backtest failed:', e?.stack || e?.message || e)
    // Opt-in debug: ?debug=1 returns the underlying error message.
    // Useful for the nightly cron's /admin diagnostic view; never
    // wired into the public client.
    const debug = url.searchParams.get('debug') === '1'
    return NextResponse.json(
      debug
        ? {
            error: 'Backtest failed.',
            debug_message: String(e?.message || e).slice(0, 1000),
            debug_stack: String(e?.stack || '').slice(0, 2000),
          }
        : { error: 'Backtest failed. Try a smaller window or another chain.' },
      { status: 500 }
    )
  }
}
