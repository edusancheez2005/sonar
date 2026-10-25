/**
 * Whale net flow — ONE definition for every surface (2026-10-25, Prompt 5).
 *
 * Before this module the dashboard, heatmap, personal strip and ORCA each
 * computed "net flow" differently, so one token showed four numbers on one
 * screen, and the dashboard headline counted Morpho Blue flash-loan legs
 * ($437M of a $445.5M "Net Inflow" on 2026-10-23).
 *
 * Consumers (keep this list current):
 * - app/api/cron/precompute-token-flows — writes app_cache token_flows_24h / _7d
 * - app/api/dashboard/summary — KPI strip, inflow/outflow, Most Traded,
 *   Buy/Sell Pressure, personalised ?tokens= block (reads the cache row)
 * - app/api/wallet-tracker/heatmap — reads the same cache rows
 * - app/lib/leaderboardData.js — junk-address filter (isJunkAddress)
 * - lib/orca/orchestrator/tools/getTrendingWhales.ts — foldTokenFlows
 * - lib/orca/orchestrator/tools/getWhaleFlows.ts — isCountedRow
 * - Prompt 2 personal feed, Prompt 3 whale_flow alert evaluator and preset
 *   suggestion, Prompt 7 trending hero — import from here, never re-derive.
 *
 * Layers: (a) pure row rules — isCountedRow, foldTokenFlows, flowTone;
 * (b) read layer — computeTokenFlows (cache first, then a paged live read).
 */
import { isNoiseRow, isExchangeInternalRow, isJunkAddress } from '@/lib/orca/junk-addresses'
import { canonicalSymbol } from '@/lib/wallet/symbol-aliases'
import { readAllRows } from '@/lib/orca/orchestrator/tools/pagedRead'

export { isJunkAddress }

/** Single transfers above this are protocol-scale noise, as in ORCA. */
export const MAX_SANE_TX_USD = 150_000_000

/** The 15 stablecoins the dashboard has always excluded. */
export const STABLECOINS = new Set([
  'USDT', 'USDC', 'DAI', 'BUSD', 'TUSD', 'USDP', 'GUSD', 'USDD', 'FRAX', 'LUSD', 'USDK', 'USDN', 'FEI', 'TRIBE', 'CUSD',
])

/** A token's net is "flat" when |net| < max(minUsd, volumeShare × its volume). */
export const NET_FLOW_BANDS = { minUsd: 50_000, volumeShare: 0.05 } as const

export const NET_FLOW_DEFINITION =
  'Net flow = USD whales received minus USD whales sent in the window (BUY = the whale address received the token). ' +
  'Excludes stablecoins, single transfers above $150M, known protocol and flash-loan addresses (Morpho Blue, Balancer Vault) ' +
  'and exchange-internal moves. Wrapped and liquid-staked variants count as the underlying asset ' +
  '(WBTC/cbBTC/tBTC → BTC; WETH/stETH/wstETH/rETH/cbETH → ETH; WSOL/mSOL/jitoSOL → SOL). ' +
  "Flat when the net is under $50K or 5% of the token's volume."

export const TOKEN_FLOWS_CACHE_KEYS = { '24h': 'token_flows_24h', '7d': 'token_flows_7d' } as const
export type FlowWindow = keyof typeof TOKEN_FLOWS_CACHE_KEYS
export const WINDOW_MS: Record<FlowWindow, number> = { '24h': 24 * 3_600_000, '7d': 7 * 24 * 3_600_000 }
/** A cache row younger than this is served instead of a live read. */
export const CACHE_MAX_AGE_MS: Record<FlowWindow, number> = { '24h': 10 * 60_000, '7d': 75 * 60_000 }

/** One colour per tone (= C.green / C.red / C.textMuted in app/lib/terminalTheme). */
export const FLOW_TONE_COLORS = { in: '#00e676', out: '#ff1744', flat: '#5a6a7a' } as const
/** Text needs ≥ 4.5:1 on the panel; C.textMuted is 3.4:1, so flat text uses #8896a6. */
export const FLOW_TONE_TEXT = { in: '#00e676', out: '#ff1744', flat: '#8896a6' } as const

export type ExcludeReason = 'junk' | 'exchangeInternal' | 'overCap' | 'stablecoin' | 'badSymbol'
export type CountDecision = { ok: true; symbol: string; usd: number } | { ok: false; reason: ExcludeReason; symbol: string | null; usd: number }

