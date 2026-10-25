/**
 * GET /api/personal/feed — everything the Personal page needs in ONE call
 * (2026-10-25, Prompt 2). Replaces the page's six mount fetches and the 6 s
 * PulseStrip poll; the client polls this every 60 s.
 *
 * One read per source table, in parallel; each section is wrapped in a 4 s
 * race and reports `status: 'error'` on its own while the rest ships. Whale
 * net flow comes from the shared definition (lib/whale/netFlow.ts — the
 * 5-minute token_flows_24h snapshot), looked up by canonical symbol, so the
 * numbers match the dashboard and ORCA.
 */
import { NextResponse } from 'next/server'
import { getUserFromRequest } from '@/app/lib/walletAuth'
import { supabaseAdminFresh as sb } from '@/app/lib/supabaseAdmin'
import { getUserTickers } from '@/lib/personal/watchlist'
import { computeTokenFlows, flowTone, chainsLiveLabel, STABLECOINS, type TokenFlowsSnapshot } from '@/lib/whale/netFlow'
import { canonicalSymbol } from '@/lib/wallet/symbol-aliases'
import { addressVariants, canonicalAddress } from '@/lib/wallet/addressVariants'
import { loadNativePrices, transferUsd } from '@/lib/wallet/transferValue'
import { readAllRows } from '@/lib/orca/orchestrator/tools/pagedRead'
import { FAMOUS_WALLETS } from '@/lib/onboarding/famousWallets'
import { getMacroFactors } from '@/lib/social/macroFactors'
import { whyItMatters } from '@/lib/personal/whyItMatters'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SECTION_MS = 4000
const MARKET = ['BTC', 'ETH', 'SOL', 'XRP', 'DOGE', 'LINK']
const H = 3_600_000
const MOVE_MIN_USD = 1_000
const FAMOUS_BY_NAME = new Map(FAMOUS_WALLETS.map((w) => [w.name, w]))

type Section<T> = { status: 'ok'; data: T } | { status: 'error'; error: string }

async function section<T>(fn: () => Promise<T>): Promise<Section<T>> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const data = await Promise.race([
      fn(),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('timeout')), SECTION_MS) }),
    ])
    return { status: 'ok', data }
  } catch (e: any) {
    return { status: 'error', error: String(e?.message || e).slice(0, 120) }
  } finally {
    if (timer) clearTimeout(timer)
  }
}

