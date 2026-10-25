import { NextResponse } from 'next/server'
import { supabaseAdminFresh as supabaseAdmin } from '@/app/lib/supabaseAdmin'
import { rateLimit, getClientIp, rateLimitResponse } from '@/app/lib/rateLimit'
import { computeTokenFlows, flowTone, chainsLiveLabel, NET_FLOW_DEFINITION } from '@/lib/whale/netFlow'
import { canonicalSymbol } from '@/lib/wallet/symbol-aliases'

export const dynamic = 'force-dynamic'

// Every number here comes from ONE snapshot of the whale tape built by
// lib/whale/netFlow.ts (app_cache token_flows_24h, refreshed every 5 minutes
// by /api/cron/precompute-token-flows; a bounded live read when the row is
// missing or older than 10 minutes). Same definition as ORCA: no flash-loan
// legs, no exchange-internal moves, no stablecoins, nothing above $150M,
// wrapped BTC/ETH counted as BTC/ETH. Before 2026-10-25 this route read a
// 1,000-row slice per chain and counted Morpho Blue flash loans as whale
// buying ($437M of a $445.5M "Net Inflow" on 2026-10-23).

const EDGE_CACHE = { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' }

function tokenRow(t) {
  return {
    token: t.symbol,
    netUsd: t.netUsd,
    netUsdRobust: t.robustNetUsd,
    buys: t.buyCount,
    sells: t.sellCount,
    uniqueWhales: t.uniqueWhales,
    volume: t.volumeUsd,
    txCount: t.buyCount + t.sellCount,
    tone: flowTone(t.netUsd, t.volumeUsd),
  }
}

async function entityNames(addresses) {
  const list = [...new Set(addresses.filter(Boolean).map((a) => String(a).toLowerCase()))]
  if (!list.length) return {}
  const map = {}
  try {
    const { data } = await supabaseAdmin
      .from('addresses')
      .select('address, entity_name, label, analysis_tags')
      .in('address', list)
    for (const row of data || []) {
      map[String(row.address).toLowerCase()] = {
        name: row.entity_name || row.label || null,
        famous: Boolean(row.analysis_tags?.is_famous),
      }
    }
  } catch { /* names are decoration */ }
  return map
}

export async function GET(req) {
  const ip = getClientIp(req)
  const rl = rateLimit(`dashboard-summary:${ip}`, 30, 60000)
  if (!rl.allowed) return rateLimitResponse(rl.retryAfter)
  try {
    if (!process.env.SUPABASE_URL || !(process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY)) {
      return NextResponse.json({ error: 'Supabase env vars not set' }, { status: 503 })
    }

    const snap = await computeTokenFlows(supabaseAdmin, { window: '24h' })
    const tokens = snap.tokens || []
    const recentTxs = (snap.recent_txs || []).slice(0, 10)
    const topTxs = snap.top_txs || []
    const names = await entityNames([...recentTxs, ...topTxs].flatMap((t) => [t.whale_address, t.from_address, t.to_address]))
    const nameOf = (a) => (a ? names[String(a).toLowerCase()]?.name || null : null)

    const recent = recentTxs.map((t) => ({
      transaction_hash: t.hash,
      time: t.time,
      coin: t.symbol,
      action: t.side,
      blockchain: t.chain,
      usd_value: t.usd,
      from_address: t.from_address,
      to_address: t.to_address,
      whale_score: 0,
      whale_address: t.whale_address,
      from_entity: nameOf(t.from_address) || t.from_label || null,
      to_entity: nameOf(t.to_address) || t.to_label || null,
      whale_entity: nameOf(t.whale_address),
      whale_is_famous: Boolean(t.whale_address && names[String(t.whale_address).toLowerCase()]?.famous),
    }))

    const topHighValueTxs = topTxs.map((t) => ({
      time: t.time,
      coin: t.symbol,
      side: t.side,
      usd: t.usd,
      chain: t.chain || '—',
      hash: t.hash,
      whale_score: 0,
      whale_entity: nameOf(t.whale_address),
      from_entity: nameOf(t.from_address) || t.from_label || null,
      to_entity: nameOf(t.to_address) || t.to_label || null,
    }))

    // Buy/Sell Pressure: share of trade COUNT per token (≥ 3 trades).
    const pressure = tokens
      .filter((t) => t.buyCount + t.sellCount >= 3)
      .map((t) => ({ coin: t.symbol, buyPct: +(100 * t.buyCount / (t.buyCount + t.sellCount)).toFixed(1), sellPct: +(100 * t.sellCount / (t.buyCount + t.sellCount)).toFixed(1), count: t.buyCount + t.sellCount }))
    const topBuys = pressure.slice().sort((a, b) => b.buyPct - a.buyPct || b.count - a.count).slice(0, 10).map((x) => ({ coin: x.coin, percentage: x.buyPct, count: x.count }))
    const topSells = pressure.slice().sort((a, b) => b.sellPct - a.sellPct || b.count - a.count).slice(0, 10).map((x) => ({ coin: x.coin, percentage: x.sellPct, count: x.count }))

    const totals = snap.totals || { buyUsd: 0, sellUsd: 0, volumeUsd: 0, buyCount: 0, sellCount: 0 }
    const denom = totals.buyCount + totals.sellCount
    const buyRatio = denom > 0 ? (100 * totals.buyCount) / denom : 50
    const trend = buyRatio > 60 ? 'bullish' : buyRatio < 40 ? 'bearish' : 'neutral'

    const series = snap.series || []
    const last = series[series.length - 1]?.volumeUsd || 0
    const prev = series[series.length - 2]?.volumeUsd || 0
    let volumeChange = prev > 0 ? ((last - prev) / prev) * 100 : 0
    volumeChange = Math.max(-500, Math.min(500, volumeChange))

    const rows = tokens.map(tokenRow)
    const MIN_FLOW_USD = 1000
    const tokenInflows = rows.filter((t) => t.netUsd > 0 && Math.abs(t.netUsd) >= MIN_FLOW_USD).sort((a, b) => b.netUsd - a.netUsd).slice(0, 5)
    const tokenOutflows = rows.filter((t) => t.netUsd < 0 && Math.abs(t.netUsd) >= MIN_FLOW_USD).sort((a, b) => a.netUsd - b.netUsd).slice(0, 5)
    const tokenLeaders = rows.slice().sort((a, b) => b.netUsdRobust - a.netUsdRobust).slice(0, 10)
    // Most Traded: ranked by 24h whale VOLUME (subtitle says so); count kept.
    const tokenTradeCounts = rows.slice().sort((a, b) => b.volume - a.volume).slice(0, 12)
      .map((t) => ({ token: t.token, count: t.txCount, buys: t.buys, sells: t.sells, volume: t.volume, netUsd: t.netUsd, tone: t.tone }))
    const whaleActivity = rows.slice().sort((a, b) => b.uniqueWhales - a.uniqueWhales).slice(0, 12)
      .map((t) => ({ token: t.token, uniqueWhales: t.uniqueWhales, netUsd: t.netUsd, buySellRatio: t.sells === 0 ? t.buys : +(t.buys / t.sells).toFixed(2) }))

    const byChain = snap.chain_counts || {}

    const overall = {
      totalCount: snap.rows_counted,
      totalVolume: totals.volumeUsd,
      buyCount: totals.buyCount,
      sellCount: totals.sellCount,
      buyVolume: totals.buyUsd,
      sellVolume: totals.sellUsd,
      netUsd: totals.buyUsd - totals.sellUsd,
      uniqueWhales: totals.uniqueWhales || 0,
    }

    // ?tokens= (the dashboard's "mine" mode): filtered from the same cached
    // per-token map — never a second live read.
    let personalized = null
    const tokensParam = new URL(req.url).searchParams.get('tokens')
    if (tokensParam) {
      const want = [...new Set(tokensParam.split(',').map((s) => canonicalSymbol(String(s).trim())).filter(Boolean))].slice(0, 50)
      const set = new Set(want)
      const mine = tokens.filter((t) => set.has(t.symbol))
      personalized = {
        tokens: want,
        whaleFlow24h: want.map((sym) => {
          const t = mine.find((x) => x.symbol === sym)
          return t
            ? { symbol: sym, net_usd: t.netUsd, buy_count: t.buyCount, sell_count: t.sellCount, unique_whales: t.uniqueWhales, tone: flowTone(t.netUsd, t.volumeUsd) }
            : { symbol: sym, net_usd: 0, buy_count: 0, sell_count: 0, unique_whales: 0, tone: 'flat' }
        }).sort((a, b) => Math.abs(b.net_usd) - Math.abs(a.net_usd)),
        totals: mine.reduce((s, t) => ({ netUsd: s.netUsd + t.netUsd, volumeUsd: s.volumeUsd + t.volumeUsd, trades: s.trades + t.buyCount + t.sellCount }), { netUsd: 0, volumeUsd: 0, trades: 0 }),
        topTxs: topHighValueTxs.filter((t) => set.has(t.coin)).slice(0, 5),
        recent: recent.filter((t) => set.has(t.coin)),
      }
    }

    return NextResponse.json({
      recent,
      topBuys,
      topSells,
      blockchainVolume: { labels: Object.keys(byChain), data: Object.values(byChain) },
      marketSentiment: { ratio: buyRatio, trend },
      riskMetrics: { highValueCount: snap.high_value_count || 0, avgTransactionSize: snap.avg_tx_usd || 0 },
      marketMomentum: { volumeChange, activityChange: snap.rows_counted },
      whaleActivity,
      timeSeries: { labels: series.map((b) => b.label), volume: series.map((b) => b.volumeUsd), count: series.map((b) => b.count) },
      tokenLeaders,
      tokenInflows,
      tokenOutflows,
      overall,
      topHighValueTxs,
      tokenTradeCounts,
      noData24h: snap.rows_counted === 0,
      ...(personalized ? { personalized } : {}),
      // Provenance for every panel's one-line explanation and popover.
      generated_at: snap.generated_at,
      definition: NET_FLOW_DEFINITION,
      chains_live: snap.chains_live,
      chains_label: chainsLiveLabel(snap.chains_live),
      rows_counted: snap.rows_counted,
      rows_read: snap.rows_read,
      excluded: snap.excluded,
      complete: snap.complete,
      cached: Boolean(snap.cached),
    }, { headers: EDGE_CACHE })
  } catch (error) {
    console.error('Unexpected error in dashboard summary:', error)
    return NextResponse.json({
      recent: [],
      topBuys: [],
      topSells: [],
      blockchainVolume: { labels: [], data: [] },
      marketSentiment: { ratio: 50, trend: 'neutral' },
      riskMetrics: { highValueCount: 0, avgTransactionSize: 0 },
      marketMomentum: { volumeChange: 0, activityChange: 0 },
      whaleActivity: [],
      noData24h: true,
      error: 'summary unavailable',
    }, { status: 200, headers: { 'Cache-Control': 'no-store' } })
  }
}