export interface FlowRow {
  token_symbol?: string | null
  usd_value?: number | string | null
  classification?: string | null
  whale_address?: string | null
  from_address?: string | null
  to_address?: string | null
  from_label?: string | null
  to_label?: string | null
  blockchain?: string | null
  timestamp?: string | null
  transaction_hash?: string | null
  [k: string]: unknown
}

/**
 * Does this whale-tape row count toward net flow? Order: symbol, protocol /
 * flash-loan address, exchange-internal move, $150M cap, stablecoin.
 * `allowStablecoins` is for per-ticker reads that ask about a stablecoin.
 */
export function isCountedRow(row: FlowRow | null | undefined, opts: { allowStablecoins?: boolean } = {}): CountDecision {
  const usd = Number(row?.usd_value)
  const symbol = canonicalSymbol(String(row?.token_symbol ?? '').trim())
  if (!row || !symbol || !/^[A-Z0-9._-]{1,12}$/.test(symbol) || /^UNKNOWN/.test(symbol) || !Number.isFinite(usd) || usd <= 0) {
    return { ok: false, reason: 'badSymbol', symbol: symbol || null, usd: Number.isFinite(usd) ? usd : 0 }
  }
  if (isNoiseRow(row)) return { ok: false, reason: 'junk', symbol, usd }
  if (isExchangeInternalRow(row)) return { ok: false, reason: 'exchangeInternal', symbol, usd }
  if (usd > MAX_SANE_TX_USD) return { ok: false, reason: 'overCap', symbol, usd }
  if (!opts.allowStablecoins && STABLECOINS.has(symbol)) return { ok: false, reason: 'stablecoin', symbol, usd }
  return { ok: true, symbol, usd }
}

export interface ExcludedTotals {
  junk: { count: number; usd: number }
  exchangeInternal: { count: number; usd: number }
  overCap: { count: number; usd: number }
  stablecoin: { count: number; usd: number }
  badSymbol: { count: number; usd: number }
}

export interface TokenFlow {
  symbol: string
  buyUsd: number
  sellUsd: number
  netUsd: number
  robustNetUsd: number
  buyCount: number
  sellCount: number
  uniqueWhales: number
  volumeUsd: number
  excluded: { junk: number; exchangeInternal: number; overCap: number; stablecoin: number }
}

function emptyExcluded(): ExcludedTotals {
  return { junk: { count: 0, usd: 0 }, exchangeInternal: { count: 0, usd: 0 }, overCap: { count: 0, usd: 0 }, stablecoin: { count: 0, usd: 0 }, badSymbol: { count: 0, usd: 0 } }
}

function quantile(sorted: number[], q: number): number {
  if (!sorted.length) return 0
  const pos = (sorted.length - 1) * q
  const base = Math.floor(pos)
  const rest = pos - base
  return sorted[base + 1] !== undefined ? sorted[base] + rest * (sorted[base + 1] - sorted[base]) : sorted[base]
}

/** Outlier-resistant net: IQR fence, then a 5% trimmed sum (from the old summary route). */
export function robustNet(values: number[]): number {
  if (!values.length) return 0
  const abs = values.map((v) => Math.abs(Number(v) || 0)).filter(Number.isFinite).sort((a, b) => a - b)
  if (!abs.length) return 0
  const q1 = quantile(abs, 0.25)
  const q3 = quantile(abs, 0.75)
  const upper = q3 + 3 * (q3 - q1)
  const kept = values.filter((v) => Math.abs(Number(v) || 0) <= upper)
  if (kept.length <= 5) return kept.reduce((s, v) => s + (Number(v) || 0), 0)
  const arr = kept.slice().sort((a, b) => Math.abs(a) - Math.abs(b))
  const trim = Math.max(1, Math.floor(arr.length * 0.05))
  return arr.slice(trim, arr.length - trim).reduce((s, v) => s + (Number(v) || 0), 0)
}

export interface FoldResult {
  tokens: Map<string, TokenFlow>
  excluded: ExcludedTotals
  rowsRead: number
  rowsCounted: number
}

