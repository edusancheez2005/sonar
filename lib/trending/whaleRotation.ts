/**
 * The /trending hero: the tokens whales moved into and out of over the last
 * 24 h, from the same snapshot as the dashboard (lib/whale/netFlow.ts,
 * app_cache token_flows_24h), so every net figure here is the dashboard's.
 * Prices come from price_snapshots and are left out when missing; smart-money
 * counts and X post counts are extras that never block the list.
 */
import {
  computeTokenFlows, flowTone, chainsLiveLabel, NET_FLOW_DEFINITION,
  type TokenFlowsSnapshot, type FlowTone,
} from '@/lib/whale/netFlow'
import { getSmartMoneyActivity, type SmartMoneyStat } from '@/lib/whale/smartMoney'
import { readAllRows } from '@/lib/orca/orchestrator/tools/pagedRead'

export const ROTATION_ROWS_PER_SIDE = 5
export const ROTATION_MIN_TRADES = 2
/** X post counts are shown only from this many posts in 24 h. */
export const POSTS_MIN = 10

export interface RotationRow {
  symbol: string
  netUsd: number
  buyCount: number
  sellCount: number
  uniqueWhales: number
  volumeUsd: number
  tone: FlowTone
  price: number | null
  change24h: number | null
  smart: { buys: number; sells: number } | null
  posts24h: number | null
  postsDelta: number | null
}

export interface WhaleRotation {
  generated_at: string
  chains_live: string[]
  chains_label: string
  definition: string
  inflows: RotationRow[]
  outflows: RotationRow[]
}

function row(t: TokenFlowsSnapshot['tokens'][number]): RotationRow {
  return {
    symbol: t.symbol,
    netUsd: t.netUsd,
    buyCount: t.buyCount,
    sellCount: t.sellCount,
    uniqueWhales: t.uniqueWhales,
    volumeUsd: t.volumeUsd,
    tone: flowTone(t.netUsd, t.volumeUsd),
    price: null,
    change24h: null,
    smart: null,
    posts24h: null,
    postsDelta: null,
  }
}

/** Pure: the largest inflows and outflows by netUsd with ≥ 2 counted trades. */
export function shapeRotation(snap: TokenFlowsSnapshot, n = ROTATION_ROWS_PER_SIDE): WhaleRotation {
  const tokens = (snap.tokens || []).filter((t) => t.buyCount + t.sellCount >= ROTATION_MIN_TRADES)
  return {
    generated_at: snap.generated_at,
    chains_live: snap.chains_live || [],
    chains_label: chainsLiveLabel(snap.chains_live || []),
    definition: NET_FLOW_DEFINITION,
    inflows: tokens.filter((t) => t.netUsd > 0).sort((a, b) => b.netUsd - a.netUsd).slice(0, n).map(row),
    outflows: tokens.filter((t) => t.netUsd < 0).sort((a, b) => a.netUsd - b.netUsd).slice(0, n).map(row),
  }
}

/** Pure: posts per ticker in the last 24 h and the 24 h before. */
export function countPosts(posts: Array<{ tickers_mentioned?: unknown; published_at?: string | null }>, symbols: string[], now: number) {
  const want = new Set(symbols)
  const out = new Map<string, { last: number; prev: number }>()
  for (const s of symbols) out.set(s, { last: 0, prev: 0 })
  const dayAgo = now - 24 * 3_600_000
  for (const p of posts) {
    const t = p.published_at ? Date.parse(p.published_at) : NaN
    if (!Number.isFinite(t)) continue
    const tickers = Array.isArray(p.tickers_mentioned) ? p.tickers_mentioned : []
    for (const raw of new Set(tickers.map((x) => String(x).replace(/^\$/, '').toUpperCase()))) {
      if (!want.has(raw)) continue
      const c = out.get(raw)!
      if (t >= dayAgo) c.last++
      else c.prev++
    }
  }
  return out
}

type Client = { from: (table: string) => any }

async function latestPrices(sb: Client, symbols: string[], now: number) {
  const { data } = await sb
    .from('price_snapshots')
    .select('ticker, price_usd, price_change_24h, timestamp')
    .in('ticker', symbols)
    .gte('timestamp', new Date(now - 3 * 3_600_000).toISOString())
    .order('timestamp', { ascending: false })
    .limit(1000)
  const out = new Map<string, { price: number | null; change: number | null }>()
  for (const r of (data || []) as any[]) {
    if (out.has(r.ticker)) continue
    const price = Number(r.price_usd)
    const change = r.price_change_24h == null ? null : Number(r.price_change_24h)
    out.set(r.ticker, { price: Number.isFinite(price) && price > 0 ? price : null, change: Number.isFinite(change as number) ? change : null })
  }
  return out
}

async function recentPosts(sb: Client, now: number) {
  const { data } = await readAllRows(
    () => sb.from('social_posts')
      .select('id, tickers_mentioned, published_at')
      .gte('published_at', new Date(now - 48 * 3_600_000).toISOString())
      .order('published_at', { ascending: false })
      .order('id', { ascending: true }),
    { maxRows: 4000 }
  )
  return (data || []) as Array<{ tickers_mentioned?: unknown; published_at?: string }>
}

export async function loadWhaleRotation(sb: Client, now = Date.now()): Promise<WhaleRotation> {
  const snap = await computeTokenFlows(sb, { window: '24h' })
  const shaped = shapeRotation(snap)
  const rows = [...shaped.inflows, ...shaped.outflows]
  const symbols = rows.map((r) => r.symbol)
  if (symbols.length === 0) return shaped
  const [prices, smart, posts] = await Promise.all([
    latestPrices(sb, symbols, now).catch(() => new Map<string, { price: number | null; change: number | null }>()),
    getSmartMoneyActivity(sb, symbols, now).catch((): SmartMoneyStat[] => []),
    recentPosts(sb, now).then((p) => countPosts(p, symbols, now)).catch(() => new Map<string, { last: number; prev: number }>()),
  ])
  const smartBy = new Map<string, SmartMoneyStat>(smart.map((s) => [s.token, s]))
  for (const r of rows) {
    const p = prices.get(r.symbol)
    r.price = p?.price ?? null
    r.change24h = p?.change ?? null
    const s = smartBy.get(r.symbol)
    r.smart = s ? { buys: s.buy_count, sells: s.sell_count } : null
    const c = posts.get(r.symbol)
    if (c && c.last >= POSTS_MIN) {
      r.posts24h = c.last
      r.postsDelta = c.last - c.prev
    }
  }
  return shaped
}