function fmtUsd(n: number): string {
  const v = Math.abs(Number(n) || 0)
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`
  if (v >= 1e3) return `$${Math.round(v / 1e3)}K`
  return `$${Math.round(v)}`
}

function shortAddr(a: string): string {
  return a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a
}

/** Hourly sparkline (oldest → newest) from price rows, newest first in input. */
function spark(rows: Array<{ timestamp: string; price_usd: number }>): number[] {
  const byHour = new Map<number, number>()
  for (const r of rows) {
    const h = Math.floor(Date.parse(r.timestamp) / H)
    if (!byHour.has(h)) byHour.set(h, Number(r.price_usd))
  }
  return [...byHour.entries()].sort((a, b) => a[0] - b[0]).map(([, p]) => p).slice(-25)
}

export async function GET(request: Request) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  const now = Date.now()
  const dayAgo = new Date(now - 24 * H).toISOString()

  // Shared inputs, started once.
  const flowsP: Promise<TokenFlowsSnapshot | null> = computeTokenFlows(sb as any, { window: '24h' }).catch(() => null)
  const tickersP = getUserTickers(user.id, sb as any).catch(() => [] as Array<{ ticker: string; source: 'holding' | 'watchlist' }>)

  // Prices for the user's coins and the market rail in ONE paged read.
  const pricesP = tickersP.then(async (tickers) => {
    const syms = [...new Set([...tickers.map((t) => t.ticker), ...MARKET])]
    const { data } = await readAllRows(
      () => sb.from('price_snapshots')
        .select('id, ticker, price_usd, price_change_24h, volume_24h, timestamp')
        .in('ticker', syms)
        .gte('timestamp', new Date(now - 25 * H).toISOString())
        .order('timestamp', { ascending: false })
        .order('id', { ascending: true }),
      { maxRows: 6000 }
    )
    const byTicker = new Map<string, Array<{ timestamp: string; price_usd: number; price_change_24h: number | null; volume_24h: number | null }>>()
    for (const r of (data || []) as any[]) {
      const list = byTicker.get(r.ticker) || []
      list.push(r)
      byTicker.set(r.ticker, list)
    }
    return byTicker
  })

  const [tickers, follows, alerts, market, macro, tape] = await Promise.all([
    // ── Your coins ───────────────────────────────────────────────────────────
    section(async () => {
      const [list, prices, flows] = await Promise.all([tickersP, pricesP, flowsP])
      return list.map(({ ticker, source }) => {
        const rows = prices.get(ticker) || []
        const newest = rows[0]
        const t = flows?.tokens.find((x) => x.symbol === canonicalSymbol(ticker))
        return {
          ticker,
          source,
          valid: !!newest, // no price in 25 h = a symbol we do not track (junk rows render muted)
          price: newest ? Number(newest.price_usd) : null,
          change_24h: newest && typeof newest.price_change_24h === 'number' ? newest.price_change_24h : null,
          spark: spark(rows),
          whale: t ? { net: t.netUsd, volume: t.volumeUsd, buys: t.buyCount, sells: t.sellCount, tone: flowTone(t.netUsd, t.volumeUsd) } : null,
        }
      })
    }),

    // ── Wallets you follow, their moves (24 h) and when we last checked ────
    section(async () => {
      const { data: rows } = await sb.from('wallet_follows').select('address, nickname, followed_at').eq('user_id', user.id).limit(200)
      const byCanon = new Map<string, { address: string; nickname: string | null }>()
      for (const f of (rows || []) as any[]) {
        const k = canonicalAddress(f.address)
        const prev = byCanon.get(k)
        if (!prev || (!prev.nickname && f.nickname)) byCanon.set(k, { address: f.address, nickname: f.nickname || null })
      }
      const wallets = [...byCanon.entries()]
      if (wallets.length === 0) return { wallets: [], moves: [] }
      const canonKeys = wallets.map(([k]) => k)
      const variants = [...new Set(wallets.flatMap(([, w]) => addressVariants(w.address)))]
      const [tapeRes, xferRes, pollRes, namesRes, nativePrices] = await Promise.all([
        sb.from('all_whale_transactions')
          .select('transaction_hash, whale_address, token_symbol, classification, usd_value, blockchain, timestamp, from_label, to_label')
          .in('whale_address', canonKeys)
          .gte('timestamp', dayAgo)
          .order('timestamp', { ascending: false })
          .limit(120),
        sb.from('tracked_address_transfers')
          .select('tx_hash, address, chain, contract, direction, amount, amount_usd, token_symbol, timestamp')
          .in('address', variants.slice(0, 150))
          .gte('timestamp', dayAgo)
          .order('timestamp', { ascending: false })
          .limit(200),
        sb.from('tracked_address_poll_state').select('address, last_polled').in('address', variants.slice(0, 300)),
        sb.from('addresses').select('address, entity_name').in('address', [...new Set([...canonKeys, ...wallets.map(([, w]) => w.address)])]).not('entity_name', 'is', null).limit(300),
        loadNativePrices(sb as any).catch(() => null),
      ])
      const nameOf = new Map<string, string>()
      for (const r of (namesRes.data || []) as any[]) if (r.entity_name) nameOf.set(canonicalAddress(r.address), r.entity_name)
      const lastChecked = new Map<string, number>()
      for (const r of (pollRes.data || []) as any[]) {
        const k = canonicalAddress(r.address)
        const t = r.last_polled ? Date.parse(r.last_polled) : NaN
        if (Number.isFinite(t) && t > (lastChecked.get(k) || 0)) lastChecked.set(k, t)
      }
      const meta = new Map<string, { name: string; avatar: string | null; floor: number }>()
      for (const [k, w] of wallets) {
        const famous = w.nickname ? FAMOUS_BY_NAME.get(w.nickname) : undefined
        meta.set(k, {
          name: w.nickname || nameOf.get(k) || shortAddr(w.address),
          avatar: famous?.avatar || null,
          floor: famous?.minUsd || MOVE_MIN_USD,
        })
      }
      const moves: any[] = []
      const seen = new Set<string>()
      for (const r of (tapeRes.data || []) as any[]) {
        const k = canonicalAddress(r.whale_address)
        const m = meta.get(k)
        const usd = Number(r.usd_value) || 0
        if (!m || usd < m.floor) continue
        const h = String(r.transaction_hash || '').toLowerCase()
        if (seen.has(h)) continue
        seen.add(h)
        const direction = String(r.classification || '').toUpperCase() === 'BUY' ? 'in' : 'out'
        moves.push({
          id: h || `${k}:${r.timestamp}`, at: r.timestamp, address: k, wallet: m.name, avatar: m.avatar,
          token: canonicalSymbol(r.token_symbol) || r.token_symbol, usd, direction, chain: r.blockchain || 'ethereum', tx: r.transaction_hash,
          why: whyItMatters({ direction, usd, from_label: r.from_label, to_label: r.to_label, isFollowedWallet: true }),
        })
      }
      for (const r of (xferRes.data || []) as any[]) {
        const k = canonicalAddress(r.address)
        const m = meta.get(k)
        if (!m) continue
        const usd = transferUsd(r, nativePrices as any)
        if (usd === null || usd < m.floor) continue
        const h = String(r.tx_hash || '').toLowerCase()
        if (seen.has(h)) continue
        seen.add(h)
        const direction = r.direction === 'in' ? 'in' : 'out'
        moves.push({
          id: h || `${k}:${r.timestamp}`, at: r.timestamp, address: k, wallet: m.name, avatar: m.avatar,
          token: canonicalSymbol(r.token_symbol) || r.token_symbol, usd, direction, chain: r.chain, tx: r.tx_hash,
          why: whyItMatters({ direction, usd, isFollowedWallet: true }),
        })
      }
      moves.sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
      const lastMove = new Map<string, any>()
      for (const mv of moves) if (!lastMove.has(mv.address)) lastMove.set(mv.address, mv)
      return {
        wallets: wallets.map(([k, w]) => ({
          address: w.address,
          key: k,
          ...meta.get(k)!,
          last_checked_at: lastChecked.has(k) ? new Date(lastChecked.get(k)!).toISOString() : null,
          last_move: lastMove.get(k) || null,
          moves_24h: moves.filter((m) => m.address === k).length,
        })),
        moves: moves.slice(0, 60),
      }
    }),

    // ── Alert rules and recent fires ─────────────────────────────────────────
    section(async () => {
      const [rulesRes, notesRes] = await Promise.all([
        sb.from('user_alerts').select('id, kind, ticker, address, threshold_usd, threshold_pct, enabled, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(60),
        sb.from('user_notifications').select('id, rule_id, kind, ticker, title, body, created_at, read_at, payload').eq('user_id', user.id).order('created_at', { ascending: false }).limit(15),
      ])
      const notifications = ((notesRes.data || []) as any[])
        .filter((n) => !n?.payload?.test)
        .slice(0, 10)
        .map((n) => ({ id: n.id, rule_id: n.rule_id, kind: n.kind, ticker: n.ticker, title: n.title, body: n.body, created_at: n.created_at, read: !!n.read_at }))
      return { rules: rulesRes.data || [], notifications }
    }),

    // ── Market today (prices + the honest whale line per coin) ─────────────
    section(async () => {
      const [prices, flows] = await Promise.all([pricesP, flowsP])
      const live = new Set((flows?.chains_live || []).map((c) => c.toLowerCase()))
      let solanaLast: string | null = null
      if (!live.has('solana')) {
        const { data } = await sb.from('solana_transactions').select('timestamp').order('timestamp', { ascending: false }).limit(1)
        solanaLast = (data as any[])?.[0]?.timestamp || null
      }
      return MARKET.map((sym) => {
        const rows = prices.get(sym) || []
        const newest = rows[0]
        const t = flows?.tokens.find((x) => x.symbol === sym)
        let whale: { text: string; tone: string } | null = null
        if (sym === 'SOL' && !live.has('solana')) {
          whale = { text: solanaLast ? `No Solana whale data since ${new Date(solanaLast).toUTCString().slice(5, 11)}` : 'No Solana whale data right now', tone: 'flat' }
        } else if (t) {
          const tone = flowTone(t.netUsd, t.volumeUsd)
          const via = sym === 'BTC' ? 'BTC on Ethereum (WBTC): ' : sym === 'ETH' ? 'ETH on Ethereum (WETH family): ' : ''
          whale = { text: `${via}whales received ${fmtUsd(t.buyUsd)}, sent ${fmtUsd(t.sellUsd)}`, tone }
        } else {
          whale = { text: `Whale flow for ${sym} is not tracked yet`, tone: 'flat' }
        }
        return {
          ticker: sym,
          price: newest ? Number(newest.price_usd) : null,
          change_24h: newest && typeof newest.price_change_24h === 'number' ? newest.price_change_24h : null,
          spark: spark(rows),
          whale,
        }
      })
    }),

    // ── Macro pin ─────────────────────────────────────────────────────────────
    section(async () => {
      const m = await getMacroFactors()
      const top = m.factors?.[0] || null
      return { badge: m.overall_sentiment, counts: m.counts || null, total: m.factors?.length || 0, top, generated_at: m.generated_at || null }
    }),

    // ── Tape freshness + suggestions ─────────────────────────────────────────
    section(async () => {
      const [{ data }, flows, prices] = await Promise.all([
        sb.from('all_whale_transactions').select('timestamp').gte('timestamp', dayAgo).order('timestamp', { ascending: false }).limit(1),
        flowsP,
        pricesP.catch(() => new Map()),
      ])
      const suggestions = (flows?.tokens || [])
        .filter((t) => !STABLECOINS.has(t.symbol))
        .sort((a, b) => (b.buyCount + b.sellCount) - (a.buyCount + a.sellCount))
        .slice(0, 6)
        .map((t) => ({ symbol: t.symbol, trades: t.buyCount + t.sellCount, via: t.symbol === 'BTC' ? 'WBTC' : t.symbol === 'ETH' ? 'WETH' : null }))
      return {
        newest_at: (data as any[])?.[0]?.timestamp || null,
        chains_live: flows?.chains_live || [],
        chains_label: chainsLiveLabel(flows?.chains_live || []),
        flows_generated_at: flows?.generated_at || null,
        suggestions,
        priced: prices instanceof Map ? prices.size : 0,
      }
    }),
  ])

  const tickerCount = tickers.status === 'ok' ? tickers.data.filter((t) => t.valid).length : 0
  const followCount = follows.status === 'ok' ? follows.data.wallets.length : 0
  const ruleCount = alerts.status === 'ok' ? (alerts.data.rules as any[]).filter((r) => r.enabled).length : 0

  return NextResponse.json(
    {
      generated_at: new Date().toISOString(),
      empty: tickerCount === 0 && followCount === 0 && ruleCount === 0,
      counts: { tickers: tickerCount, follows: followCount, rules: ruleCount },
      tickers, follows, alerts, market, macro, tape,
    },
    { headers: { 'Cache-Control': 'private, no-store' } }
  )
}