/** Fold rows into per-token flows plus totals of what was excluded and why. */
export function foldTokenFlowsWithStats(rows: FlowRow[], opts: { allowStablecoins?: boolean } = {}): FoldResult {
  const tokens = new Map<string, TokenFlow & { _whales: Set<string>; _signed: number[] }>()
  const excluded = emptyExcluded()
  let rowsCounted = 0
  const bucket = (symbol: string) => {
    let b = tokens.get(symbol)
    if (!b) {
      b = { symbol, buyUsd: 0, sellUsd: 0, netUsd: 0, robustNetUsd: 0, buyCount: 0, sellCount: 0, uniqueWhales: 0, volumeUsd: 0,
        excluded: { junk: 0, exchangeInternal: 0, overCap: 0, stablecoin: 0 }, _whales: new Set(), _signed: [] }
      tokens.set(symbol, b)
    }
    return b
  }
  for (const row of rows || []) {
    const d = isCountedRow(row, opts)
    if (!d.ok) {
      excluded[d.reason].count += 1
      excluded[d.reason].usd += d.usd
      if (d.symbol && d.reason !== 'badSymbol' && d.reason !== 'stablecoin') bucket(d.symbol).excluded[d.reason] += 1
      continue
    }
    const klass = String(row.classification ?? '').trim().toLowerCase()
    const isBuy = klass.startsWith('buy')
    const isSell = klass.startsWith('sell')
    if (!isBuy && !isSell) continue
    rowsCounted += 1
    const b = bucket(d.symbol)
    if (row.whale_address) b._whales.add(String(row.whale_address).toLowerCase())
    b.volumeUsd += d.usd
    if (isBuy) { b.buyUsd += d.usd; b.buyCount += 1; b._signed.push(d.usd) } else { b.sellUsd += d.usd; b.sellCount += 1; b._signed.push(-d.usd) }
  }
  const out = new Map<string, TokenFlow>()
  for (const [sym, b] of tokens) {
    if (b.buyCount + b.sellCount === 0) continue
    out.set(sym, {
      symbol: sym,
      buyUsd: Math.round(b.buyUsd),
      sellUsd: Math.round(b.sellUsd),
      netUsd: Math.round(b.buyUsd - b.sellUsd),
      robustNetUsd: Math.round(robustNet(b._signed)),
      buyCount: b.buyCount,
      sellCount: b.sellCount,
      uniqueWhales: b._whales.size,
      volumeUsd: Math.round(b.volumeUsd),
      excluded: b.excluded,
    })
  }
  for (const k of Object.keys(excluded) as ExcludeReason[]) excluded[k].usd = Math.round(excluded[k].usd)
  return { tokens: out, excluded, rowsRead: (rows || []).length, rowsCounted }
}

export function foldTokenFlows(rows: FlowRow[], opts: { allowStablecoins?: boolean } = {}): Map<string, TokenFlow> {
  return foldTokenFlowsWithStats(rows, opts).tokens
}

export type FlowTone = 'in' | 'out' | 'flat'

export function flowTone(netUsd: number, volumeUsd: number): FlowTone {
  const net = Number(netUsd) || 0
  const band = Math.max(NET_FLOW_BANDS.minUsd, NET_FLOW_BANDS.volumeShare * Math.abs(Number(volumeUsd) || 0))
  if (Math.abs(net) < band) return 'flat'
  return net > 0 ? 'in' : 'out'
}

const CHAIN_NAMES: Record<string, string> = { ethereum: 'Ethereum', bitcoin: 'Bitcoin', solana: 'Solana', polygon: 'Polygon', arbitrum: 'Arbitrum', base: 'Base', bsc: 'BNB Chain' }

/** The one chain sentence every surface renders (Prompts 2, 5, 6, 7). */
export function chainsLiveLabel(chainsLive: string[] | null | undefined): string {
  const list = (chainsLive || []).map((c) => String(c).toLowerCase())
  if (list.length === 0) return 'No whale rows in this window'
  if (list.length === 1 && list[0] === 'ethereum') return 'Ethereum only right now (WBTC/cbBTC counted as BTC)'
  return `Chains: ${list.map((c) => CHAIN_NAMES[c] || c).join(', ')}`
}

// ── Read layer ──────────────────────────────────────────────────────────────

export interface TxSummary {
  hash: string | null
  time: string | null
  symbol: string
  side: 'BUY' | 'SELL'
  usd: number
  chain: string | null
  whale_address: string | null
  from_address: string | null
  to_address: string | null
  from_label: string | null
  to_label: string | null
}

