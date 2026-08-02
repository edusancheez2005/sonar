/**
 * /api/cron/snapshot-figure-portfolios
 *
 * SELF-OWNED portfolio history — the Arkham exit strategy. Arkham's
 * /history/entity gives figures a beautiful value-over-time chart, but
 * it dies with the trial ($1,500/mo afterwards — not happening). This
 * cron builds the same series from OUR OWN stack instead: live holdings
 * via Alchemy (eth/polygon/arbitrum/base) + Jupiter (solana) +
 * blockstream (bitcoin), summed per figure and appended as one
 * [date, usd] point per figure per day into app_cache
 * 'figure_portfolio_snapshots'. From the day the trial ends, the figure
 * chart keeps growing from this series; history before that stays from
 * the last cached Arkham snapshot.
 *
 * Budget: figures are processed least-recently-snapshotted first under
 * a hard time budget, one point per figure per UTC day max, addresses
 * capped per figure (mega-entities like Binance keep their Arkham
 * total; this cron is for the person-scale wallets). Runs several
 * times a day so the rotation covers the whole directory daily.
 */
import { NextResponse } from 'next/server'
import { supabaseAdminFresh as supabaseAdmin } from '@/app/lib/supabaseAdmin'
import { getEvmHoldings } from '@/lib/wallet/alchemy'
import { getSolanaHoldings } from '@/lib/wallet/solana'
import { getBitcoinHoldings } from '@/lib/wallet/btc'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const CACHE_KEY = 'figure_portfolio_snapshots'
const TIME_BUDGET_MS = 240_000
const MAX_ADDRESSES_PER_FIGURE = 12
const MAX_POINTS_PER_FIGURE = 400 // ~13 months of daily points
const CHAIN_ALIASES = {
  ethereum: 'ethereum', eth: 'ethereum',
  polygon: 'polygon', matic: 'polygon',
  arbitrum: 'arbitrum', arbitrum_one: 'arbitrum', arb: 'arbitrum',
  base: 'base',
  solana: 'solana', sol: 'solana',
  bitcoin: 'bitcoin', btc: 'bitcoin',
}

async function holdingsValue(chain, address) {
  try {
    let holdings
    if (chain === 'solana') holdings = await getSolanaHoldings(address)
    else if (chain === 'bitcoin') holdings = await getBitcoinHoldings(address)
    else holdings = await getEvmHoldings(chain, address)
    let total = 0
    for (const h of holdings || []) {
      const v = Number(h?.value_usd)
      if (Number.isFinite(v) && v > 0) total += v
    }
    return total
  } catch {
    return null // provider failure — figure is skipped this run, not zeroed
  }
}

export async function GET(request) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = request.headers.get('authorization')
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const t0 = Date.now()
  const today = new Date().toISOString().slice(0, 10)

  const { data: figures, error } = await supabaseAdmin
    .from('curated_entities')
    .select('slug, addresses')
    .eq('submission_status', 'approved')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: cacheRow } = await supabaseAdmin
    .from('app_cache')
    .select('value')
    .eq('key', CACHE_KEY)
    .maybeSingle()
  const series = cacheRow?.value && typeof cacheRow.value === 'object' ? cacheRow.value : {}

  // Eligible figures: has supported addresses within the cap, and no
  // point yet today. Least-recently-snapshotted first.
  const candidates = []
  for (const f of figures || []) {
    const addrs = []
    for (const a of f.addresses || []) {
      const chain = CHAIN_ALIASES[String(a?.chain || '').toLowerCase()]
      if (chain && a?.address) addrs.push({ chain, address: a.address })
      if (addrs.length >= MAX_ADDRESSES_PER_FIGURE) break
    }
    if (addrs.length === 0) continue
    const pts = Array.isArray(series[f.slug]) ? series[f.slug] : []
    const lastDate = pts.length > 0 ? pts[pts.length - 1][0] : ''
    if (lastDate === today) continue
    candidates.push({ slug: f.slug, addrs, lastDate })
  }
  candidates.sort((a, b) => (a.lastDate < b.lastDate ? -1 : a.lastDate > b.lastDate ? 1 : 0))

  let snapped = 0
  let addressCalls = 0
  const errors = []
  for (const c of candidates) {
    if (Date.now() - t0 > TIME_BUDGET_MS) break
    let total = 0
    let failed = false
    for (const { chain, address } of c.addrs) {
      const v = await holdingsValue(chain, address)
      addressCalls += 1
      if (v == null) { failed = true; break }
      total += v
    }
    // A failed provider mid-figure would understate the total — skip the
    // whole figure this run rather than record a wrong point.
    if (failed) { errors.push(c.slug); continue }
    const pts = Array.isArray(series[c.slug]) ? series[c.slug] : []
    pts.push([today, Math.round(total)])
    series[c.slug] = pts.slice(-MAX_POINTS_PER_FIGURE)
    snapped += 1
  }

  if (snapped > 0) {
    await supabaseAdmin.from('app_cache').upsert(
      { key: CACHE_KEY, value: series, updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    )
  }

  return NextResponse.json({
    ok: true,
    date: today,
    eligible: candidates.length,
    snapshotted: snapped,
    address_calls: addressCalls,
    skipped_on_provider_error: errors.slice(0, 10),
    elapsed_ms: Date.now() - t0,
  })
}
