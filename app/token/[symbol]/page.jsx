import React from 'react'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'
import { SYMBOL_TO_COINGECKO_ID } from '@/lib/wallet-backtest/engine'
import TokenDetailClient from './TokenDetailClient'

// Top holders via Arkham (/token/holders/{coingeckoId}, 30 credits) —
// cached 24h per token and fetched only when the page is viewed.
// Aggregates the per-chain top-100 lists into one entity-ranked top 10.
// NOT premium-gated: ARKM-derived data must stay un-paywalled while
// ARKHAM_COMMERCIAL_USE is false (see lib/arkham/license.ts).
async function fetchTopHolders(symbol) {
  const id = SYMBOL_TO_COINGECKO_ID[symbol]
  if (!id) return []
  try {
    const { arkhamFetch } = await import('@/lib/arkham/client')
    const j = await arkhamFetch(`/token/holders/${encodeURIComponent(id)}`, {
      cacheKey: `token_holders:${id}`,
      ttlSeconds: 86400,
      source: 'on_demand',
      reason: 'token page top holders',
    })
    const byKey = new Map()
    for (const list of Object.values(j?.addressTopHolders || {})) {
      if (!Array.isArray(list)) continue
      for (const h of list) {
        const a = h?.address || {}
        const ent = a.arkhamEntity
        const key = ent?.id || String(a.address || '').toLowerCase()
        if (!key) continue
        let rec = byKey.get(key)
        if (!rec) {
          rec = {
            name: ent?.name || a.arkhamLabel?.name || null,
            entityName: ent?.name || null,
            address: a.address || null,
            usd: 0,
            pct: 0,
          }
          byKey.set(key, rec)
        }
        rec.usd += Number(h.usd) || 0
        rec.pct += Number(h.pctOfCap) || 0
      }
    }
    return [...byKey.values()].sort((x, y) => y.usd - x.usd).slice(0, 10)
  } catch {
    return []
  }
}

export const revalidate = 15

export async function generateMetadata({ params }) {
  const symbol = decodeURIComponent(params.symbol).toUpperCase()
  const title = `${symbol} Whale Activity & Price Analysis | Sonar Tracker`
  const description = `Track ${symbol} whale transactions, buy/sell pressure, social sentiment, Galaxy Score, and real-time price charts. Institutional-grade crypto analytics by Sonar.`
  const url = `https://www.sonartracker.io/token/${encodeURIComponent(symbol)}`

  // Index tokens that are real, priced assets (curated CoinGecko mapping) or
  // have any recent whale data. The old ≥3-txs-in-30d bar noindexed 300+
  // pages ("Excluded by 'noindex'" in Search Console) because
  // all_whale_transactions only covers ethereum+solana, so majors on other
  // chains failed it. Pages for mapped tokens render full price/sentiment
  // content even with zero whale rows, so they are not thin.
  let hasData = Boolean(SYMBOL_TO_COINGECKO_ID[symbol])
  if (!hasData) {
    try {
      const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
      const { count } = await supabaseAdmin
        .from('all_whale_transactions')
        .select('transaction_hash', { count: 'exact', head: true })
        .eq('token_symbol', symbol)
        .gte('timestamp', since)
      hasData = (count || 0) >= 1
    } catch { hasData = true }
  }

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: { 
      title, 
      description, 
      url,
      type: 'website',
      siteName: 'Sonar Tracker',
    },
    twitter: { 
      title, 
      description,
      card: 'summary',
    },
    robots: hasData
      ? { index: true, follow: true }
      : { index: false, follow: true },
  }
}

function BreadcrumbJsonLd({ symbol }) {
  const json = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.sonartracker.io/' },
      { '@type': 'ListItem', position: 2, name: 'Tokens', item: 'https://www.sonartracker.io/tokens' },
      { '@type': 'ListItem', position: 3, name: symbol, item: `https://www.sonartracker.io/token/${encodeURIComponent(symbol)}` },
    ],
  }
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }} />
}