export interface TokenFlowsSnapshot {
  window: FlowWindow
  generated_at: string
  since: string
  until: string
  definition: string
  chains_live: string[]
  /** Counted transfers per chain in the window. */
  chain_counts?: Record<string, number>
  rows_read: number
  rows_counted: number
  complete: boolean
  excluded: ExcludedTotals
  /** Every token's bucket, sorted by |netUsd| descending. */
  tokens: TokenFlow[]
  totals: { buyUsd: number; sellUsd: number; netUsd: number; volumeUsd: number; buyCount: number; sellCount: number; uniqueWhales: number }
  /** Hourly buckets (24h window only), oldest first; label = HH:00 UTC. */
  series?: { label: string; volumeUsd: number; count: number }[]
  /** Largest counted transfers (top 10) and newest counted transfers (50). */
  top_txs?: TxSummary[]
  recent_txs?: TxSummary[]
  /** Counted transfers above $1M, and a 5%-trimmed mean transfer size. */
  high_value_count?: number
  avg_tx_usd?: number
  /** Served from app_cache rather than computed for this request. */
  cached?: boolean
}

const SELECT = 'id, transaction_hash, timestamp, blockchain, token_symbol, classification, usd_value, whale_address, from_address, to_address, from_label, to_label'

function toTx(r: FlowRow, symbol: string): TxSummary {
  return {
    hash: (r.transaction_hash as string) || null,
    time: (r.timestamp as string) || null,
    symbol,
    side: String(r.classification || '').toLowerCase().startsWith('buy') ? 'BUY' : 'SELL',
    usd: Math.round(Number(r.usd_value) || 0),
    chain: (r.blockchain as string) || null,
    whale_address: (r.whale_address as string) || null,
    from_address: (r.from_address as string) || null,
    to_address: (r.to_address as string) || null,
    from_label: (r.from_label as string) || null,
    to_label: (r.to_label as string) || null,
  }
}

function trimmedMean(values: number[]): number {
  if (!values.length) return 0
  const v = values.slice().sort((a, b) => a - b)
  const trim = Math.floor(v.length * 0.05)
  const core = v.slice(Math.min(trim, v.length - 1), Math.max(v.length - trim, 1))
  return core.length ? core.reduce((s, x) => s + x, 0) / core.length : 0
}

/** Build a snapshot from rows already read (pure; used by the cron and tests). */
export function buildSnapshot(rows: FlowRow[], args: { window: FlowWindow; sinceIso: string; untilIso: string; complete: boolean; now?: Date }): TokenFlowsSnapshot {
  const fold = foldTokenFlowsWithStats(rows)
  const tokens = [...fold.tokens.values()].sort((a, b) => Math.abs(b.netUsd) - Math.abs(a.netUsd))
  const totals = tokens.reduce((t, x) => ({
    buyUsd: t.buyUsd + x.buyUsd, sellUsd: t.sellUsd + x.sellUsd, netUsd: t.netUsd + x.netUsd, volumeUsd: t.volumeUsd + x.volumeUsd,
    buyCount: t.buyCount + x.buyCount, sellCount: t.sellCount + x.sellCount, uniqueWhales: 0,
  }), { buyUsd: 0, sellUsd: 0, netUsd: 0, volumeUsd: 0, buyCount: 0, sellCount: 0, uniqueWhales: 0 })
  const counted: { row: FlowRow; symbol: string; usd: number }[] = []
  const whales = new Set<string>()
  const chains = new Set<string>()
  const chainCounts: Record<string, number> = {}
  for (const r of rows) {
    const d = isCountedRow(r)
    const klass = String(r.classification || '').toLowerCase()
    if (!d.ok || !(klass.startsWith('buy') || klass.startsWith('sell'))) continue
    counted.push({ row: r, symbol: d.symbol, usd: d.usd })
    if (r.whale_address) whales.add(String(r.whale_address).toLowerCase())
    if (r.blockchain) {
      const ch = String(r.blockchain).toLowerCase()
      chains.add(ch)
      chainCounts[ch] = (chainCounts[ch] || 0) + 1
    }
  }
  totals.uniqueWhales = whales.size
  const snap: TokenFlowsSnapshot = {
    window: args.window,
    generated_at: (args.now || new Date()).toISOString(),
    since: args.sinceIso,
    until: args.untilIso,
    definition: NET_FLOW_DEFINITION,
    chains_live: [...chains].sort(),
    chain_counts: chainCounts,
    rows_read: fold.rowsRead,
    rows_counted: fold.rowsCounted,
    complete: args.complete,
    excluded: fold.excluded,
    tokens,
    totals,
  }
  const byValue = counted.slice().sort((a, b) => b.usd - a.usd)
  snap.top_txs = byValue.slice(0, 10).map((c) => toTx(c.row, c.symbol))
  snap.recent_txs = counted.slice().sort((a, b) => Date.parse(String(b.row.timestamp)) - Date.parse(String(a.row.timestamp))).slice(0, 50).map((c) => toTx(c.row, c.symbol))
  snap.high_value_count = counted.filter((c) => c.usd > 1_000_000).length
  snap.avg_tx_usd = Math.round(trimmedMean(counted.map((c) => c.usd)))
  if (args.window === '24h') {
    const end = Date.parse(args.untilIso)
    const hour = 3_600_000
    const buckets = Array.from({ length: 24 }, (_, i) => {
      const start = end - (24 - i) * hour
      return { label: `${String(new Date(start).getUTCHours()).padStart(2, '0')}:00`, volumeUsd: 0, count: 0, start }
    })
    for (const c of counted) {
      const idx = Math.floor((Date.parse(String(c.row.timestamp)) - (end - 24 * hour)) / hour)
      if (idx >= 0 && idx < 24) { buckets[idx].volumeUsd += c.usd; buckets[idx].count += 1 }
    }
    snap.series = buckets.map(({ label, volumeUsd, count }) => ({ label, volumeUsd: Math.round(volumeUsd), count }))
  }
  return snap
}

