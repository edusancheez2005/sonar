/**
 * CRON: Refresh of Arkham entity-level balances for curated figures.
 * Schedule: 0 5 * / 3 * * (vercel.json) — every 3rd night, after
 * backtest-whales. Each run costs ~1 Arkham credit per linked figure
 * (~31 today), so nightly would burn ~930 credits/month for balances
 * that move slowly; every 3 nights is plenty fresh at a third the spend.
 *
 * Figure pages headline "Total entity holdings" from the app_cache key
 * `figure_entity_balances`. Those totals CANNOT be derived from our own
 * buy/sell tape: the tape records flows we observed on tracked addresses,
 * while entity balances are point-in-time state across every wallet Arkham
 * attributes to the entity — including treasury cold wallets that never
 * appear in our harvested address lists (e.g. Bhutan's 1,750 BTC).
 *
 * Per entity: GET /balances/entity/{id} (Arkham), reprice each asset via
 * CoinGecko simple/price (Arkham's own USD marks can be stale), merge into
 * the cache. Refreshes the stalest entities first under a wall-clock
 * budget, so the full roster rotates across nights even if one run can't
 * finish it. Requires ARKHAM_API_KEY in the Vercel environment.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cgRequest } from '@/lib/coingecko/client'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 300
export const fetchCache = 'force-no-store'

const CACHE_KEY = 'figure_entity_balances'
const BUDGET_MS = 230_000
const PER_ENTITY_TIMEOUT_MS = 25_000
const ARKHAM_BASE = (process.env.ARKHAM_BASE_URL || 'https://api.arkm.com').replace(/\/+$/, '')
// Cloudflare fronting api.arkm.com rejects default server fetch signatures;
// a browser-like UA is required (observed 2026-07-22).
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'

type Asset = { symbol: string | null; balance: number; usd: number }

async function arkhamBalances(key: string, entityId: string): Promise<any | null> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), PER_ENTITY_TIMEOUT_MS)
  try {
    const res = await fetch(`${ARKHAM_BASE}/balances/entity/${encodeURIComponent(entityId)}`, {
      headers: { 'API-Key': key, Accept: 'application/json', 'User-Agent': UA },
      cache: 'no-store',
      signal: ctrl.signal,
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth?.replace('Bearer ', '') !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const arkhamKey = process.env.ARKHAM_API_KEY || process.env.ARKHAM_API_KEY_1
  if (!arkhamKey) {
    return NextResponse.json({ error: 'ARKHAM_API_KEY not set in environment' }, { status: 500 })
  }
  const startTs = Date.now()

  const sb = createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  )

  const { data: figures, error } = await sb
    .from('curated_entities')
    .select('slug, arkham_entity_id')
    .not('arkham_entity_id', 'is', null)
    .eq('submission_status', 'approved')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Existing snapshot — refresh stalest first, keep unrefreshed entries.
  const { data: cacheRow } = await sb
    .from('app_cache').select('value').eq('key', CACHE_KEY).maybeSingle()
  const existing: Record<string, any> = cacheRow?.value && typeof cacheRow.value === 'object' ? cacheRow.value : {}

  const queue = [...(figures || [])].sort((a, b) => {
    const ta = new Date(existing[a.slug]?.fetched_at || 0).getTime()
    const tb = new Date(existing[b.slug]?.fetched_at || 0).getTime()
    return ta - tb
  })

  // Pass 1: pull raw balances (bounded by budget), collect CoinGecko ids.
  const raw: Array<{ slug: string; assets: Array<Asset & { cg_id: string | null }> }> = []
  const cgIds = new Set<string>()
  let refreshed = 0
  let budgetExceeded = false
  for (const f of queue) {
    if (Date.now() - startTs > BUDGET_MS * 0.7) { budgetExceeded = true; break }
    const j = await arkhamBalances(arkhamKey, f.arkham_entity_id)
    sb.from('arkham_call_log').insert({
      endpoint: `/balances/entity/${f.arkham_entity_id}`, method: 'GET', cost: 1,
      status: j ? 200 : 0, ms: 0, cache_hit: false, source: 'cron', reason: 'refresh-entity-balances',
    }).then(() => {})
    if (!j?.balances) continue
    const assets: Array<Asset & { cg_id: string | null }> = []
    for (const rows of Object.values(j.balances as Record<string, any[]>)) {
      for (const r of rows || []) {
        const balance = Number(r?.balance) || 0
        if (balance <= 0) continue
        const cg_id = typeof r?.id === 'string' && r.id ? r.id : null
        if (cg_id) cgIds.add(cg_id)
        assets.push({ symbol: r?.symbol ?? null, balance, usd: Number(r?.usd) || 0, cg_id })
      }
    }
    raw.push({ slug: f.slug, assets })
    refreshed++
  }

  // Pass 2: live repricing (Arkham's USD marks lag the market).
  const prices = new Map<string, number>()
  const idList = [...cgIds]
  for (let i = 0; i < idList.length; i += 150) {
    const chunk = idList.slice(i, i + 150)
    try {
      const cg = cgRequest(`/simple/price?ids=${chunk.join(',')}&vs_currencies=usd`)
      const res = await fetch(cg.url, { headers: cg.headers, cache: 'no-store' })
      if (!res.ok) continue
      const j = await res.json()
      for (const [id, v] of Object.entries<any>(j)) {
        if (typeof v?.usd === 'number') prices.set(id, v.usd)
      }
    } catch { /* keep Arkham marks */ }
  }

  const now = new Date().toISOString()
  const merged: Record<string, any> = { ...existing }
  for (const { slug, assets } of raw) {
    let total = 0
    const top: Array<{ symbol: string | null; balance: number; usd: number }> = []
    for (const a of assets) {
      const px = a.cg_id ? prices.get(a.cg_id) : undefined
      const usd = px != null ? a.balance * px : a.usd
      if (!Number.isFinite(usd) || usd <= 0) continue
      total += usd
      top.push({ symbol: a.symbol, balance: a.balance, usd: Math.round(usd * 100) / 100 })
    }
    top.sort((x, y) => y.usd - x.usd)
    merged[slug] = { total_usd: Math.round(total * 100) / 100, assets: top.slice(0, 10), fetched_at: now }
  }

  const { error: upsertErr } = await sb
    .from('app_cache')
    .upsert({ key: CACHE_KEY, value: merged, updated_at: now }, { onConflict: 'key' })
  if (upsertErr) return NextResponse.json({ error: upsertErr.message }, { status: 500 })

  return NextResponse.json({
    ok: true,
    entities_total: (figures || []).length,
    refreshed,
    repriced_ids: prices.size,
    budget_exceeded: budgetExceeded,
    elapsed_ms: Date.now() - startTs,
  })
}