export default async function TokenDetail({ params, searchParams }) {
  const rawSymbol = decodeURIComponent(params.symbol)
  const symbol = rawSymbol.toUpperCase()

  // Redirect to canonical uppercase URL if needed
  if (rawSymbol !== symbol) {
    const query = new URLSearchParams()
    if (searchParams?.sinceHours) query.set('sinceHours', searchParams.sinceHours)
    if (searchParams?.minUsd) query.set('minUsd', searchParams.minUsd)
    const qs = query.toString()
    redirect(`/token/${encodeURIComponent(symbol)}${qs ? `?${qs}` : ''}`)
  }

  const sinceHours = Number(searchParams?.sinceHours || 24)
  const minUsd = searchParams?.minUsd ? Number(searchParams.minUsd) : undefined

  const sinceIso = new Date(Date.now() - (sinceHours > 0 ? sinceHours : 24) * 60 * 60 * 1000).toISOString()
  let q = supabaseAdmin
    .from('all_whale_transactions')
    .select('transaction_hash,timestamp,blockchain,token_symbol,classification,usd_value,from_address,to_address,whale_score,confidence,whale_address,counterparty_address,counterparty_type,from_label,to_label,reasoning')
    .eq('token_symbol', symbol)
    .gte('timestamp', sinceIso)
    .order('timestamp', { ascending: false })
  if (typeof minUsd === 'number' && !Number.isNaN(minUsd)) q = q.gte('usd_value', minUsd)
  const { data, error } = await q.limit(200)

  let totalVolume = 0, netFlow = 0, buys = 0, sells = 0
  const whales = new Set()
  const chainMap = new Map()
  for (const r of data || []) {
    const usd = Number(r.usd_value || 0)
    totalVolume += usd
    const s = (r.classification || '').toLowerCase()
    if (s === 'buy') { buys += 1; netFlow += usd } else if (s === 'sell') { sells += 1; netFlow -= usd }
    whales.add(r.whale_address || r.from_address || '')
    chainMap.set(r.blockchain || '—', (chainMap.get(r.blockchain || '—') || 0) + 1)
  }
  const uniqueWhales = whales.size
  const chains = Array.from(chainMap.entries()).sort((a,b)=>b[1]-a[1])

  // Sanity check: if avg tx exceeds threshold, the data is unreliable (e.g. BTC UTXO consolidations)
  // BTC has genuinely large transactions, so use a higher threshold
  const txCount = buys + sells
  const avgTx = txCount > 0 ? totalVolume / txCount : 0
  const reliabilityThreshold = symbol === 'BTC' ? 2_000_000_000 : 500_000_000
  const dataReliable = avgTx < reliabilityThreshold

  function computeMedian(values) {
    if (!values || values.length === 0) return 0
    const arr = values.slice().sort((a,b)=>a-b)
    const mid = Math.floor(arr.length/2)
    return arr.length % 2 ? arr[mid] : (arr[mid-1]+arr[mid])/2
  }

  function computeSentiment(rows) {
    if (!rows || rows.length === 0) return { label: 'NEUTRAL', color: '#f39c12', score: 0, details: {} }
    const nowMs = Date.now()
    const sixH = 6 * 60 * 60 * 1000
    const last6Start = nowMs - sixH
    const prev6Start = nowMs - 2 * sixH

    let buys = 0, sells = 0, buyVol = 0, sellVol = 0, net = 0
    const txSizes = []
    let last6Net = 0, prev6Net = 0
    for (const r of rows) {
      const usd = Number(r.usd_value || 0)
      const side = String(r.classification || '').toLowerCase()
      const ts = new Date(r.timestamp).getTime()
      txSizes.push(Math.abs(usd))
      if (side === 'buy') { buys += 1; buyVol += usd; net += usd }
      else if (side === 'sell') { sells += 1; sellVol += usd; net -= usd }
      if (ts >= last6Start) {
        last6Net += (side === 'sell' ? -usd : usd)
      } else if (ts >= prev6Start && ts < last6Start) {
        prev6Net += (side === 'sell' ? -usd : usd)
      }
    }
    const total = buys + sells
    const buyPct = total > 0 ? (buys / total) * 100 : 50
    const median = computeMedian(txSizes) || 1
    const scaleNet = Math.max(1, median * 20)
    const scaleMom = Math.max(1, median * 10)

    // Components normalized to [-1, 1]
    const compBias = (buyPct - 50) / 50 // [-1,1]
    const compNet = Math.tanh(net / scaleNet) // robust cap
    const compMom = Math.tanh((last6Net - prev6Net) / scaleMom)

    // Weights
    const wBias = 0.4, wNet = 0.4, wMom = 0.2
    const score = (wBias * compBias) + (wNet * compNet) + (wMom * compMom)
    let label = 'NEUTRAL', color = '#f39c12'
    if (score > 0.15) { label = 'BULLISH'; color = '#2ecc71' }
    else if (score < -0.15) { label = 'BEARISH'; color = '#e74c3c' }
    return {
      label, color, score: Number(score.toFixed(2)),
      details: {
        buyPct: Number(buyPct.toFixed(1)), net: Math.round(net), last6Net: Math.round(last6Net), prev6Net: Math.round(prev6Net)
      }
    }
  }

  const sentiment = computeSentiment(data || [])
  const topHolders = await fetchTopHolders(symbol)

  const whaleMetrics = dataReliable ? {
    totalVolume,
    netFlow,
    buys,
    sells,
    uniqueWhales
  } : {
    totalVolume: 0,
    netFlow: 0,
    buys: 0,
    sells: 0,
    uniqueWhales: 0
  }

  return (
    <>
      <BreadcrumbJsonLd symbol={symbol} />
      <TokenDetailClient
        symbol={symbol}
        sinceHours={sinceHours}
        data={dataReliable ? (data || []) : []}
        whaleMetrics={whaleMetrics}
        sentiment={dataReliable ? sentiment : { label: 'NEUTRAL', color: '#f39c12', score: 0, details: { buyPct: 50, sellPct: 50 } }}
        topHolders={topHolders}
      />
    </>
  )
} 