/** Supabase-like client: from() is required; rpc is optional. */
type Client = { from: (table: string) => any }

/** The fresh app_cache snapshot for a window, or null when missing or stale. */
export async function readCachedFlows(supabase: Client, window: FlowWindow, maxAgeMs = CACHE_MAX_AGE_MS[window]): Promise<TokenFlowsSnapshot | null> {
  try {
    const q: any = supabase.from('app_cache').select('value, updated_at').eq('key', TOKEN_FLOWS_CACHE_KEYS[window])
    const res = typeof q.maybeSingle === 'function' ? await q.maybeSingle() : await q.limit(1)
    const row = Array.isArray(res?.data) ? res.data[0] : res?.data
    const snap = row?.value as TokenFlowsSnapshot | undefined
    if (!snap?.generated_at) return null
    if (Date.now() - Date.parse(snap.generated_at) > maxAgeMs) return null
    return { ...snap, cached: true }
  } catch {
    return null
  }
}

/**
 * Token flows for a window. Serves the app_cache row when it is fresh (so the
 * dashboard and ORCA read the same numbers), else reads the tape in pages
 * (≤ 40,000 rows, biggest first) and folds it. `fresh: true` skips the cache
 * (the precompute cron). Filters the client cannot express are applied in JS.
 */
export async function computeTokenFlows(
  supabase: Client,
  opts: { window?: FlowWindow; sinceIso?: string; untilIso?: string; chains?: string[]; fresh?: boolean; maxRows?: number; now?: Date } = {}
): Promise<TokenFlowsSnapshot> {
  const window: FlowWindow = opts.window || '24h'
  if (!opts.fresh && !opts.sinceIso && !opts.chains) {
    const cached = await readCachedFlows(supabase, window)
    if (cached) return cached
  }
  const now = opts.now || new Date()
  const untilIso = opts.untilIso || now.toISOString()
  const sinceIso = opts.sinceIso || new Date(Date.parse(untilIso) - WINDOW_MS[window]).toISOString()
  const query = () => {
    let q: any = supabase.from('all_whale_transactions').select(SELECT).gte('timestamp', sinceIso)
    if (opts.untilIso && typeof q.lte === 'function') q = q.lte('timestamp', untilIso)
    if (typeof q.in === 'function') q = q.in('classification', ['BUY', 'SELL', 'buy', 'sell'])
    if (opts.chains?.length && typeof q.in === 'function') q = q.in('blockchain', opts.chains)
    return q.order('usd_value', { ascending: false }).order('id', { ascending: true })
  }
  const { data, error, complete } = await readAllRows(query, { maxRows: opts.maxRows ?? 40_000 })
  if (error) throw new Error(`token flows read failed: ${error.message || error}`)
  let rows = (data || []) as FlowRow[]
  const untilMs = Date.parse(untilIso)
  rows = rows.filter((r) => !r.timestamp || Date.parse(String(r.timestamp)) <= untilMs)
  if (opts.chains?.length) {
    const allowed = new Set(opts.chains.map((c) => c.toLowerCase()))
    rows = rows.filter((r) => allowed.has(String(r.blockchain || '').toLowerCase()))
  }
  return buildSnapshot(rows, { window, sinceIso, untilIso, complete, now })
}
